import { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import PinVerificationSheet from '@/components/rider/PinVerificationSheet';
import { useRiderLocationTracking } from '@/hooks/useRiderLocationTracking';
import { Home, Package, DollarSign, Settings, MapPin, Navigation, Clock, Check, Bike, LogOut, Eye, EyeOff, Phone, Bell } from 'lucide-react';

interface RiderProfile {
  id: string;
  is_online: boolean;
  vehicle_type: string;
  plate_number: string | null;
  rating: number;
  total_deliveries: number;
  earnings_balance: number;
}

interface Delivery {
  id: string;
  status: string;
  delivery_fee: number;
  delivery_address: string;
  delivery_landmark: string | null;
  delivery_pin: string | null;
  created_at: string;
  chef_id: string | null;
  rider_id: string | null;
}

const RiderDashboard = () => {
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'home' | 'deliveries' | 'earnings' | 'settings'>('home');
  const [riderProfile, setRiderProfile] = useState<RiderProfile | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [availableDeliveries, setAvailableDeliveries] = useState<Delivery[]>([]);
  const [isOnline, setIsOnline] = useState(false);
  const [showEarnings, setShowEarnings] = useState(true);
  const [loading, setLoading] = useState(true);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [pinSheetOpen, setPinSheetOpen] = useState(false);

  // Track rider location when online
  useRiderLocationTracking({
    riderId: riderProfile?.id || '',
    isOnline: isOnline && !!riderProfile?.id,
  });

  const mockEarnings = { today: 8500, week: 42000, available: riderProfile?.earnings_balance || 38000 };

  const loadRiderData = useCallback(async () => {
    if (!user) return;

    const { data: rider } = await supabase
      .from('rider_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (rider) {
      setRiderProfile(rider as RiderProfile);
      setIsOnline(rider.is_online);

      // Fetch deliveries assigned to this rider
      const { data: myDeliveries } = await supabase
        .from('orders')
        .select('*')
        .eq('rider_id', rider.id)
        .order('created_at', { ascending: false });

      if (myDeliveries) setDeliveries(myDeliveries as Delivery[]);

      // Fetch available deliveries (ready status, no rider assigned)
      const { data: available } = await supabase
        .from('orders')
        .select('*')
        .eq('status', 'ready')
        .is('rider_id', null)
        .order('created_at', { ascending: false });

      if (available) setAvailableDeliveries(available as Delivery[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadRiderData();
  }, [loadRiderData]);

  // Real-time subscription for new available deliveries
  useEffect(() => {
    if (!riderProfile || !isOnline) return;

    const channel = supabase
      .channel('rider-deliveries')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const order = payload.new as Delivery;
            // New delivery available
            if (order.status === 'ready' && !order.rider_id) {
              setAvailableDeliveries(prev => {
                if (!prev.find(d => d.id === order.id)) {
                  toast({ title: '🚴 New Delivery Available!', description: order.delivery_address });
                  return [order, ...prev];
                }
                return prev;
              });
            }
            // Update my deliveries
            if (order.rider_id === riderProfile.id) {
              setDeliveries(prev => prev.map(d => d.id === order.id ? order : d));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [riderProfile, isOnline, toast]);

  const toggleOnlineStatus = async () => {
    if (!riderProfile) return;

    const newStatus = !isOnline;
    setIsOnline(newStatus);

    const { error } = await supabase
      .from('rider_profiles')
      .update({ is_online: newStatus })
      .eq('id', riderProfile.id);

    if (error) {
      setIsOnline(!newStatus);
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
    } else {
      toast({
        title: newStatus ? '🟢 You\'re Online!' : '⚫ You\'re Offline',
        description: newStatus ? 'You will receive delivery requests' : 'You won\'t receive new requests'
      });
    }
  };

  const acceptDelivery = async (deliveryId: string) => {
    if (!riderProfile) return;

    const { error } = await supabase
      .from('orders')
      .update({ 
        rider_id: riderProfile.id,
        status: 'picked_up'
      })
      .eq('id', deliveryId);

    if (error) {
      toast({ title: 'Error', description: 'Failed to accept delivery', variant: 'destructive' });
    } else {
      const accepted = availableDeliveries.find(d => d.id === deliveryId);
      if (accepted) {
        setDeliveries(prev => [{ ...accepted, status: 'picked_up' }, ...prev]);
        setAvailableDeliveries(prev => prev.filter(d => d.id !== deliveryId));
      }
      toast({ title: '✅ Delivery Accepted!', description: 'Navigate to pickup location' });
    }
  };

  const startDelivery = async (deliveryId: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: 'in_transit' })
      .eq('id', deliveryId);

    if (error) {
      toast({ title: 'Error', description: 'Failed to start delivery', variant: 'destructive' });
    } else {
      setDeliveries(prev => prev.map(d => d.id === deliveryId ? { ...d, status: 'in_transit' } : d));
      toast({ title: '🚴 On your way!', description: 'Safe travels!' });
    }
  };

  const openPinVerification = (delivery: Delivery) => {
    setSelectedDelivery(delivery);
    setPinSheetOpen(true);
  };

  const handlePinVerified = async (orderId: string) => {
    setDeliveries(prev => prev.map(d => d.id === orderId ? { ...d, status: 'delivered' } : d));
    setPinSheetOpen(false);
    setSelectedDelivery(null);
    toast({ title: '🎉 Delivery Complete!', description: 'Earnings added to your balance' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'picked_up': return 'bg-blue-500/20 text-blue-700 dark:text-blue-300';
      case 'in_transit': return 'bg-primary/20 text-primary';
      case 'delivered': return 'bg-secondary/20 text-secondary';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <>
      <Helmet><title>Rider Dashboard | Chop Market</title></Helmet>
      <div className="min-h-screen bg-background pb-20">
        <header className="bg-accent text-accent-foreground sticky top-0 z-40">
          <div className="container py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <Bike className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="font-display font-bold">{profile?.full_name || 'Rider'}</h1>
                  <p className="text-sm opacity-70">
                    {deliveries.filter(d => ['picked_up', 'in_transit'].includes(d.status)).length} active deliveries
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-white/20 rounded-full px-3 py-1.5">
                <span className="text-sm">{isOnline ? 'Online' : 'Offline'}</span>
                <Switch checked={isOnline} onCheckedChange={toggleOnlineStatus} />
              </div>
            </div>
          </div>
        </header>

        <main className="container py-6">
          {activeTab === 'home' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-4 text-center">
                  <p className="text-2xl font-bold">{availableDeliveries.length}</p>
                  <p className="text-sm text-muted-foreground">Available</p>
                </Card>
                <Card className="p-4 text-center">
                  <p className="text-2xl font-bold">₦{mockEarnings.today.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Today</p>
                </Card>
              </div>

              {/* Active Deliveries */}
              {deliveries.filter(d => ['picked_up', 'in_transit'].includes(d.status)).length > 0 && (
                <div>
                  <h2 className="font-display font-semibold mb-3 flex items-center gap-2">
                    Active Delivery
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                    </span>
                  </h2>
                  {deliveries.filter(d => ['picked_up', 'in_transit'].includes(d.status)).map(delivery => (
                    <Card key={delivery.id} className="p-4 mb-3 border-l-4 border-l-primary">
                      <div className="flex justify-between mb-3">
                        <Badge className={getStatusColor(delivery.status)}>{delivery.status.replace('_', ' ')}</Badge>
                        <p className="font-bold text-primary">₦{delivery.delivery_fee}</p>
                      </div>
                      <div className="space-y-2 text-sm mb-4">
                        <div className="flex items-center gap-2">
                          <Navigation className="w-4 h-4 text-primary" />
                          <span>{delivery.delivery_address}</span>
                        </div>
                        {delivery.delivery_landmark && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground">{delivery.delivery_landmark}</span>
                          </div>
                        )}
                      </div>
                      {delivery.status === 'picked_up' && (
                        <Button className="w-full" onClick={() => startDelivery(delivery.id)}>
                          <Navigation className="w-4 h-4 mr-2" /> Start Delivery
                        </Button>
                      )}
                      {delivery.status === 'in_transit' && (
                        <Button className="w-full" variant="secondary" onClick={() => openPinVerification(delivery)}>
                          <Check className="w-4 h-4 mr-2" /> Complete Delivery
                        </Button>
                      )}
                    </Card>
                  ))}
                </div>
              )}

              {/* Available Deliveries */}
              <div>
                <h2 className="font-display font-semibold mb-3">Available Deliveries</h2>
                {!isOnline ? (
                  <Card className="p-6 text-center text-muted-foreground">
                    <Bike className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>Go online to see deliveries</p>
                  </Card>
                ) : availableDeliveries.length === 0 ? (
                  <Card className="p-6 text-center text-muted-foreground">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No deliveries available</p>
                  </Card>
                ) : (
                  availableDeliveries.map(delivery => (
                    <Card key={delivery.id} className="p-4 mb-3">
                      <div className="flex justify-between mb-3">
                        <Badge variant="secondary">Ready for pickup</Badge>
                        <p className="font-bold text-primary">₦{delivery.delivery_fee}</p>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Navigation className="w-4 h-4 text-primary" />
                          <span>{delivery.delivery_address}</span>
                        </div>
                        {delivery.delivery_landmark && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground">{delivery.delivery_landmark}</span>
                          </div>
                        )}
                      </div>
                      <Button className="w-full mt-3" onClick={() => acceptDelivery(delivery.id)}>
                        Accept Delivery
                      </Button>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'deliveries' && (
            <div className="space-y-4">
              <h2 className="font-display font-bold text-xl">My Deliveries</h2>
              {deliveries.length === 0 ? (
                <Card className="p-6 text-center text-muted-foreground">
                  <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No delivery history</p>
                </Card>
              ) : (
                deliveries.map(d => (
                  <Card key={d.id} className="p-4">
                    <div className="flex justify-between mb-2">
                      <p className="font-semibold">#{d.id.slice(0, 8)}</p>
                      <Badge className={getStatusColor(d.status)}>{d.status.replace('_', ' ')}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{d.delivery_address}</p>
                    <div className="flex justify-between items-center mt-2">
                      <p className="font-bold text-primary">₦{d.delivery_fee}</p>
                      <p className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}</p>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}

          {activeTab === 'earnings' && (
            <div className="space-y-6">
              <Card className="bg-accent text-accent-foreground p-6 rounded-2xl">
                <div className="flex justify-between mb-4">
                  <p className="font-semibold">Available Balance</p>
                  <button onClick={() => setShowEarnings(!showEarnings)}>{showEarnings ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}</button>
                </div>
                <p className="text-4xl font-bold mb-4">{showEarnings ? `₦${mockEarnings.available.toLocaleString()}` : '₦•••••'}</p>
                <Button className="w-full bg-white/20 hover:bg-white/30 text-accent-foreground border-0">Withdraw</Button>
              </Card>
              <div className="grid grid-cols-2 gap-3">
                <Card className="p-4 text-center"><p className="font-bold">₦{mockEarnings.today.toLocaleString()}</p><p className="text-xs text-muted-foreground">Today</p></Card>
                <Card className="p-4 text-center"><p className="font-bold">₦{mockEarnings.week.toLocaleString()}</p><p className="text-xs text-muted-foreground">This Week</p></Card>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-4">
              <Card className="p-6"><div className="flex items-center gap-4"><div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center"><Bike className="w-8 h-8 text-accent" /></div><div><h2 className="font-bold text-xl">{profile?.full_name || 'Rider'}</h2><p className="text-muted-foreground">{profile?.phone}</p></div></div></Card>
              <Card className="p-4 cursor-pointer hover:bg-destructive/10" onClick={signOut}><div className="flex items-center gap-3 text-destructive"><LogOut className="w-5 h-5" /><span>Sign Out</span></div></Card>
            </div>
          )}
        </main>

        <nav className="fixed bottom-0 left-0 right-0 bg-card border-t z-50">
          <div className="flex justify-around py-2">
            {[
              { id: 'home', icon: Home, label: 'Home' }, 
              { id: 'deliveries', icon: Package, label: 'Deliveries' }, 
              { id: 'earnings', icon: DollarSign, label: 'Earnings' }, 
              { id: 'settings', icon: Settings, label: 'Settings' }
            ].map(tab => (
              <button 
                key={tab.id} 
                onClick={() => setActiveTab(tab.id as typeof activeTab)} 
                className={`flex flex-col items-center py-2 px-4 ${activeTab === tab.id ? 'text-accent' : 'text-muted-foreground'}`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="text-xs mt-1">{tab.label}</span>
              </button>
            ))}
          </div>
        </nav>
      </div>

      {selectedDelivery && (
        <PinVerificationSheet
          open={pinSheetOpen}
          onOpenChange={setPinSheetOpen}
          delivery={{
            id: selectedDelivery.id.slice(0, 8),
            buyer_name: 'Customer',
            buyer_phone: '08012345678',
            address: selectedDelivery.delivery_address,
            amount: selectedDelivery.delivery_fee
          }}
          onVerified={() => handlePinVerified(selectedDelivery.id)}
        />
      )}
    </>
  );
};

export default RiderDashboard;
