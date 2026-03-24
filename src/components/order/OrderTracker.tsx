import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { OrderChatSheet } from '@/components/chat/OrderChatSheet';
import OrderTrackingMap from './OrderTrackingMap';
import { OrderReviewModal } from './OrderReviewModal';
import { useNotifications } from '@/hooks/useNotifications';
import { calculateDistance } from '@/lib/distance';
import {
  CheckCircle2, 
  Clock, 
  ChefHat, 
  Truck, 
  Package,
  MapPin,
  MessageCircle,
  Phone,
  Bike,
  Star
} from 'lucide-react';

interface Order {
  id: string;
  status: string;
  delivery_address: string;
  delivery_lat: number | null;
  delivery_lng: number | null;
  escrow_amount: number;
  delivery_pin: string | null;
  created_at: string;
  rider_id: string | null;
  chef_id: string | null;
  chef_profiles?: {
    brand_name: string;
    id: string;
  } | null;
}

interface RiderLocation {
  lat: number;
  lng: number;
}

interface OrderTrackerProps {
  userId: string;
}

const statusSteps = [
  { key: 'pending', label: 'Order Placed', icon: Clock },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle2 },
  { key: 'preparing', label: 'Preparing', icon: ChefHat },
  { key: 'ready', label: 'Ready for Pickup', icon: Package },
  { key: 'picked_up', label: 'Picked Up', icon: Bike },
  { key: 'in_transit', label: 'On the Way', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: MapPin },
];

const getStatusIndex = (status: string) => {
  const index = statusSteps.findIndex(s => s.key === status);
  return index >= 0 ? index : 0;
};

const OrderTracker = ({ userId }: OrderTrackerProps) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [riderLocations, setRiderLocations] = useState<Record<string, RiderLocation>>({});
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedChefName, setSelectedChefName] = useState<string>('Chef');
  
  // Review modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [orderToReview, setOrderToReview] = useState<Order | null>(null);
  const [reviewedOrderIds, setReviewedOrderIds] = useState<Set<string>>(new Set());
  
  // Track previous order statuses for notification comparison
  const previousStatusesRef = useRef<Record<string, string>>({});
  // Track orders that have already received proximity alerts
  const proximityAlertedRef = useRef<Set<string>>(new Set());
  
  const { notifyOrderStatusChange, notifyRiderAssigned, sendNotification, requestPermission } = useNotifications();

  // Request notification permission on mount
  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  // Fetch already reviewed orders
  useEffect(() => {
    const fetchReviewedOrders = async () => {
      const { data } = await supabase
        .from('order_reviews')
        .select('order_id')
        .eq('buyer_id', userId);
      
      if (data) {
        setReviewedOrderIds(new Set(data.map(r => r.order_id)));
      }
    };
    fetchReviewedOrders();
  }, [userId]);

  const openChat = (orderId: string, chefName: string) => {
    setSelectedOrderId(orderId);
    setSelectedChefName(chefName);
    setChatOpen(true);
  };

  const openReviewModal = (order: Order) => {
    setOrderToReview(order);
    setReviewModalOpen(true);
  };

  const handleReviewSubmitted = () => {
    if (orderToReview) {
      setReviewedOrderIds(prev => new Set([...prev, orderToReview.id]));
    }
    setOrderToReview(null);
  };

  useEffect(() => {
    fetchOrders();
    
    // Subscribe to real-time order updates
    const channel = supabase
      .channel('buyer-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `buyer_id=eq.${userId}`,
        },
        (payload) => {
          console.log('Order update:', payload);
          if (payload.eventType === 'INSERT') {
            const newOrder = payload.new as Order;
            setOrders(prev => [newOrder, ...prev]);
            // Store initial status
            previousStatusesRef.current[newOrder.id] = newOrder.status || 'pending';
          } else if (payload.eventType === 'UPDATE') {
            const updatedOrder = payload.new as Order;
            const oldOrder = payload.old as Partial<Order>;
            const previousStatus = previousStatusesRef.current[updatedOrder.id] || oldOrder.status;
            const newStatus = updatedOrder.status;

            // Notify on status change
            if (newStatus && previousStatus !== newStatus) {
              notifyOrderStatusChange(updatedOrder.id, newStatus);
              previousStatusesRef.current[updatedOrder.id] = newStatus;
            }

            // Notify when rider is assigned
            if (updatedOrder.rider_id && !oldOrder.rider_id) {
              notifyRiderAssigned(updatedOrder.id);
            }

            setOrders(prev =>
              prev.map(order =>
                order.id === updatedOrder.id ? { ...order, ...updatedOrder } : order
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, notifyOrderStatusChange, notifyRiderAssigned]);

  // Fetch rider locations for active orders
  useEffect(() => {
    const fetchRiderLocations = async () => {
      const activeOrders = orders.filter(o => 
        ['picked_up', 'in_transit'].includes(o.status || '') && o.rider_id
      );
      
      for (const order of activeOrders) {
        if (order.rider_id) {
          const { data: riderData } = await supabase
            .from('rider_profiles')
            .select('current_lat, current_lng')
            .eq('id', order.rider_id)
            .maybeSingle();
          
          if (riderData?.current_lat && riderData?.current_lng) {
            setRiderLocations(prev => ({
              ...prev,
              [order.id]: { lat: riderData.current_lat, lng: riderData.current_lng }
            }));
          }
        }
      }
    };

    if (orders.length > 0) {
      fetchRiderLocations();
    }
  }, [orders]);

  // Real-time rider location tracking via presence
  useEffect(() => {
    const activeOrders = orders.filter(o => 
      ['picked_up', 'in_transit'].includes(o.status || '') && o.rider_id
    );

    if (activeOrders.length === 0) return;

    const channels = activeOrders.map(order => {
      if (!order.rider_id) return null;

      const channel = supabase
        .channel(`rider-location-${order.rider_id}`)
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          const presenceData = Object.values(state).flat()[0] as Record<string, unknown> | undefined;
          if (presenceData && typeof presenceData.lat === 'number' && typeof presenceData.lng === 'number') {
            const newLocation = { lat: presenceData.lat as number, lng: presenceData.lng as number };
            setRiderLocations(prev => ({
              ...prev,
              [order.id]: newLocation
            }));
            
            // Check proximity for alert (500m threshold)
            if (order.delivery_lat && order.delivery_lng && !proximityAlertedRef.current.has(order.id)) {
              const distance = calculateDistance(
                newLocation.lat,
                newLocation.lng,
                order.delivery_lat,
                order.delivery_lng
              );
              
              if (distance <= 0.5) { // 500 meters
                proximityAlertedRef.current.add(order.id);
                sendNotification('🚴 Rider is nearby!', {
                  body: `Your rider is within 500m of your location. Please prepare your delivery PIN: ${order.delivery_pin}`,
                  tag: `proximity-${order.id}`,
                  requireInteraction: true
                });
              }
            }
          }
        })
        .subscribe();

      return channel;
    }).filter(Boolean);

    return () => {
      channels.forEach(channel => {
        if (channel) supabase.removeChannel(channel);
      });
    };
  }, [orders, sendNotification]);

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        chef_profiles (id, brand_name)
      `)
      .eq('buyer_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      setOrders(data);
    }
    setLoading(false);
  };

  const activeOrders = orders.filter(o => !['delivered', 'cancelled'].includes(o.status || ''));
  const deliveredOrders = orders.filter(o => 
    o.status === 'delivered' && !reviewedOrderIds.has(o.id)
  );

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map(i => (
          <Card key={i} className="p-4 animate-pulse">
            <div className="h-4 bg-muted rounded w-1/3 mb-2" />
            <div className="h-3 bg-muted rounded w-1/2" />
          </Card>
        ))}
      </div>
    );
  }

  if (activeOrders.length === 0) {
    return (
      <Card className="p-6 text-center">
        <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">No active orders</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {activeOrders.map(order => {
        const currentStep = getStatusIndex(order.status || 'pending');
        const riderLocation = riderLocations[order.id];
        const showMap = ['picked_up', 'in_transit', 'ready'].includes(order.status || '') && 
                       order.delivery_lat && order.delivery_lng;
        
        return (
          <Card key={order.id} className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-semibold">Order #{order.id.slice(0, 8)}</p>
                <p className="text-sm text-muted-foreground">
                  {order.chef_profiles?.brand_name || 'Chef'}
                </p>
              </div>
              <Badge variant={order.status === 'in_transit' ? 'default' : 'secondary'}>
                {statusSteps[currentStep]?.label || order.status}
              </Badge>
            </div>

            {/* Progress Steps */}
            <div className="relative">
              <div className="flex justify-between">
                {statusSteps.slice(0, 5).map((step, index) => {
                  const isComplete = index <= currentStep;
                  const isCurrent = index === currentStep;
                  const Icon = step.icon;
                  
                  return (
                    <div key={step.key} className="flex flex-col items-center z-10">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                          isComplete
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        } ${isCurrent ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className={`text-xs mt-1 text-center max-w-[60px] ${
                        isComplete ? 'text-primary font-medium' : 'text-muted-foreground'
                      }`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
              {/* Progress Line */}
              <div className="absolute top-4 left-4 right-4 h-0.5 bg-muted -z-0">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${(currentStep / 4) * 100}%` }}
                />
              </div>
            </div>

            {/* Real-time Map Tracking */}
            {showMap && (
              <div className="mt-4">
                <OrderTrackingMap
                  orderId={order.id}
                  riderLocation={riderLocation}
                  deliveryLocation={{ 
                    lat: order.delivery_lat!, 
                    lng: order.delivery_lng! 
                  }}
                  status={order.status || 'pending'}
                />
              </div>
            )}

            {/* Delivery PIN */}
            {['ready', 'picked_up', 'in_transit'].includes(order.status || '') && order.delivery_pin && (
              <div className="mt-4 p-3 bg-primary/10 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Delivery PIN</p>
                <p className="text-2xl font-mono font-bold tracking-widest text-primary">
                  {order.delivery_pin}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Share this PIN with the rider to confirm delivery
                </p>
              </div>
            )}

            {/* Order Details */}
            <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span className="truncate max-w-[150px]">{order.delivery_address}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => openChat(order.id, order.chef_profiles?.brand_name || 'Chef')}
                >
                  <MessageCircle className="w-4 h-4 mr-1" /> Chat
                </Button>
                {order.rider_id && ['picked_up', 'in_transit'].includes(order.status || '') && (
                  <Button variant="outline" size="icon" className="h-9 w-9">
                    <Phone className="w-4 h-4" />
                  </Button>
                )}
                <p className="font-bold text-primary">
                  ₦{order.escrow_amount?.toLocaleString()}
                </p>
              </div>
            </div>
          </Card>
        );
      })}

      {/* Delivered orders pending review */}
      {deliveredOrders.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Rate your recent orders</h3>
          {deliveredOrders.map(order => (
            <Card key={order.id} className="p-4 border-primary/20 bg-primary/5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Order #{order.id.slice(0, 8)}</p>
                  <p className="text-sm text-muted-foreground">
                    {order.chef_profiles?.brand_name || 'Chef'}
                  </p>
                </div>
                <Button onClick={() => openReviewModal(order)} size="sm">
                  <Star className="w-4 h-4 mr-1" /> Rate Order
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {selectedOrderId && (
        <OrderChatSheet
          open={chatOpen}
          onOpenChange={setChatOpen}
          orderId={selectedOrderId}
          userRole="buyer"
          otherPartyName={selectedChefName}
        />
      )}

      {orderToReview && orderToReview.chef_profiles && (
        <OrderReviewModal
          open={reviewModalOpen}
          onOpenChange={setReviewModalOpen}
          orderId={orderToReview.id}
          chefId={orderToReview.chef_profiles.id}
          riderId={orderToReview.rider_id}
          chefName={orderToReview.chef_profiles.brand_name}
          buyerId={userId}
          onReviewSubmitted={handleReviewSubmitted}
        />
      )}
    </div>
  );
};

export default OrderTracker;
