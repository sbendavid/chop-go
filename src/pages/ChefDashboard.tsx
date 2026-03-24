import { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useNotifications } from '@/hooks/useNotifications';
import { useChefRatings } from '@/hooks/useChefRatings';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { OrderChatSheet } from '@/components/chat/OrderChatSheet';
import { DishEditorModal } from '@/components/chef/DishEditorModal';
import { SteamShotUploader } from '@/components/steamshots/SteamShotUploader';
import NotificationPrompt from '@/components/NotificationPrompt';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  ChefHat, 
  Home,
  Package,
  Plus,
  DollarSign,
  Settings,
  Star,
  Clock,
  TrendingUp,
  Check,
  X,
  Edit,
  Trash2,
  Camera,
  LogOut,
  Eye,
  EyeOff,
  Banknote,
  Users,
  ArrowUp,
  ArrowDown,
  Bell,
  MessageCircle,
  HandCoins,
  Video,
  Timer
} from 'lucide-react';

interface ChefProfile {
  id: string;
  brand_name: string;
  specialty_tags: string[];
  bio: string | null;
  kitchen_open: boolean;
  rating: number;
  total_orders: number;
  commission_rate: number;
  advance_rate: number;
  kitchen_verified: boolean;
}

interface Dish {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string | null;
  prep_time_minutes: number;
  is_available: boolean;
}

interface Order {
  id: string;
  status: string;
  escrow_amount: number;
  created_at: string;
  delivery_address: string;
  delivery_landmark: string | null;
  buyer_id: string | null;
}

interface Haggle {
  id: string;
  dish_id: string;
  buyer_id: string;
  original_price_kobo: number;
  buyer_offer_kobo: number | null;
  chef_counter_kobo: number | null;
  buyer_slider_position: number | null;
  chef_slider_position: number | null;
  rounds: number | null;
  status: string;
  created_at: string;
  expires_at: string;
}

interface SteamShot {
  id: string;
  video_url: string;
  dish_id: string | null;
  view_count: number;
  expires_at: string;
  created_at: string;
}

const ChefDashboard = () => {
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();
  const { notifyNewOrder, notifyNewHaggle } = useNotifications();
  const [activeTab, setActiveTab] = useState<'home' | 'orders' | 'menu' | 'earnings' | 'settings'>('home');
  const [chefProfile, setChefProfile] = useState<ChefProfile | null>(null);
  const chefRatingStats = useChefRatings(chefProfile?.id || null);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [haggles, setHaggles] = useState<Haggle[]>([]);
  const [steamShots, setSteamShots] = useState<SteamShot[]>([]);
  const [loading, setLoading] = useState(true);
  const [kitchenOpen, setKitchenOpen] = useState(false);
  const [showEarnings, setShowEarnings] = useState(true);
  const [orderFilter, setOrderFilter] = useState<string>('All');
  const [newOrderCount, setNewOrderCount] = useState(0);
  const [newHaggleCount, setNewHaggleCount] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [dishEditorOpen, setDishEditorOpen] = useState(false);
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const [steamShotOpen, setSteamShotOpen] = useState(false);
  const [deletingSteamShotId, setDeletingSteamShotId] = useState<string | null>(null);

  const openChat = (orderId: string) => {
    setSelectedOrderId(orderId);
    setChatOpen(true);
  };

  // Mock data for earnings (will be real data later)
  const mockEarnings = {
    today: 28500,
    week: 156000,
    month: 487000,
    pending: 45000,
    available: 128000,
  };

  const loadChefData = useCallback(async () => {
    if (!user) return;

    const { data: chef } = await supabase
      .from('chef_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (chef) {
      setChefProfile(chef as ChefProfile);
      setKitchenOpen(chef.kitchen_open);

      // Fetch dishes
      const { data: dishesData } = await supabase
        .from('dishes')
        .select('*')
        .eq('chef_id', chef.id);

      if (dishesData) setDishes(dishesData as Dish[]);

      // Fetch orders assigned to this chef
      const { data: ordersData } = await supabase
        .from('orders')
        .select('*')
        .eq('chef_id', chef.id)
        .order('created_at', { ascending: false });

      if (ordersData) {
        setOrders(ordersData as Order[]);
        setNewOrderCount(ordersData.filter(o => o.status === 'pending').length);
      }

      // Fetch active steam shots
      const { data: steamShotsData } = await supabase
        .from('steam_shots')
        .select('*')
        .eq('chef_id', chef.id)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (steamShotsData) setSteamShots(steamShotsData as SteamShot[]);

      // Fetch active haggles
      const { data: hagglesData } = await supabase
        .from('haggles')
        .select('*')
        .eq('chef_id', chef.id)
        .in('status', ['pending', 'countered'])
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (hagglesData) {
        setHaggles(hagglesData as Haggle[]);
        setNewHaggleCount(hagglesData.filter(h => h.status === 'pending').length);
      }
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadChefData();
  }, [loadChefData]);

  // Real-time order subscription
  useEffect(() => {
    if (!chefProfile) return;

    const channel = supabase
      .channel('chef-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `chef_id=eq.${chefProfile.id}`
        },
        (payload) => {
          console.log('Order update:', payload);
          if (payload.eventType === 'INSERT') {
            const newOrder = payload.new as Order;
            setOrders(prev => [newOrder, ...prev]);
            setNewOrderCount(prev => prev + 1);
            toast({
              title: '🔔 New Order!',
              description: `Order for ₦${newOrder.escrow_amount.toLocaleString()} received`,
            });
            // Send browser notification
            notifyNewOrder(newOrder.escrow_amount, newOrder.id);
          } else if (payload.eventType === 'UPDATE') {
            setOrders(prev => prev.map(o => o.id === payload.new.id ? payload.new as Order : o));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chefProfile, toast, notifyNewOrder]);

  // Real-time haggle subscription
  useEffect(() => {
    if (!chefProfile) return;

    const channel = supabase
      .channel('chef-haggles')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'haggles',
          filter: `chef_id=eq.${chefProfile.id}`
        },
        async (payload) => {
          console.log('New haggle:', payload);
          const newHaggle = payload.new as Haggle;
          setHaggles(prev => [newHaggle, ...prev]);
          setNewHaggleCount(prev => prev + 1);
          
          // Find dish name
          const dish = dishes.find(d => d.id === newHaggle.dish_id);
          const dishName = dish?.name || 'a dish';
          const offerAmount = newHaggle.buyer_offer_kobo ? newHaggle.buyer_offer_kobo / 100 : newHaggle.original_price_kobo / 100;
          
          toast({
            title: '🤝 New Haggle Request!',
            description: `Someone wants to negotiate on "${dishName}"`,
          });
          
          // Send browser notification
          notifyNewHaggle(dishName, offerAmount, newHaggle.id);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'haggles',
          filter: `chef_id=eq.${chefProfile.id}`
        },
        (payload) => {
          setHaggles(prev => prev.map(h => h.id === payload.new.id ? payload.new as Haggle : h));
          if (payload.new.status !== 'pending') {
            setNewHaggleCount(prev => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chefProfile, dishes, toast, notifyNewHaggle]);

  const toggleKitchen = async () => {
    if (!chefProfile) return;

    const newStatus = !kitchenOpen;
    setKitchenOpen(newStatus);

    const { error } = await supabase
      .from('chef_profiles')
      .update({ kitchen_open: newStatus })
      .eq('id', chefProfile.id);

    if (error) {
      setKitchenOpen(!newStatus);
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
    } else {
      toast({ 
        title: newStatus ? '🍳 Kitchen is Open!' : '😴 Kitchen Closed',
        description: newStatus ? 'Customers can now order from you' : 'You won\'t receive new orders'
      });
    }
  };

  const handleOrderAction = async (orderId: string, action: 'accept' | 'decline' | 'preparing' | 'ready') => {
    const statusMap = {
      accept: 'accepted',
      decline: 'cancelled',
      preparing: 'preparing',
      ready: 'ready'
    };

    const { error } = await supabase
      .from('orders')
      .update({ status: statusMap[action] })
      .eq('id', orderId);

    if (error) {
      toast({ title: 'Error', description: 'Failed to update order', variant: 'destructive' });
    } else {
      setOrders(prev => prev.map(o => 
        o.id === orderId ? { ...o, status: statusMap[action] } : o
      ));
      if (action === 'accept' || action === 'decline') {
        setNewOrderCount(prev => Math.max(0, prev - 1));
      }
      
      const messages = {
        accept: '✅ Order accepted! Start preparing.',
        decline: '❌ Order declined.',
        preparing: '🍳 Marked as preparing',
        ready: '✨ Order ready for pickup!'
      };
      toast({ title: messages[action] });
    }
  };

  const toggleDishAvailability = async (dishId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('dishes')
      .update({ is_available: !currentStatus })
      .eq('id', dishId);

    if (error) {
      toast({ title: 'Error', description: 'Failed to update dish', variant: 'destructive' });
    } else {
      setDishes(prev => prev.map(d => 
        d.id === dishId ? { ...d, is_available: !currentStatus } : d
      ));
    }
  };

  const openDishEditor = (dish: Dish | null = null) => {
    setSelectedDish(dish);
    setDishEditorOpen(true);
  };

  const handleDishSaved = () => {
    loadChefData();
  };

  const handleDeleteDish = async (dishId: string) => {
    const { error } = await supabase
      .from('dishes')
      .delete()
      .eq('id', dishId);

    if (error) {
      toast({ title: 'Error', description: 'Failed to delete dish', variant: 'destructive' });
    } else {
      setDishes(prev => prev.filter(d => d.id !== dishId));
      toast({ title: 'Dish deleted' });
    }
  };

  const handleDeleteSteamShot = async (shotId: string) => {
    const { error } = await supabase
      .from('steam_shots')
      .delete()
      .eq('id', shotId);

    if (error) {
      toast({ title: 'Error', description: 'Failed to delete Steam Shot', variant: 'destructive' });
    } else {
      setSteamShots(prev => prev.filter(s => s.id !== shotId));
      toast({ title: 'Steam Shot deleted' });
    }
  };

  const handleHaggleAction = async (haggleId: string, action: 'accept' | 'decline', counterOfferKobo?: number) => {
    const haggle = haggles.find(h => h.id === haggleId);
    if (!haggle) return;

    if (action === 'accept') {
      // Accept the buyer's offer
      const finalPrice = haggle.buyer_offer_kobo || haggle.original_price_kobo;
      const { error } = await supabase
        .from('haggles')
        .update({ 
          status: 'accepted',
          final_price_kobo: finalPrice
        })
        .eq('id', haggleId);

      if (error) {
        toast({ title: 'Error', description: 'Failed to accept offer', variant: 'destructive' });
      } else {
        setHaggles(prev => prev.filter(h => h.id !== haggleId));
        setNewHaggleCount(prev => Math.max(0, prev - 1));
        toast({ 
          title: '✅ Offer Accepted!',
          description: `Deal closed at ₦${(finalPrice / 100).toLocaleString()}`
        });
      }
    } else if (action === 'decline') {
      const { error } = await supabase
        .from('haggles')
        .update({ status: 'rejected' })
        .eq('id', haggleId);

      if (error) {
        toast({ title: 'Error', description: 'Failed to decline offer', variant: 'destructive' });
      } else {
        setHaggles(prev => prev.filter(h => h.id !== haggleId));
        setNewHaggleCount(prev => Math.max(0, prev - 1));
        toast({ title: '❌ Offer Declined' });
      }
    }
  };

  const handleCounterOffer = async (haggleId: string, counterOfferKobo: number) => {
    const haggle = haggles.find(h => h.id === haggleId);
    if (!haggle) return;

    const { error } = await supabase
      .from('haggles')
      .update({ 
        status: 'countered',
        chef_counter_kobo: counterOfferKobo,
        chef_slider_position: ((counterOfferKobo / haggle.original_price_kobo) * 100),
        rounds: (haggle.rounds || 1) + 1
      })
      .eq('id', haggleId);

    if (error) {
      toast({ title: 'Error', description: 'Failed to send counter offer', variant: 'destructive' });
    } else {
      setHaggles(prev => prev.map(h => 
        h.id === haggleId 
          ? { ...h, status: 'countered', chef_counter_kobo: counterOfferKobo, rounds: (h.rounds || 1) + 1 }
          : h
      ));
      toast({ 
        title: '💬 Counter Offer Sent!',
        description: `You offered ₦${(counterOfferKobo / 100).toLocaleString()}`
      });
    }
  };

  const getDishName = (dishId: string) => {
    return dishes.find(d => d.id === dishId)?.name || 'Unknown Dish';
  };

  const getHaggleTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffMs = expiry.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Expired';
    
    const minutes = Math.floor(diffMs / (1000 * 60));
    if (minutes < 60) return `${minutes}m left`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m left`;
  };

  const getFilteredOrders = () => {
    if (orderFilter === 'All') return orders;
    return orders.filter(o => o.status.toLowerCase() === orderFilter.toLowerCase());
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-accent/20 text-accent-foreground';
      case 'accepted': return 'bg-blue-500/20 text-blue-700 dark:text-blue-300';
      case 'preparing': return 'bg-primary/20 text-primary';
      case 'ready': return 'bg-secondary/20 text-secondary';
      case 'delivered': return 'bg-green-500/20 text-green-700 dark:text-green-300';
      case 'cancelled': return 'bg-destructive/20 text-destructive';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffMs = expiry.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Expired';
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <>
      <Helmet>
        <title>Chef Dashboard | Chop Market</title>
      </Helmet>

      <div className="min-h-screen bg-background pb-20">
        {/* Header */}
        <header className="bg-secondary text-secondary-foreground sticky top-0 z-40">
          <div className="container py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <ChefHat className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="font-display font-bold">{chefProfile?.brand_name || "Your Kitchen"}</h1>
                  <div className="flex items-center gap-2 text-sm text-white/70">
                    <Star className="w-3 h-3 fill-accent text-accent" />
                    <span>{chefRatingStats.averageRating > 0 ? chefRatingStats.averageRating : (chefProfile?.rating || 'New')}</span>
                    <span>•</span>
                    <span>{chefRatingStats.reviewCount > 0 ? `${chefRatingStats.reviewCount} reviews` : `${chefProfile?.total_orders || 0} orders`}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  variant="ghost"
                  className="bg-white/10 hover:bg-white/20 text-white"
                  onClick={() => setSteamShotOpen(true)}
                >
                  <Video className="w-4 h-4 mr-1" />
                  Steam Shot
                </Button>
                <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5">
                  <span className="text-sm">{kitchenOpen ? 'Open' : 'Closed'}</span>
                  <Switch checked={kitchenOpen} onCheckedChange={toggleKitchen} />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container py-6">
          {activeTab === 'home' && (
            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Package className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length}</p>
                      <p className="text-sm text-muted-foreground">Active Orders</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-secondary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">₦{mockEarnings.today.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">Today's Sales</p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Active Steam Shots */}
              {steamShots.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-display font-semibold text-lg flex items-center gap-2">
                      <Video className="w-5 h-5 text-primary" />
                      Your Steam Shots
                    </h2>
                    <Badge variant="secondary">{steamShots.length} active</Badge>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {steamShots.map(shot => (
                      <Card key={shot.id} className="flex-shrink-0 w-32 overflow-hidden">
                        <div className="relative aspect-[9/16] bg-muted">
                          <video
                            src={shot.video_url}
                            className="w-full h-full object-cover"
                            muted
                            playsInline
                            onMouseEnter={(e) => e.currentTarget.play()}
                            onMouseLeave={(e) => {
                              e.currentTarget.pause();
                              e.currentTarget.currentTime = 0;
                            }}
                          />
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                            <div className="flex items-center gap-1 text-white text-xs">
                              <Eye className="w-3 h-3" />
                              <span>{shot.view_count}</span>
                            </div>
                          </div>
                        </div>
                        <div className="p-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Timer className="w-3 h-3" />
                              <span>{getTimeRemaining(shot.expires_at)}</span>
                            </div>
                            <button
                              onClick={() => setDeletingSteamShotId(shot.id)}
                              className="p-1 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                              title="Delete Steam Shot"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </Card>
                    ))}
                    <button
                      onClick={() => setSteamShotOpen(true)}
                      className="flex-shrink-0 w-32 aspect-[9/16] border-2 border-dashed border-muted-foreground/25 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-primary/50 transition-colors"
                    >
                      <Plus className="w-6 h-6 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Add New</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Pending Orders */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-display font-semibold text-lg flex items-center gap-2">
                    New Orders
                    {newOrderCount > 0 && (
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
                      </span>
                    )}
                  </h2>
                  <Badge variant="destructive">{orders.filter(o => o.status === 'pending').length} pending</Badge>
                </div>
                <div className="space-y-3">
                  {orders.filter(o => o.status === 'pending').length === 0 ? (
                    <Card className="p-6 text-center text-muted-foreground">
                      <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No new orders</p>
                    </Card>
                  ) : (
                    orders.filter(o => o.status === 'pending').map(order => (
                      <Card key={order.id} className="p-4 border-l-4 border-l-accent animate-pulse-slow">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="font-semibold">Order #{order.id.slice(0, 8)}</p>
                            <p className="text-sm text-muted-foreground">{order.delivery_address}</p>
                            {order.delivery_landmark && (
                              <p className="text-xs text-muted-foreground">📍 {order.delivery_landmark}</p>
                            )}
                          </div>
                          <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                        </div>
                        <p className="font-bold text-lg text-primary mb-3">₦{order.escrow_amount.toLocaleString()}</p>
                        <div className="flex gap-2">
                          <Button 
                            className="flex-1" 
                            size="sm"
                            onClick={() => handleOrderAction(order.id, 'accept')}
                          >
                            <Check className="w-4 h-4 mr-1" /> Accept
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleOrderAction(order.id, 'decline')}
                          >
                            <X className="w-4 h-4 mr-1" /> Decline
                          </Button>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </div>

              {/* Active Haggles */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-display font-semibold text-lg flex items-center gap-2">
                    <HandCoins className="w-5 h-5 text-accent" />
                    Haggle Requests
                    {newHaggleCount > 0 && (
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-accent"></span>
                      </span>
                    )}
                  </h2>
                  {haggles.length > 0 && (
                    <Badge variant="outline" className="border-accent text-accent">
                      {haggles.length} active
                    </Badge>
                  )}
                </div>
                <div className="space-y-3">
                  {haggles.length === 0 ? (
                    <Card className="p-6 text-center text-muted-foreground">
                      <HandCoins className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No haggle requests</p>
                      <p className="text-xs mt-1">Buyers can negotiate prices on your dishes</p>
                    </Card>
                  ) : (
                    haggles.map(haggle => {
                      const originalPrice = haggle.original_price_kobo / 100;
                      const buyerOffer = haggle.buyer_offer_kobo ? haggle.buyer_offer_kobo / 100 : originalPrice;
                      const discount = Math.round(((originalPrice - buyerOffer) / originalPrice) * 100);
                      const minAcceptable = originalPrice * 0.7; // 30% max discount
                      
                      return (
                        <Card key={haggle.id} className="p-4 border-l-4 border-l-accent">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="font-semibold">{getDishName(haggle.dish_id)}</p>
                              <p className="text-xs text-muted-foreground">
                                Round {haggle.rounds || 1} • {getHaggleTimeRemaining(haggle.expires_at)}
                              </p>
                            </div>
                            <Badge 
                              variant={haggle.status === 'pending' ? 'default' : 'secondary'}
                              className={haggle.status === 'pending' ? 'bg-accent' : ''}
                            >
                              {haggle.status === 'pending' ? 'New Offer' : 'Awaiting Buyer'}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                            <div className="bg-muted/50 rounded-lg p-2">
                              <p className="text-xs text-muted-foreground">Your Price</p>
                              <p className="font-semibold">₦{originalPrice.toLocaleString()}</p>
                            </div>
                            <div className="bg-accent/10 rounded-lg p-2">
                              <p className="text-xs text-muted-foreground">Their Offer</p>
                              <p className="font-bold text-accent">₦{buyerOffer.toLocaleString()}</p>
                            </div>
                            <div className={`rounded-lg p-2 ${discount > 20 ? 'bg-destructive/10' : 'bg-green-500/10'}`}>
                              <p className="text-xs text-muted-foreground">Discount</p>
                              <p className={`font-semibold ${discount > 20 ? 'text-destructive' : 'text-green-600'}`}>
                                {discount}% off
                              </p>
                            </div>
                          </div>

                          {haggle.chef_counter_kobo && (
                            <div className="mb-3 p-2 bg-secondary/10 rounded-lg">
                              <p className="text-xs text-muted-foreground">Your Last Counter</p>
                              <p className="font-semibold text-secondary">
                                ₦{(haggle.chef_counter_kobo / 100).toLocaleString()}
                              </p>
                            </div>
                          )}

                          {haggle.status === 'pending' && (
                            <div className="space-y-3">
                              <div className="flex gap-2">
                                <Button 
                                  className="flex-1" 
                                  size="sm"
                                  onClick={() => handleHaggleAction(haggle.id, 'accept')}
                                >
                                  <Check className="w-4 h-4 mr-1" /> Accept ₦{buyerOffer.toLocaleString()}
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleHaggleAction(haggle.id, 'decline')}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  placeholder={`Counter (min ₦${minAcceptable.toLocaleString()})`}
                                  className="flex-1 text-sm"
                                  min={minAcceptable}
                                  max={originalPrice}
                                  id={`counter-${haggle.id}`}
                                />
                                <Button 
                                  variant="secondary" 
                                  size="sm"
                                  onClick={() => {
                                    const input = document.getElementById(`counter-${haggle.id}`) as HTMLInputElement;
                                    const value = parseFloat(input?.value || '0') * 100;
                                    if (value >= minAcceptable * 100 && value <= haggle.original_price_kobo) {
                                      handleCounterOffer(haggle.id, value);
                                    } else {
                                      toast({ 
                                        title: 'Invalid counter', 
                                        description: `Enter between ₦${minAcceptable.toLocaleString()} and ₦${originalPrice.toLocaleString()}`,
                                        variant: 'destructive'
                                      });
                                    }
                                  }}
                                >
                                  Counter
                                </Button>
                              </div>
                            </div>
                          )}

                          {haggle.status === 'countered' && (
                            <p className="text-sm text-muted-foreground text-center py-2">
                              Waiting for buyer response...
                            </p>
                          )}
                        </Card>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Active Orders */}
              <div>
                <h2 className="font-display font-semibold text-lg mb-3">In Progress</h2>
                <div className="space-y-3">
                  {orders.filter(o => ['preparing', 'accepted', 'ready'].includes(o.status)).length === 0 ? (
                    <Card className="p-6 text-center text-muted-foreground">
                      <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No active orders</p>
                    </Card>
                  ) : (
                    orders.filter(o => ['preparing', 'accepted', 'ready'].includes(o.status)).map(order => (
                      <Card key={order.id} className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-semibold">Order #{order.id.slice(0, 8)}</p>
                            <p className="text-sm text-muted-foreground">{order.delivery_address}</p>
                          </div>
                          <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-primary">₦{order.escrow_amount.toLocaleString()}</p>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" onClick={() => openChat(order.id)}>
                              <MessageCircle className="w-4 h-4" />
                            </Button>
                            {order.status === 'accepted' && (
                              <Button size="sm" onClick={() => handleOrderAction(order.id, 'preparing')}>
                                Start Preparing
                              </Button>
                            )}
                            {order.status === 'preparing' && (
                              <Button size="sm" variant="secondary" onClick={() => handleOrderAction(order.id, 'ready')}>
                                <Check className="w-4 h-4 mr-1" /> Mark Ready
                              </Button>
                            )}
                            {order.status === 'ready' && (
                              <Badge variant="outline" className="animate-pulse">Awaiting Pickup</Badge>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="space-y-4">
              <h2 className="font-display font-bold text-xl">All Orders</h2>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {['All', 'Pending', 'Accepted', 'Preparing', 'Ready', 'Delivered', 'Cancelled'].map(filter => (
                  <Badge 
                    key={filter} 
                    variant={orderFilter === filter ? 'default' : 'secondary'} 
                    className="cursor-pointer whitespace-nowrap"
                    onClick={() => setOrderFilter(filter)}
                  >
                    {filter}
                  </Badge>
                ))}
              </div>
              <div className="space-y-3">
                {getFilteredOrders().length === 0 ? (
                  <Card className="p-6 text-center text-muted-foreground">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No orders found</p>
                  </Card>
                ) : (
                  getFilteredOrders().map(order => (
                    <Card key={order.id} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-semibold">Order #{order.id.slice(0, 8)}</p>
                          <p className="text-sm text-muted-foreground">{order.delivery_address}</p>
                        </div>
                        <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-primary">₦{order.escrow_amount.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(order.created_at).toLocaleString()}
                        </p>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'menu' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-bold text-xl">Your Menu</h2>
                <Button size="sm" onClick={() => openDishEditor(null)}>
                  <Plus className="w-4 h-4 mr-1" /> Add Dish
                </Button>
              </div>
              <div className="space-y-3">
                {dishes.length === 0 ? (
                  <Card className="p-6 text-center text-muted-foreground">
                    <Camera className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No dishes yet. Add your first dish!</p>
                  </Card>
                ) : dishes.map(dish => (
                  <Card key={dish.id} className="p-4">
                    <div className="flex gap-4">
                      <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Camera className="w-6 h-6 text-muted-foreground/50" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold">{dish.name}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-2">{dish.description}</p>
                          </div>
                          <Switch 
                            checked={dish.is_available} 
                            onCheckedChange={() => toggleDishAvailability(dish.id, dish.is_available)}
                          />
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary">
                            <Clock className="w-3 h-3 mr-1" /> {dish.prep_time_minutes}min
                          </Badge>
                          {dish.category && <Badge variant="outline">{dish.category}</Badge>}
                          <span className="font-bold text-primary">₦{dish.price.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3 pt-3 border-t">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => openDishEditor(dish)}>
                        <Edit className="w-4 h-4 mr-1" /> Edit
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteDish(dish.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'earnings' && (
            <div className="space-y-6">
              {/* Balance Card */}
              <Card className="bg-secondary text-secondary-foreground p-6 rounded-2xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                      <Banknote className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-white/70 text-sm">Available Balance</p>
                      <p className="font-semibold">Ready to withdraw</p>
                    </div>
                  </div>
                  <button onClick={() => setShowEarnings(!showEarnings)} className="p-2 bg-white/20 rounded-lg">
                    {showEarnings ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-4xl font-bold mb-2">
                  {showEarnings ? `₦${mockEarnings.available.toLocaleString()}` : '₦•••••'}
                </p>
                <p className="text-white/60 text-sm mb-4">
                  ₦{mockEarnings.pending.toLocaleString()} pending release
                </p>
                <Button className="w-full bg-white/20 hover:bg-white/30 text-white border-0">
                  Withdraw to Bank
                </Button>
              </Card>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <Card className="p-4 text-center">
                  <p className="text-lg font-bold">₦{(mockEarnings.today / 1000).toFixed(0)}k</p>
                  <p className="text-xs text-muted-foreground">Today</p>
                </Card>
                <Card className="p-4 text-center">
                  <p className="text-lg font-bold">₦{(mockEarnings.week / 1000).toFixed(0)}k</p>
                  <p className="text-xs text-muted-foreground">This Week</p>
                </Card>
                <Card className="p-4 text-center">
                  <p className="text-lg font-bold">₦{(mockEarnings.month / 1000).toFixed(0)}k</p>
                  <p className="text-xs text-muted-foreground">This Month</p>
                </Card>
              </div>

              {/* Advance Rate */}
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">Ingredient Advance</p>
                    <p className="text-sm text-muted-foreground">Get paid upfront for ingredients</p>
                  </div>
                  <Badge variant="secondary" className="text-lg">
                    {chefProfile?.advance_rate || 0}%
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Complete 21+ orders with 4.0+ rating to unlock 40% advance
                </p>
              </Card>

              {/* Recent Payouts */}
              <div>
                <h3 className="font-display font-semibold mb-3">Recent Transactions</h3>
                <div className="space-y-3">
                  {[
                    { name: 'Order #CM-2847', amount: 4675, type: 'credit', date: 'Today' },
                    { name: 'Withdrawal', amount: -50000, type: 'debit', date: 'Yesterday' },
                    { name: 'Order #CM-2845', amount: 3400, type: 'credit', date: 'Dec 24' },
                  ].map((tx, i) => (
                    <Card key={i} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${tx.type === 'credit' ? 'bg-secondary/10' : 'bg-destructive/10'}`}>
                            {tx.type === 'credit' ? <ArrowDown className="w-4 h-4 text-secondary" /> : <ArrowUp className="w-4 h-4 text-destructive" />}
                          </div>
                          <div>
                            <p className="font-medium">{tx.name}</p>
                            <p className="text-sm text-muted-foreground">{tx.date}</p>
                          </div>
                        </div>
                        <p className={`font-bold ${tx.type === 'credit' ? 'text-secondary' : 'text-destructive'}`}>
                          {tx.type === 'credit' ? '+' : ''}₦{Math.abs(tx.amount).toLocaleString()}
                        </p>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <Card className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center">
                    <ChefHat className="w-8 h-8 text-secondary" />
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-xl">{chefProfile?.brand_name || "Your Kitchen"}</h2>
                    <p className="text-muted-foreground">{profile?.phone || user?.email}</p>
                    {chefProfile?.kitchen_verified && (
                      <Badge variant="secondary" className="mt-1">✓ Verified Kitchen</Badge>
                    )}
                  </div>
                </div>
              </Card>

              <div>
                <h3 className="font-semibold mb-3">Specialty Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {(chefProfile?.specialty_tags || ['Jollof Expert', 'Party Size', 'Afang Specialist']).map(tag => (
                    <Badge key={tag} variant="secondary">{tag}</Badge>
                  ))}
                  <Badge variant="outline" className="cursor-pointer">
                    <Plus className="w-3 h-3 mr-1" /> Add
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                {[
                  { label: 'Bank Account', icon: Banknote },
                  { label: 'Commission Rate', icon: DollarSign, value: `${chefProfile?.commission_rate || 15}%` },
                  { label: 'Kitchen Verification', icon: Settings },
                ].map(item => (
                  <Card key={item.label} className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <item.icon className="w-5 h-5 text-muted-foreground" />
                        <span>{item.label}</span>
                      </div>
                      {item.value && <span className="text-muted-foreground">{item.value}</span>}
                    </div>
                  </Card>
                ))}
                <Card className="p-4 cursor-pointer hover:bg-destructive/10 transition-colors" onClick={signOut}>
                  <div className="flex items-center gap-3 text-destructive">
                    <LogOut className="w-5 h-5" />
                    <span>Sign Out</span>
                  </div>
                </Card>
              </div>
            </div>
          )}
        </main>

        {/* Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
          <div className="flex justify-around py-2">
            {[
              { id: 'home', icon: Home, label: 'Home' },
              { id: 'orders', icon: Package, label: 'Orders' },
              { id: 'menu', icon: ChefHat, label: 'Menu' },
              { id: 'earnings', icon: DollarSign, label: 'Earnings' },
              { id: 'settings', icon: Settings, label: 'Settings' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex flex-col items-center py-2 px-4 ${
                  activeTab === tab.id ? 'text-secondary' : 'text-muted-foreground'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="text-xs mt-1">{tab.label}</span>
              </button>
            ))}
          </div>
        </nav>
      </div>

      {selectedOrderId && (
        <OrderChatSheet
          open={chatOpen}
          onOpenChange={setChatOpen}
          orderId={selectedOrderId}
          userRole="chef"
          otherPartyName="Buyer"
        />
      )}

      {chefProfile && (
        <DishEditorModal
          open={dishEditorOpen}
          onOpenChange={setDishEditorOpen}
          dish={selectedDish}
          chefId={chefProfile.id}
          onSaved={handleDishSaved}
        />
      )}

      {chefProfile && user && (
        <SteamShotUploader
          isOpen={steamShotOpen}
          onClose={() => setSteamShotOpen(false)}
          chefId={chefProfile.id}
          userId={user.id}
        />
      )}

      <NotificationPrompt />

      {/* Delete Steam Shot Confirmation */}
      <AlertDialog open={!!deletingSteamShotId} onOpenChange={(open) => !open && setDeletingSteamShotId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Steam Shot?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this Steam Shot. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deletingSteamShotId) {
                  handleDeleteSteamShot(deletingSteamShotId);
                  setDeletingSteamShotId(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ChefDashboard;
