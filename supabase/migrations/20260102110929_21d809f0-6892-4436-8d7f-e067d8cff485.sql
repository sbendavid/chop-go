-- Create order_reviews table for ratings and reviews
CREATE TABLE public.order_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL,
  chef_id UUID NOT NULL REFERENCES public.chef_profiles(id) ON DELETE CASCADE,
  rider_id UUID REFERENCES public.rider_profiles(id) ON DELETE SET NULL,
  chef_rating INTEGER NOT NULL CHECK (chef_rating >= 1 AND chef_rating <= 5),
  rider_rating INTEGER CHECK (rider_rating >= 1 AND rider_rating <= 5),
  review_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(order_id)
);

-- Enable Row Level Security
ALTER TABLE public.order_reviews ENABLE ROW LEVEL SECURITY;

-- Buyers can create reviews for their own orders
CREATE POLICY "Buyers can create reviews for their orders"
ON public.order_reviews
FOR INSERT
WITH CHECK (
  auth.uid() = buyer_id AND
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = order_reviews.order_id 
    AND orders.buyer_id = auth.uid()
    AND orders.status = 'delivered'
  )
);

-- Buyers can view their own reviews
CREATE POLICY "Buyers can view own reviews"
ON public.order_reviews
FOR SELECT
USING (auth.uid() = buyer_id);

-- Chefs can view reviews for their orders
CREATE POLICY "Chefs can view their reviews"
ON public.order_reviews
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM chef_profiles
    WHERE chef_profiles.id = order_reviews.chef_id
    AND chef_profiles.user_id = auth.uid()
  )
);

-- Riders can view reviews for their deliveries
CREATE POLICY "Riders can view their reviews"
ON public.order_reviews
FOR SELECT
USING (
  rider_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM rider_profiles
    WHERE rider_profiles.id = order_reviews.rider_id
    AND rider_profiles.user_id = auth.uid()
  )
);

-- Anyone can view reviews (for public chef profiles)
CREATE POLICY "Anyone can view reviews"
ON public.order_reviews
FOR SELECT
USING (true);

-- Enable realtime for reviews
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_reviews;