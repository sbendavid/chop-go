import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerifyPinRequest {
  orderId: string;
  pin: string;
  offlineToken?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's token to get their identity
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { orderId, pin, offlineToken }: VerifyPinRequest = await req.json();

    console.log(`PIN verification attempt for order ${orderId} by user ${user.id}`);

    // Validate input
    if (!orderId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Order ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!pin && !offlineToken) {
      return new Response(
        JSON.stringify({ success: false, error: 'PIN or offline token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate PIN/token format
    if (pin && (pin.length !== 4 || !/^\d{4}$/.test(pin))) {
      return new Response(
        JSON.stringify({ success: false, error: 'PIN must be 4 digits' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (offlineToken && (offlineToken.length !== 6 || !/^\d{6}$/.test(offlineToken))) {
      return new Response(
        JSON.stringify({ success: false, error: 'Offline token must be 6 digits' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get order details
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, delivery_pin, rider_id, status, pin_verified, escrow_amount, chef_id')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('Order not found:', orderError);
      return new Response(
        JSON.stringify({ success: false, error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the caller is the rider assigned to this order
    const { data: riderProfile } = await supabaseAdmin
      .from('rider_profiles')
      .select('id, user_id')
      .eq('id', order.rider_id)
      .single();

    if (!riderProfile || riderProfile.user_id !== user.id) {
      console.error(`Unauthorized: User ${user.id} is not the rider for order ${orderId}`);
      return new Response(
        JSON.stringify({ success: false, error: 'You are not authorized to verify this delivery' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check order status
    if (order.status !== 'in_transit' && order.status !== 'picked_up') {
      return new Response(
        JSON.stringify({ success: false, error: `Cannot verify PIN for order with status: ${order.status}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already verified
    if (order.pin_verified) {
      return new Response(
        JSON.stringify({ success: false, error: 'PIN already verified for this order' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check rate limiting - max 5 attempts per order
    const { count: attemptCount } = await supabaseAdmin
      .from('pin_verification_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('order_id', orderId)
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()); // Last hour

    if (attemptCount && attemptCount >= 5) {
      console.error(`Rate limit exceeded for order ${orderId}`);
      return new Response(
        JSON.stringify({ success: false, error: 'Too many attempts. Please contact support.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Record this attempt
    await supabaseAdmin
      .from('pin_verification_attempts')
      .insert({
        order_id: orderId,
        rider_id: riderProfile.id,
        attempted_pin: pin ? pin.substring(0, 2) + '**' : 'offline', // Mask for logging
        success: false
      });

    // Verify PIN
    const pinToCheck = pin || '';
    const isValid = order.delivery_pin === pinToCheck;

    // For offline token, we'd need additional logic (e.g., HMAC verification)
    // For now, offline token is not supported in production
    if (offlineToken && !pin) {
      return new Response(
        JSON.stringify({ success: false, error: 'Offline verification not yet available' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!isValid) {
      // Get remaining attempts
      const remainingAttempts = 5 - ((attemptCount || 0) + 1);
      console.log(`Invalid PIN for order ${orderId}. Remaining attempts: ${remainingAttempts}`);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid PIN',
          remainingAttempts
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PIN is valid - update order status
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({ 
        status: 'delivered',
        pin_verified: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('Failed to update order:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to confirm delivery' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update attempt record to success
    await supabaseAdmin
      .from('pin_verification_attempts')
      .update({ success: true })
      .eq('order_id', orderId)
      .eq('rider_id', riderProfile.id)
      .order('created_at', { ascending: false })
      .limit(1);

    // Get chef's user_id for escrow release
    const { data: chefProfile } = await supabaseAdmin
      .from('chef_profiles')
      .select('user_id')
      .eq('id', order.chef_id)
      .single();

    console.log(`PIN verified successfully for order ${orderId}. Ready for escrow release.`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Delivery confirmed successfully',
        escrowAmount: order.escrow_amount,
        chefUserId: chefProfile?.user_id
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('PIN verification error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
