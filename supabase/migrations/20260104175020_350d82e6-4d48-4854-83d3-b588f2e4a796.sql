-- ============================================
-- SECURITY FIX: Add authorization checks to payment functions
-- and create PIN verification attempts tracking table
-- ============================================

-- 1. Create PIN verification attempts table for rate limiting
CREATE TABLE IF NOT EXISTS public.pin_verification_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    rider_id UUID NOT NULL REFERENCES public.rider_profiles(id),
    attempted_pin TEXT, -- Masked for logging
    success BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on pin_verification_attempts
ALTER TABLE public.pin_verification_attempts ENABLE ROW LEVEL SECURITY;

-- RLS policies for pin_verification_attempts
CREATE POLICY "Riders can view their own verification attempts"
ON public.pin_verification_attempts
FOR SELECT
USING (
    rider_id IN (
        SELECT id FROM public.rider_profiles WHERE user_id = auth.uid()
    )
);

-- Service role can insert (from edge function)
CREATE POLICY "Service role can insert verification attempts"
ON public.pin_verification_attempts
FOR INSERT
WITH CHECK (true);

-- Index for efficient rate limiting queries
CREATE INDEX idx_pin_attempts_order_created 
ON public.pin_verification_attempts(order_id, created_at DESC);

-- 2. Create secure PIN generation function
CREATE OR REPLACE FUNCTION public.generate_secure_delivery_pin()
RETURNS TEXT
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    -- Generate 4-digit PIN using PostgreSQL's random
    RETURN LPAD(floor(random() * 9000 + 1000)::TEXT, 4, '0');
END;
$$;

-- 3. Create trigger to auto-generate PIN on order creation
CREATE OR REPLACE FUNCTION public.set_order_delivery_pin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    IF NEW.delivery_pin IS NULL THEN
        NEW.delivery_pin := public.generate_secure_delivery_pin();
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_delivery_pin ON public.orders;
CREATE TRIGGER trigger_set_delivery_pin
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.set_order_delivery_pin();

-- 4. Update process_order_payment with authorization checks
CREATE OR REPLACE FUNCTION public.process_order_payment(
    p_idempotency_key text, 
    p_order_id uuid, 
    p_buyer_id uuid, 
    p_chef_id uuid, 
    p_total_amount_kobo bigint, 
    p_description text DEFAULT 'Order payment'::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_transaction_id UUID;
    v_platform_fee_kobo BIGINT;
    v_chef_advance_kobo BIGINT;
    v_escrow_hold_kobo BIGINT;
    v_buyer_balance BIGINT;
    v_result JSONB;
    v_chef_user_id UUID;
BEGIN
    -- AUTHORIZATION CHECK: Verify caller is the buyer
    IF auth.uid() IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;
    
    IF auth.uid() != p_buyer_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: You can only pay for your own orders');
    END IF;
    
    -- Verify order exists and belongs to buyer with correct status
    IF NOT EXISTS (
        SELECT 1 FROM orders 
        WHERE id = p_order_id 
        AND buyer_id = p_buyer_id 
        AND status = 'pending'
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid order or order not pending');
    END IF;
    
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
    
    -- Get chef's user_id
    SELECT user_id INTO v_chef_user_id FROM chef_profiles WHERE id = p_chef_id;
    
    -- Check buyer has sufficient balance
    SELECT balance INTO v_buyer_balance FROM wallets WHERE user_id = p_buyer_id FOR UPDATE;
    
    IF v_buyer_balance IS NULL OR v_buyer_balance < p_total_amount_kobo THEN
        UPDATE processed_requests 
        SET status = 'failed', result = '{"success": false, "error": "Insufficient balance"}'::jsonb
        WHERE idempotency_key = p_idempotency_key;
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
    END IF;
    
    -- ATOMIC DOUBLE-ENTRY LEDGER ENTRIES
    
    -- 1. Debit buyer (money leaves buyer wallet)
    INSERT INTO ledger_entries (transaction_id, account_id, amount, entry_type, description)
    VALUES (v_transaction_id, p_buyer_id, p_total_amount_kobo, 'debit', p_description || ' - Payment');
    
    -- 2. Credit chef advance (40% goes to chef immediately)
    INSERT INTO ledger_entries (transaction_id, account_id, amount, entry_type, description)
    VALUES (v_transaction_id, v_chef_user_id, v_chef_advance_kobo, 'credit', p_description || ' - Chef Advance (40%)');
    
    -- 3. Credit escrow (60% held in escrow)
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
    WHERE user_id = v_chef_user_id;
    
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

-- 5. Update release_escrow_to_chef with authorization checks
CREATE OR REPLACE FUNCTION public.release_escrow_to_chef(
    p_idempotency_key text, 
    p_order_id uuid, 
    p_chef_id uuid, 
    p_escrow_amount_kobo bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_transaction_id UUID;
    v_result JSONB;
    v_chef_user_id UUID;
    v_order_record RECORD;
    v_rider_user_id UUID;
BEGIN
    -- AUTHORIZATION CHECK
    IF auth.uid() IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;
    
    -- Get order details
    SELECT o.*, cp.user_id as chef_user_id
    INTO v_order_record
    FROM orders o
    JOIN chef_profiles cp ON cp.id = o.chef_id
    WHERE o.id = p_order_id;
    
    IF v_order_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Order not found');
    END IF;
    
    v_chef_user_id := v_order_record.chef_user_id;
    
    -- Get rider's user_id if rider exists
    IF v_order_record.rider_id IS NOT NULL THEN
        SELECT user_id INTO v_rider_user_id 
        FROM rider_profiles 
        WHERE id = v_order_record.rider_id;
    END IF;
    
    -- Authorization: Allow if caller is:
    -- 1. The buyer (with PIN verified and status delivered), OR
    -- 2. The rider (with PIN verified), OR
    -- 3. An admin
    IF NOT (
        -- Buyer confirming delivery
        (auth.uid() = v_order_record.buyer_id AND v_order_record.pin_verified = true AND v_order_record.status = 'delivered')
        OR
        -- Rider confirming delivery
        (v_rider_user_id IS NOT NULL AND auth.uid() = v_rider_user_id AND v_order_record.pin_verified = true)
        OR
        -- Admin role
        public.has_role(auth.uid(), 'admin')
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Cannot release escrow');
    END IF;
    
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
    VALUES (v_transaction_id, v_chef_user_id, p_escrow_amount_kobo, 'credit', 'Escrow release - remaining 60%');
    
    -- Update chef wallet
    UPDATE wallets SET balance = balance + p_escrow_amount_kobo, last_updated = NOW()
    WHERE user_id = v_chef_user_id;
    
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

-- 6. Update topup_wallet with authorization checks
CREATE OR REPLACE FUNCTION public.topup_wallet(
    p_idempotency_key text, 
    p_user_id uuid, 
    p_amount_kobo bigint, 
    p_description text DEFAULT 'Wallet top-up'::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_transaction_id UUID;
    v_result JSONB;
BEGIN
    -- AUTHORIZATION CHECK: Only allow topping up own wallet or admin
    IF auth.uid() IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;
    
    IF auth.uid() != p_user_id AND NOT public.has_role(auth.uid(), 'admin') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Can only top up your own wallet');
    END IF;
    
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