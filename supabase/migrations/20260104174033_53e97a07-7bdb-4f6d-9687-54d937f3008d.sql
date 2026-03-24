
-- 1. THE KOBO MANDATE: Create custom domain to ensure no decimals
-- All currency stored as BIGINT (Integers) to prevent rounding errors.
CREATE DOMAIN kobo_currency AS BIGINT CHECK (VALUE >= 0);

-- 2. THE DOUBLE-ENTRY LEDGER TABLE
-- Every transaction MUST have a balanced debit and credit row.
CREATE TABLE public.ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL,
    account_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    amount kobo_currency NOT NULL,
    entry_type TEXT NOT NULL CHECK (entry_type IN ('debit', 'credit')),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. THE WALLET (WRITE-PROTECTED)
-- Users can READ their balance, but NEVER update it directly.
CREATE TABLE public.wallets (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    balance kobo_currency DEFAULT 0,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- 4. THE IDEMPOTENCY GUARD
-- Prevents double-processing of the same transaction
CREATE TABLE public.processed_requests (
    idempotency_key TEXT PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'pending',
    result JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. INDEXING for high-speed lookups at scale
CREATE INDEX idx_ledger_transaction_id ON public.ledger_entries(transaction_id);
CREATE INDEX idx_ledger_account_id ON public.ledger_entries(account_id);
CREATE INDEX idx_wallets_user_id ON public.wallets(user_id);

-- 6. ENABLE RLS
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processed_requests ENABLE ROW LEVEL SECURITY;

-- 7. RLS POLICIES FOR WALLETS
-- Users can only see their own wallet
CREATE POLICY "Users can only see their own wallet" 
ON public.wallets FOR SELECT 
USING (auth.uid() = user_id);

-- Explicitly block ALL direct updates to wallets (only functions can modify)
CREATE POLICY "No direct wallet updates" 
ON public.wallets FOR UPDATE 
USING (false);

-- Block direct inserts (wallets created via trigger)
CREATE POLICY "No direct wallet inserts" 
ON public.wallets FOR INSERT 
WITH CHECK (false);

-- Admins can view all wallets
CREATE POLICY "Admins can view all wallets"
ON public.wallets FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- 8. RLS POLICIES FOR LEDGER ENTRIES
-- Users can view their own ledger entries
CREATE POLICY "Users can view own ledger entries"
ON public.ledger_entries FOR SELECT
USING (auth.uid() = account_id);

-- Admins can view all ledger entries
CREATE POLICY "Admins can view all ledger entries"
ON public.ledger_entries FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Block direct inserts/updates to ledger (only via functions)
CREATE POLICY "No direct ledger inserts"
ON public.ledger_entries FOR INSERT
WITH CHECK (false);

CREATE POLICY "No direct ledger updates"
ON public.ledger_entries FOR UPDATE
USING (false);

-- 9. RLS POLICIES FOR PROCESSED REQUESTS
-- Only admins can view processed requests
CREATE POLICY "Admins can view processed requests"
ON public.processed_requests FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- 10. AUTO-CREATE WALLET ON PROFILE CREATION
CREATE OR REPLACE FUNCTION public.create_wallet_for_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.wallets (user_id, balance, last_updated)
    VALUES (NEW.user_id, 0, NOW())
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created_create_wallet
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.create_wallet_for_user();

-- 11. THE ATOMIC SPLITTER FUNCTION (40/60 Split + 15% Platform Fee)
-- This logic lives in the Database, NOT the app, to ensure it never fails mid-way.
CREATE OR REPLACE FUNCTION public.process_order_payment(
    p_idempotency_key TEXT,
    p_order_id UUID,
    p_buyer_id UUID,
    p_chef_id UUID,
    p_total_amount_kobo BIGINT,
    p_description TEXT DEFAULT 'Order payment'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_transaction_id UUID;
    v_platform_fee_kobo BIGINT;
    v_chef_advance_kobo BIGINT;
    v_escrow_hold_kobo BIGINT;
    v_buyer_balance BIGINT;
    v_result JSONB;
BEGIN
    -- Check idempotency
    IF EXISTS (SELECT 1 FROM processed_requests WHERE idempotency_key = p_idempotency_key) THEN
        SELECT result INTO v_result FROM processed_requests WHERE idempotency_key = p_idempotency_key;
        RETURN v_result;
    END IF;
    
    -- Insert idempotency record
    INSERT INTO processed_requests (idempotency_key, status)
    VALUES (p_idempotency_key, 'processing');
    
    -- Generate transaction ID
    v_transaction_id := gen_random_uuid();
    
    -- Calculate splits (all in Kobo - integers only)
    v_platform_fee_kobo := (p_total_amount_kobo * 15) / 100;  -- 15% platform fee
    v_chef_advance_kobo := ((p_total_amount_kobo - v_platform_fee_kobo) * 40) / 100;  -- 40% advance to chef
    v_escrow_hold_kobo := p_total_amount_kobo - v_platform_fee_kobo - v_chef_advance_kobo;  -- 60% to escrow
    
    -- Check buyer has sufficient balance
    SELECT balance INTO v_buyer_balance FROM wallets WHERE user_id = p_buyer_id FOR UPDATE;
    
    IF v_buyer_balance IS NULL OR v_buyer_balance < p_total_amount_kobo THEN
        UPDATE processed_requests 
        SET status = 'failed', result = '{"error": "Insufficient balance"}'::jsonb
        WHERE idempotency_key = p_idempotency_key;
        RETURN '{"success": false, "error": "Insufficient balance"}'::jsonb;
    END IF;
    
    -- ATOMIC DOUBLE-ENTRY LEDGER ENTRIES
    
    -- 1. Debit buyer (money leaves buyer wallet)
    INSERT INTO ledger_entries (transaction_id, account_id, amount, entry_type, description)
    VALUES (v_transaction_id, p_buyer_id, p_total_amount_kobo, 'debit', p_description || ' - Payment');
    
    -- 2. Credit chef advance (40% goes to chef immediately)
    INSERT INTO ledger_entries (transaction_id, account_id, amount, entry_type, description)
    VALUES (v_transaction_id, p_chef_id, v_chef_advance_kobo, 'credit', p_description || ' - Chef Advance (40%)');
    
    -- 3. Credit escrow (60% held in escrow - using order_id as account for tracking)
    INSERT INTO ledger_entries (transaction_id, account_id, amount, entry_type, description)
    VALUES (v_transaction_id, NULL, v_escrow_hold_kobo, 'credit', p_description || ' - Escrow Hold (60%) for order ' || p_order_id::text);
    
    -- 4. Credit platform revenue
    INSERT INTO ledger_entries (transaction_id, account_id, amount, entry_type, description)
    VALUES (v_transaction_id, NULL, v_platform_fee_kobo, 'credit', p_description || ' - Platform Fee (15%)');
    
    -- UPDATE WALLET BALANCES
    -- Deduct from buyer
    UPDATE wallets SET balance = balance - p_total_amount_kobo, last_updated = NOW()
    WHERE user_id = p_buyer_id;
    
    -- Add advance to chef
    UPDATE wallets SET balance = balance + v_chef_advance_kobo, last_updated = NOW()
    WHERE user_id = p_chef_id;
    
    -- Build result
    v_result := jsonb_build_object(
        'success', true,
        'transaction_id', v_transaction_id,
        'total_kobo', p_total_amount_kobo,
        'platform_fee_kobo', v_platform_fee_kobo,
        'chef_advance_kobo', v_chef_advance_kobo,
        'escrow_hold_kobo', v_escrow_hold_kobo
    );
    
    -- Mark as completed
    UPDATE processed_requests 
    SET status = 'completed', result = v_result
    WHERE idempotency_key = p_idempotency_key;
    
    RETURN v_result;
END;
$$;

-- 12. ESCROW RELEASE FUNCTION (Called when order is delivered)
CREATE OR REPLACE FUNCTION public.release_escrow_to_chef(
    p_idempotency_key TEXT,
    p_order_id UUID,
    p_chef_id UUID,
    p_escrow_amount_kobo BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_transaction_id UUID;
    v_result JSONB;
BEGIN
    -- Check idempotency
    IF EXISTS (SELECT 1 FROM processed_requests WHERE idempotency_key = p_idempotency_key) THEN
        SELECT result INTO v_result FROM processed_requests WHERE idempotency_key = p_idempotency_key;
        RETURN v_result;
    END IF;
    
    -- Insert idempotency record
    INSERT INTO processed_requests (idempotency_key, status)
    VALUES (p_idempotency_key, 'processing');
    
    v_transaction_id := gen_random_uuid();
    
    -- Debit escrow
    INSERT INTO ledger_entries (transaction_id, account_id, amount, entry_type, description)
    VALUES (v_transaction_id, NULL, p_escrow_amount_kobo, 'debit', 'Escrow release for order ' || p_order_id::text);
    
    -- Credit chef
    INSERT INTO ledger_entries (transaction_id, account_id, amount, entry_type, description)
    VALUES (v_transaction_id, p_chef_id, p_escrow_amount_kobo, 'credit', 'Escrow release - remaining 60%');
    
    -- Update chef wallet
    UPDATE wallets SET balance = balance + p_escrow_amount_kobo, last_updated = NOW()
    WHERE user_id = p_chef_id;
    
    v_result := jsonb_build_object(
        'success', true,
        'transaction_id', v_transaction_id,
        'released_kobo', p_escrow_amount_kobo
    );
    
    UPDATE processed_requests 
    SET status = 'completed', result = v_result
    WHERE idempotency_key = p_idempotency_key;
    
    RETURN v_result;
END;
$$;

-- 13. WALLET TOP-UP FUNCTION
CREATE OR REPLACE FUNCTION public.topup_wallet(
    p_idempotency_key TEXT,
    p_user_id UUID,
    p_amount_kobo BIGINT,
    p_description TEXT DEFAULT 'Wallet top-up'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_transaction_id UUID;
    v_result JSONB;
BEGIN
    -- Check idempotency
    IF EXISTS (SELECT 1 FROM processed_requests WHERE idempotency_key = p_idempotency_key) THEN
        SELECT result INTO v_result FROM processed_requests WHERE idempotency_key = p_idempotency_key;
        RETURN v_result;
    END IF;
    
    INSERT INTO processed_requests (idempotency_key, status)
    VALUES (p_idempotency_key, 'processing');
    
    v_transaction_id := gen_random_uuid();
    
    -- Credit user wallet
    INSERT INTO ledger_entries (transaction_id, account_id, amount, entry_type, description)
    VALUES (v_transaction_id, p_user_id, p_amount_kobo, 'credit', p_description);
    
    -- Ensure wallet exists and update balance
    INSERT INTO wallets (user_id, balance, last_updated)
    VALUES (p_user_id, p_amount_kobo, NOW())
    ON CONFLICT (user_id) DO UPDATE SET 
        balance = wallets.balance + p_amount_kobo,
        last_updated = NOW();
    
    v_result := jsonb_build_object(
        'success', true,
        'transaction_id', v_transaction_id,
        'amount_kobo', p_amount_kobo
    );
    
    UPDATE processed_requests 
    SET status = 'completed', result = v_result
    WHERE idempotency_key = p_idempotency_key;
    
    RETURN v_result;
END;
$$;
