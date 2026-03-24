-- ============================================
-- TITAN CORE DATABASE SCHEMA V1.0
-- ============================================

-- 1. ADD VERIFICATION FIELDS TO PROFILES
-- Note: Roles stay in user_roles table (security best practice)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS face_trust_score NUMERIC(5,2) DEFAULT 0 CHECK (face_trust_score >= 0 AND face_trust_score <= 100),
ADD COLUMN IF NOT EXISTS biometric_key TEXT;

-- 2. LEDGER SPLITS TABLE - Detailed transaction breakdown
CREATE TABLE public.ledger_splits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    transaction_id UUID NOT NULL, -- Links to ledger_entries
    
    -- All amounts in Kobo (integers)
    meal_total_kobo BIGINT NOT NULL CHECK (meal_total_kobo >= 0),
    chef_net_kobo BIGINT NOT NULL CHECK (chef_net_kobo >= 0), -- 85% of meal
    platform_comm_kobo BIGINT NOT NULL CHECK (platform_comm_kobo >= 0), -- 15% commission
    platform_fee_kobo BIGINT NOT NULL CHECK (platform_fee_kobo >= 0), -- 5% platform fee
    service_fee_kobo BIGINT NOT NULL DEFAULT 30000 CHECK (service_fee_kobo >= 0), -- ₦300 = 30000 kobo
    vat_total_kobo BIGINT NOT NULL CHECK (vat_total_kobo >= 0), -- 7.5%
    delivery_fee_kobo BIGINT NOT NULL CHECK (delivery_fee_kobo >= 0), -- Dynamic
    
    -- Escrow tracking
    escrow_held_kobo BIGINT NOT NULL CHECK (escrow_held_kobo >= 0), -- 60% held
    chef_advance_kobo BIGINT NOT NULL CHECK (chef_advance_kobo >= 0), -- 40% advance
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    UNIQUE(order_id) -- One split record per order
);

-- Enable RLS
ALTER TABLE public.ledger_splits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ledger_splits
CREATE POLICY "Buyers can view splits for own orders"
ON public.ledger_splits FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM orders 
        WHERE orders.id = ledger_splits.order_id 
        AND orders.buyer_id = auth.uid()
    )
);

CREATE POLICY "Chefs can view splits for their orders"
ON public.ledger_splits FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM orders o
        JOIN chef_profiles cp ON o.chef_id = cp.id
        WHERE o.id = ledger_splits.order_id 
        AND cp.user_id = auth.uid()
    )
);

CREATE POLICY "Admins can view all splits"
ON public.ledger_splits FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- No direct inserts/updates (done through functions)
CREATE POLICY "No direct splits inserts"
ON public.ledger_splits FOR INSERT
WITH CHECK (false);

CREATE POLICY "No direct splits updates"
ON public.ledger_splits FOR UPDATE
USING (false);

-- Index for performance
CREATE INDEX idx_ledger_splits_order ON public.ledger_splits(order_id);
CREATE INDEX idx_ledger_splits_transaction ON public.ledger_splits(transaction_id);

-- 3. HAGGLES TABLE - Real-time bargain slider positions
CREATE TABLE public.haggles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dish_id UUID NOT NULL REFERENCES public.dishes(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL,
    chef_id UUID NOT NULL REFERENCES public.chef_profiles(id),
    
    -- Original and haggled prices in Kobo
    original_price_kobo BIGINT NOT NULL CHECK (original_price_kobo > 0),
    buyer_offer_kobo BIGINT CHECK (buyer_offer_kobo > 0),
    chef_counter_kobo BIGINT CHECK (chef_counter_kobo > 0),
    final_price_kobo BIGINT CHECK (final_price_kobo > 0),
    
    -- Slider positions (0-100%)
    buyer_slider_position NUMERIC(5,2) DEFAULT 0 CHECK (buyer_slider_position >= 0 AND buyer_slider_position <= 100),
    chef_slider_position NUMERIC(5,2) DEFAULT 100 CHECK (chef_slider_position >= 0 AND chef_slider_position <= 100),
    
    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'countered', 'accepted', 'rejected', 'expired')),
    rounds INTEGER DEFAULT 1 CHECK (rounds >= 1 AND rounds <= 5), -- Max 5 rounds
    
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 minutes'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.haggles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for haggles
CREATE POLICY "Buyers can view own haggles"
ON public.haggles FOR SELECT
USING (auth.uid() = buyer_id);

CREATE POLICY "Buyers can create haggles"
ON public.haggles FOR INSERT
WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Buyers can update own pending haggles"
ON public.haggles FOR UPDATE
USING (auth.uid() = buyer_id AND status IN ('pending', 'countered'));

CREATE POLICY "Chefs can view haggles for their dishes"
ON public.haggles FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM chef_profiles 
        WHERE chef_profiles.id = haggles.chef_id 
        AND chef_profiles.user_id = auth.uid()
    )
);

CREATE POLICY "Chefs can update haggles for their dishes"
ON public.haggles FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM chef_profiles 
        WHERE chef_profiles.id = haggles.chef_id 
        AND chef_profiles.user_id = auth.uid()
    )
    AND status IN ('pending', 'countered')
);

CREATE POLICY "Admins can view all haggles"
ON public.haggles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Indexes for performance
CREATE INDEX idx_haggles_buyer ON public.haggles(buyer_id);
CREATE INDEX idx_haggles_chef ON public.haggles(chef_id);
CREATE INDEX idx_haggles_dish ON public.haggles(dish_id);
CREATE INDEX idx_haggles_status ON public.haggles(status) WHERE status IN ('pending', 'countered');

-- Trigger to update updated_at
CREATE TRIGGER update_haggles_updated_at
BEFORE UPDATE ON public.haggles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 4. STEAM SHOTS TABLE - 5-second kitchen videos with 24hr TTL
CREATE TABLE public.steam_shots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chef_id UUID NOT NULL REFERENCES public.chef_profiles(id) ON DELETE CASCADE,
    dish_id UUID REFERENCES public.dishes(id) ON DELETE SET NULL, -- Optional link to dish
    
    -- Media info
    video_url TEXT NOT NULL,
    thumbnail_url TEXT,
    duration_seconds NUMERIC(4,2) DEFAULT 5 CHECK (duration_seconds <= 10), -- Max 10 seconds
    
    -- Engagement metrics
    view_count INTEGER DEFAULT 0 CHECK (view_count >= 0),
    
    -- Auto-delete after 24 hours
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Status
    is_active BOOLEAN DEFAULT true
);

-- Enable RLS
ALTER TABLE public.steam_shots ENABLE ROW LEVEL SECURITY;

-- RLS Policies for steam_shots
CREATE POLICY "Anyone can view active steam shots"
ON public.steam_shots FOR SELECT
USING (is_active = true AND expires_at > now());

CREATE POLICY "Chefs can create own steam shots"
ON public.steam_shots FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM chef_profiles 
        WHERE chef_profiles.id = steam_shots.chef_id 
        AND chef_profiles.user_id = auth.uid()
    )
);

CREATE POLICY "Chefs can update own steam shots"
ON public.steam_shots FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM chef_profiles 
        WHERE chef_profiles.id = steam_shots.chef_id 
        AND chef_profiles.user_id = auth.uid()
    )
);

CREATE POLICY "Chefs can delete own steam shots"
ON public.steam_shots FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM chef_profiles 
        WHERE chef_profiles.id = steam_shots.chef_id 
        AND chef_profiles.user_id = auth.uid()
    )
);

CREATE POLICY "Admins can manage all steam shots"
ON public.steam_shots FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Indexes for performance
CREATE INDEX idx_steam_shots_chef ON public.steam_shots(chef_id);
CREATE INDEX idx_steam_shots_active ON public.steam_shots(is_active, expires_at) WHERE is_active = true;
CREATE INDEX idx_steam_shots_dish ON public.steam_shots(dish_id) WHERE dish_id IS NOT NULL;

-- 5. FUNCTION TO CALCULATE AND RECORD LEDGER SPLITS
CREATE OR REPLACE FUNCTION public.record_ledger_split(
    p_order_id UUID,
    p_transaction_id UUID,
    p_meal_total_kobo BIGINT,
    p_delivery_fee_kobo BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_chef_net_kobo BIGINT;
    v_platform_comm_kobo BIGINT;
    v_platform_fee_kobo BIGINT;
    v_service_fee_kobo BIGINT := 30000; -- ₦300
    v_vat_total_kobo BIGINT;
    v_escrow_held_kobo BIGINT;
    v_chef_advance_kobo BIGINT;
    v_subtotal_kobo BIGINT;
BEGIN
    -- Calculate splits (all in Kobo - integers only)
    v_platform_comm_kobo := (p_meal_total_kobo * 15) / 100;  -- 15% commission
    v_chef_net_kobo := p_meal_total_kobo - v_platform_comm_kobo;  -- 85% to chef
    
    v_subtotal_kobo := p_meal_total_kobo + p_delivery_fee_kobo + v_service_fee_kobo;
    v_platform_fee_kobo := (v_subtotal_kobo * 5) / 100;  -- 5% platform fee
    v_vat_total_kobo := ((v_subtotal_kobo + v_platform_fee_kobo) * 75) / 1000;  -- 7.5% VAT
    
    -- 40/60 split for chef
    v_chef_advance_kobo := (v_chef_net_kobo * 40) / 100;  -- 40% advance
    v_escrow_held_kobo := v_chef_net_kobo - v_chef_advance_kobo;  -- 60% held
    
    -- Insert the split record
    INSERT INTO ledger_splits (
        order_id, transaction_id, meal_total_kobo, chef_net_kobo,
        platform_comm_kobo, platform_fee_kobo, service_fee_kobo,
        vat_total_kobo, delivery_fee_kobo, escrow_held_kobo, chef_advance_kobo
    ) VALUES (
        p_order_id, p_transaction_id, p_meal_total_kobo, v_chef_net_kobo,
        v_platform_comm_kobo, v_platform_fee_kobo, v_service_fee_kobo,
        v_vat_total_kobo, p_delivery_fee_kobo, v_escrow_held_kobo, v_chef_advance_kobo
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'meal_total_kobo', p_meal_total_kobo,
        'chef_net_kobo', v_chef_net_kobo,
        'platform_comm_kobo', v_platform_comm_kobo,
        'platform_fee_kobo', v_platform_fee_kobo,
        'service_fee_kobo', v_service_fee_kobo,
        'vat_total_kobo', v_vat_total_kobo,
        'delivery_fee_kobo', p_delivery_fee_kobo,
        'escrow_held_kobo', v_escrow_held_kobo,
        'chef_advance_kobo', v_chef_advance_kobo
    );
END;
$$;

-- 6. ENABLE REALTIME FOR HAGGLES (for live bargaining)
ALTER PUBLICATION supabase_realtime ADD TABLE public.haggles;