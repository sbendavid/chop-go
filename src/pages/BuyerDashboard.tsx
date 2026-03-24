import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import CheckoutSheet from '@/components/checkout/CheckoutSheet';
import OrderTracker from '@/components/order/OrderTracker';
import BecomeChefModal from '@/components/chef/BecomeChefModal';
import NotificationPrompt from '@/components/NotificationPrompt';
import { 
  Home, 
  Search, 
  ShoppingCart, 
  User, 
  Wallet,
  MapPin,
  Star,
  Clock,
  Plus,
  Minus,
  ChefHat,
  ArrowRight,
  Lock,
  Eye,
  EyeOff,
  Gift,
  Bell,
  LogOut,
  Package,
  BellRing
} from 'lucide-react';

interface Dish {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string | null;
  prep_time_minutes: number;
  chef_profiles: {
    brand_name: string;
    rating: number;
  } | null;
}

interface CartItem {
  dish: Dish;
  quantity: number;
}

const BuyerDashboard = () => {
  const { user, profile, signOut } = useAuth();
  const { notifyOrderStatusChange, permission, requestPermission } = useNotifications();
  const [activeTab, setActiveTab] = useState<'home' | 'search' | 'cart' | 'orders' | 'profile'>('home');
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showBalance, setShowBalance] = useState(true);
  const [loading, setLoading] = useState(true);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [becomeChefOpen, setBecomeChefOpen] = useState(false);

  // Real-time order status subscription for notifications
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('buyer-order-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `buyer_id=eq.${user.id}`
        },
        (payload) => {
          const newStatus = payload.new.status as string;
          const orderId = payload.new.id as string;
          console.log('Order status update:', newStatus);
          notifyOrderStatusChange(orderId, newStatus);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, notifyOrderStatusChange]);

  // Mock wallet balance
  const walletBalance = 45750;

  useEffect(() => {
    fetchDishes();
  }, []);

  const fetchDishes = async () => {
    const { data, error } = await supabase
      .from('dishes')
      .select(`
        *,
        chef_profiles (
          brand_name,
          rating
        )
      `)
      .eq('is_available', true)
      .limit(20);

    if (!error && data) {
      setDishes(data as Dish[]);
    }
    setLoading(false);
  };

  const addToCart = (dish: Dish) => {
    setCart(prev => {
      const existing = prev.find(item => item.dish.id === dish.id);
      if (existing) {
        return prev.map(item =>
          item.dish.id === dish.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { dish, quantity: 1 }];
    });
  };

  const removeFromCart = (dishId: string) => {
    setCart(prev => {
      const existing = prev.find(item => item.dish.id === dishId);
      if (existing && existing.quantity > 1) {
        return prev.map(item =>
          item.dish.id === dishId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        );
      }
      return prev.filter(item => item.dish.id !== dishId);
    });
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.dish.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const filteredDishes = dishes.filter(dish =>
    dish.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dish.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Mock dishes for display when DB is empty
  const mockDishes: Dish[] = [
    { id: '1', name: 'Jollof Rice & Chicken', description: 'Classic party jollof with grilled chicken', price: 3500, image_url: null, category: 'Rice', prep_time_minutes: 45, chef_profiles: { brand_name: "Mama Titi's Kitchen", rating: 4.8 } },
    { id: '2', name: 'Egusi Soup with Pounded Yam', description: 'Rich egusi with assorted meat', price: 4500, image_url: null, category: 'Soups', prep_time_minutes: 60, chef_profiles: { brand_name: 'Chef Emeka', rating: 4.9 } },
    { id: '3', name: 'Suya Platter', description: 'Spicy grilled beef with onions', price: 2500, image_url: null, category: 'Grills', prep_time_minutes: 30, chef_profiles: { brand_name: 'Mallam Suya', rating: 4.7 } },
    { id: '4', name: 'Fried Rice Special', description: 'Nigerian style fried rice with prawns', price: 4000, image_url: null, category: 'Rice', prep_time_minutes: 40, chef_profiles: { brand_name: "Mama Titi's Kitchen", rating: 4.8 } },
  ];

  const displayDishes = dishes.length > 0 ? filteredDishes : mockDishes;

  return (
    <>
      <Helmet>
        <title>Home | Chop Market</title>
      </Helmet>

      <div className="min-h-screen bg-background pb-20">
        {/* Header */}
        <header className="bg-card border-b border-border sticky top-0 z-40">
          <div className="container py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Good afternoon 👋</p>
                <h1 className="font-display font-bold text-foreground">
                  {profile?.full_name || 'Foodie'}
                </h1>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
                </Button>
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container py-6">
          {activeTab === 'home' && (
            <div className="space-y-6">
              {/* Location */}
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="text-sm">Delivering to: <strong className="text-foreground">Lekki Phase 1</strong></span>
              </div>

              {/* Quick Wallet Card */}
              <Card className="bg-escrow-gradient text-white p-4 rounded-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/70 text-sm">Escrow Balance</p>
                    <p className="text-2xl font-bold">
                      {showBalance ? `₦${walletBalance.toLocaleString()}` : '₦•••••'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setShowBalance(!showBalance)} className="p-2 bg-white/20 rounded-lg">
                      {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <Lock className="w-5 h-5" />
                  </div>
                </div>
              </Card>

              {/* Categories */}
              <div>
                <h2 className="font-display font-semibold text-lg mb-3">Categories</h2>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {['All', 'Rice', 'Soups', 'Grills', 'Snacks', 'Drinks'].map(cat => (
                    <Badge key={cat} variant={cat === 'All' ? 'default' : 'secondary'} className="cursor-pointer whitespace-nowrap">
                      {cat}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Featured Dishes */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-display font-semibold text-lg">Popular Near You</h2>
                  <Button variant="ghost" size="sm" className="text-primary">See all</Button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {displayDishes.slice(0, 4).map(dish => (
                    <Card key={dish.id} className="overflow-hidden">
                      <div className="aspect-square bg-muted relative">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <ChefHat className="w-12 h-12 text-muted-foreground/30" />
                        </div>
                        <Badge className="absolute top-2 right-2 bg-white/90 text-foreground">
                          <Star className="w-3 h-3 text-accent mr-1 fill-accent" />
                          {dish.chef_profiles?.rating || 4.5}
                        </Badge>
                      </div>
                      <div className="p-3">
                        <h3 className="font-semibold text-sm truncate">{dish.name}</h3>
                        <p className="text-xs text-muted-foreground truncate">{dish.chef_profiles?.brand_name}</p>
                        <div className="flex items-center justify-between mt-2">
                          <p className="font-bold text-primary">₦{dish.price.toLocaleString()}</p>
                          <Button size="icon" className="h-8 w-8" onClick={() => addToCart(dish)}>
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'search' && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Search for dishes, cuisines..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="space-y-3">
                {displayDishes.map(dish => (
                  <Card key={dish.id} className="p-4">
                    <div className="flex gap-4">
                      <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <ChefHat className="w-8 h-8 text-muted-foreground/30" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{dish.name}</h3>
                        <p className="text-sm text-muted-foreground truncate">{dish.chef_profiles?.brand_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            {dish.prep_time_minutes}min
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            <Star className="w-3 h-3 mr-1 fill-accent text-accent" />
                            {dish.chef_profiles?.rating || 4.5}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">₦{dish.price.toLocaleString()}</p>
                        <Button size="sm" className="mt-2" onClick={() => addToCart(dish)}>
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'cart' && (
            <div className="space-y-4">
              <h2 className="font-display font-bold text-xl">Your Cart</h2>
              {cart.length === 0 ? (
                <Card className="p-8 text-center">
                  <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Your cart is empty</p>
                  <Button className="mt-4" onClick={() => setActiveTab('home')}>
                    Browse Dishes
                  </Button>
                </Card>
              ) : (
                <>
                  {cart.map(item => (
                    <Card key={item.dish.id} className="p-4">
                      <div className="flex gap-4">
                        <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <ChefHat className="w-6 h-6 text-muted-foreground/30" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold">{item.dish.name}</h3>
                          <p className="text-sm text-muted-foreground">{item.dish.chef_profiles?.brand_name}</p>
                          <p className="font-bold text-primary">₦{item.dish.price.toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => removeFromCart(item.dish.id)}>
                            <Minus className="w-4 h-4" />
                          </Button>
                          <span className="font-semibold w-6 text-center">{item.quantity}</span>
                          <Button size="icon" className="h-8 w-8" onClick={() => addToCart(item.dish)}>
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}

                  <Card className="p-4 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>₦{cartTotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Delivery Fee</span>
                      <span>₦500</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Service Fee (5%)</span>
                      <span>₦{Math.round(cartTotal * 0.05).toLocaleString()}</span>
                    </div>
                    <div className="border-t pt-3 flex justify-between font-bold">
                      <span>Total</span>
                      <span className="text-primary">₦{(cartTotal + 500 + Math.round(cartTotal * 0.05)).toLocaleString()}</span>
                    </div>
                  </Card>

                  <Button variant="hero" className="w-full" size="lg" onClick={() => setCheckoutOpen(true)}>
                    Pay with Escrow
                    <Lock className="w-4 h-4 ml-2" />
                  </Button>
                </>
              )}
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="space-y-4">
              <h2 className="font-display font-bold text-xl">Your Orders</h2>
              {user && <OrderTracker userId={user.id} />}
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="space-y-6">
              <Card className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-xl">{profile?.full_name || 'User'}</h2>
                    <p className="text-muted-foreground">{profile?.phone || user?.email}</p>
                    <Badge variant="secondary" className="mt-1">
                      <Gift className="w-3 h-3 mr-1" />
                      250 ChopCoins
                    </Badge>
                  </div>
                </div>
              </Card>

              <div className="space-y-2">
                {[
                  { label: 'My Orders', icon: ShoppingCart, onClick: () => setActiveTab('orders') },
                  { label: 'Saved Addresses', icon: MapPin },
                  { label: 'Become a Chef', icon: ChefHat, onClick: () => setBecomeChefOpen(true) },
                  { label: 'Notifications', icon: Bell },
                  { label: 'Help & Support', icon: Gift },
                ].map(item => (
                  <Card 
                    key={item.label} 
                    className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={item.onClick}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <item.icon className="w-5 h-5 text-muted-foreground" />
                        <span>{item.label}</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
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
              { id: 'search', icon: Search, label: 'Search' },
              { id: 'cart', icon: ShoppingCart, label: 'Cart', badge: cartCount },
              { id: 'wallet', icon: Wallet, label: 'Wallet' },
              { id: 'profile', icon: User, label: 'Profile' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex flex-col items-center py-2 px-4 relative ${
                  activeTab === tab.id ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="text-xs mt-1">{tab.label}</span>
                {tab.badge && tab.badge > 0 && (
                  <span className="absolute top-1 right-2 w-4 h-4 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </nav>

        <CheckoutSheet 
          open={checkoutOpen} 
          onOpenChange={setCheckoutOpen} 
          cart={cart}
          onOrderComplete={() => setCart([])}
        />

        <BecomeChefModal
          open={becomeChefOpen}
          onOpenChange={setBecomeChefOpen}
          onSuccess={() => window.location.reload()}
        />

        <NotificationPrompt />
      </div>
    </>
  );
};

export default BuyerDashboard;
