-- Create chat messages table
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('buyer', 'chef')),
  content TEXT NOT NULL,
  original_content TEXT,
  is_masked BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Buyers can view messages for their orders
CREATE POLICY "Buyers can view chat messages"
ON public.chat_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = chat_messages.order_id 
    AND orders.buyer_id = auth.uid()
  )
);

-- Chefs can view messages for their orders
CREATE POLICY "Chefs can view chat messages"
ON public.chat_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders o
    JOIN chef_profiles cp ON o.chef_id = cp.id
    WHERE o.id = chat_messages.order_id 
    AND cp.user_id = auth.uid()
  )
);

-- Buyers can send messages
CREATE POLICY "Buyers can send messages"
ON public.chat_messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND
  sender_role = 'buyer' AND
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = chat_messages.order_id 
    AND orders.buyer_id = auth.uid()
  )
);

-- Chefs can send messages
CREATE POLICY "Chefs can send messages"
ON public.chat_messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND
  sender_role = 'chef' AND
  EXISTS (
    SELECT 1 FROM orders o
    JOIN chef_profiles cp ON o.chef_id = cp.id
    WHERE o.id = chat_messages.order_id 
    AND cp.user_id = auth.uid()
  )
);

-- Enable realtime for chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;