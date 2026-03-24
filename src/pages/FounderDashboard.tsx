import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  LayoutDashboard, 
  Users, 
  ChefHat, 
  Bike, 
  Settings, 
  TrendingUp, 
  CheckCircle, 
  XCircle, 
  Clock,
  LogOut,
  Shield,
  DollarSign,
  Package,
  Wallet,
  AlertTriangle,
  Eye,
  EyeOff,
  Search,
  Filter,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  BarChart3,
  PieChart,
  Activity,
  Banknote,
  CreditCard,
  Building2,
  ShieldCheck,
  UserCheck,
  UserX,
  Star,
  MapPin
} from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  totalChefs: number;
  totalRiders: number;
  totalOrders: number;
  todayOrders: number;
  totalRevenue: number;
  todayRevenue: number;
  escrowHeld: number;
  pendingVerifications: number;
  activeKitchens: number;
  onlineRiders: number;
}

interface PendingVerification {
  id: string;
  name: string;
  phone: string;
  type: 'chef' | 'rider';
  submitted_at: string;
  nin_status: boolean;
  bvn_status: boolean;
}

const FounderDashboard = () => {
  const { signOut, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'chefs' | 'riders' | 'finance' | 'settings'>('overview');
  const [showRevenue, setShowRevenue] = useState(true);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalChefs: 0,
    totalRiders: 0,
    totalOrders: 0,
    todayOrders: 0,
    totalRevenue: 0,
    todayRevenue: 0,
    escrowHeld: 0,
    pendingVerifications: 0,
    activeKitchens: 0,
    onlineRiders: 0
  });

  const [pendingVerifications, setPendingVerifications] = useState<PendingVerification[]>([]);

  // Mock data for demo
  const mockStats: DashboardStats = {
    totalUsers: 15847,
    totalChefs: 342,
    totalRiders: 156,
    totalOrders: 28459,
    todayOrders: 847,
    totalRevenue: 142580000,
    todayRevenue: 4850000,
    escrowHeld: 12450000,
    pendingVerifications: 12,
    activeKitchens: 187,
    onlineRiders: 89
  };

  const mockVerifications: PendingVerification[] = [
    { id: '1', name: 'Chioma Okafor', phone: '+234 801 234 5678', type: 'chef', submitted_at: '2h ago', nin_status: true, bvn_status: false },
    { id: '2', name: 'Emeka Nwachukwu', phone: '+234 802 345 6789', type: 'rider', submitted_at: '3h ago', nin_status: true, bvn_status: true },
    { id: '3', name: 'Adaobi Eze', phone: '+234 803 456 7890', type: 'chef', submitted_at: '5h ago', nin_status: false, bvn_status: false },
    { id: '4', name: 'Tunde Bakare', phone: '+234 804 567 8901', type: 'rider', submitted_at: '1d ago', nin_status: true, bvn_status: false },
  ];

  const recentOrders = [
    { id: 'CM-2847', buyer: 'Folake Adeyemi', chef: "Mama Titi's Kitchen", amount: 5500, status: 'preparing', time: '5 min ago' },
    { id: 'CM-2846', buyer: 'Chinedu Okoro', chef: 'Chef Emeka', amount: 8200, status: 'pending', time: '12 min ago' },
    { id: 'CM-2845', buyer: 'Amaka Nwosu', chef: 'Spicy Affairs', amount: 4000, status: 'delivered', time: '25 min ago' },
    { id: 'CM-2844', buyer: 'Segun Olatunji', chef: "Mama Titi's Kitchen", amount: 6300, status: 'in_transit', time: '32 min ago' },
  ];

  const topChefs = [
    { name: "Mama Titi's Kitchen", orders: 487, revenue: 2450000, rating: 4.9 },
    { name: 'Chef Emeka', orders: 412, revenue: 2180000, rating: 4.8 },
    { name: 'Spicy Affairs', orders: 356, revenue: 1890000, rating: 4.7 },
    { name: 'Lagos Chops', orders: 298, revenue: 1520000, rating: 4.6 },
  ];

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    
    try {
      // Fetch real counts from database
      const [profilesRes, chefsRes, ridersRes, ordersRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('chef_profiles').select('id', { count: 'exact', head: true }),
        supabase.from('rider_profiles').select('id', { count: 'exact', head: true }),
        supabase.from('orders').select('id', { count: 'exact', head: true }),
      ]);

      // Use real data if available, otherwise mock
      setStats({
        ...mockStats,
        totalUsers: profilesRes.count || mockStats.totalUsers,
        totalChefs: chefsRes.count || mockStats.totalChefs,
        totalRiders: ridersRes.count || mockStats.totalRiders,
        totalOrders: ordersRes.count || mockStats.totalOrders,
      });

      setPendingVerifications(mockVerifications);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setStats(mockStats);
      setPendingVerifications(mockVerifications);
    }
    
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'preparing': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'ready': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'in_transit': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'delivered': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const handleApprove = (id: string) => {
    setPendingVerifications(prev => prev.filter(v => v.id !== id));
  };

  const handleReject = (id: string) => {
    setPendingVerifications(prev => prev.filter(v => v.id !== id));
  };

  return (
    <>
      <Helmet>
        <title>Founder Dashboard | Chop Market</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-background pb-20">
        {/* Header */}
        <header className="bg-foreground text-background sticky top-0 z-40">
          <div className="container py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
                  <Shield className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="font-display font-bold text-lg">Founder Dashboard</h1>
                  <p className="text-sm opacity-70">Chop Market HQ</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-background hover:bg-background/10"
                  onClick={loadDashboardData}
                >
                  <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </Button>
                <Badge className="bg-secondary text-secondary-foreground">
                  <Activity className="w-3 h-3 mr-1" />
                  Live
                </Badge>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container py-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 gap-3">
                <Card className="p-4 border-l-4 border-l-primary">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold">{stats.todayOrders.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">Today's Orders</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Package className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-2 text-xs text-secondary">
                    <ArrowUp className="w-3 h-3" />
                    <span>12% from yesterday</span>
                  </div>
                </Card>

                <Card className="p-4 border-l-4 border-l-secondary">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold">
                        {showRevenue ? `₦${(stats.todayRevenue / 1000000).toFixed(1)}M` : '₦•••'}
                      </p>
                      <p className="text-sm text-muted-foreground">Today's Revenue</p>
                    </div>
                    <button 
                      onClick={() => setShowRevenue(!showRevenue)}
                      className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center"
                    >
                      {showRevenue ? <Eye className="w-5 h-5 text-secondary" /> : <EyeOff className="w-5 h-5 text-secondary" />}
                    </button>
                  </div>
                  <div className="flex items-center gap-1 mt-2 text-xs text-secondary">
                    <ArrowUp className="w-3 h-3" />
                    <span>8% from yesterday</span>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
                      <ChefHat className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <p className="text-xl font-bold">{stats.activeKitchens}</p>
                      <p className="text-xs text-muted-foreground">Kitchens Open</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Bike className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xl font-bold">{stats.onlineRiders}</p>
                      <p className="text-xs text-muted-foreground">Riders Online</p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Escrow & Financial Summary */}
              <Card className="bg-escrow-gradient text-white p-5 rounded-2xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                      <Wallet className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-white/70 text-sm">Platform Escrow</p>
                      <p className="font-semibold">Funds Held Securely</p>
                    </div>
                  </div>
                  <ShieldCheck className="w-8 h-8 text-white/50" />
                </div>
                <p className="text-3xl font-bold mb-1">
                  {showRevenue ? `₦${(stats.escrowHeld / 1000000).toFixed(1)}M` : '₦•••••'}
                </p>
                <p className="text-white/60 text-sm">Across {stats.todayOrders} active transactions</p>
              </Card>

              {/* Pending Verifications */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-display font-semibold text-lg">Pending Verifications</h2>
                  <Badge variant="destructive">{pendingVerifications.length} pending</Badge>
                </div>
                <div className="space-y-3">
                  {pendingVerifications.slice(0, 3).map(verification => (
                    <Card key={verification.id} className="p-4 border-l-4 border-l-amber-500">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold">{verification.name}</p>
                          <p className="text-sm text-muted-foreground">{verification.phone}</p>
                        </div>
                        <Badge variant={verification.type === 'chef' ? 'default' : 'secondary'}>
                          {verification.type === 'chef' ? <ChefHat className="w-3 h-3 mr-1" /> : <Bike className="w-3 h-3 mr-1" />}
                          {verification.type}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mb-3">
                        <Badge variant={verification.nin_status ? 'outline' : 'destructive'} className="text-xs">
                          {verification.nin_status ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                          NIN
                        </Badge>
                        <Badge variant={verification.bvn_status ? 'outline' : 'destructive'} className="text-xs">
                          {verification.bvn_status ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                          BVN
                        </Badge>
                        <span className="text-xs text-muted-foreground ml-auto">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {verification.submitted_at}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          className="flex-1"
                          onClick={() => handleApprove(verification.id)}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" /> Approve
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleReject(verification.id)}
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Recent Orders */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-display font-semibold text-lg">Live Orders</h2>
                  <Button variant="ghost" size="sm" className="text-primary">View all</Button>
                </div>
                <div className="space-y-2">
                  {recentOrders.map(order => (
                    <Card key={order.id} className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm">#{order.id}</p>
                            <Badge className={`${getStatusColor(order.status)} text-xs`}>{order.status}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {order.buyer} → {order.chef}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary">₦{order.amount.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">{order.time}</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Top Performers */}
              <div>
                <h2 className="font-display font-semibold text-lg mb-3">Top Chefs This Month</h2>
                <div className="space-y-2">
                  {topChefs.map((chef, i) => (
                    <Card key={chef.name} className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{chef.name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{chef.orders} orders</span>
                            <span>•</span>
                            <span className="flex items-center">
                              <Star className="w-3 h-3 text-accent fill-accent mr-0.5" />
                              {chef.rating}
                            </span>
                          </div>
                        </div>
                        <p className="font-bold text-secondary">₦{(chef.revenue / 1000000).toFixed(1)}M</p>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search users..." 
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button variant="outline" size="icon">
                  <Filter className="w-4 h-4" />
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Card className="p-4 text-center">
                  <Users className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <p className="text-xl font-bold">{stats.totalUsers.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Total Users</p>
                </Card>
                <Card className="p-4 text-center">
                  <UserCheck className="w-6 h-6 mx-auto mb-2 text-secondary" />
                  <p className="text-xl font-bold">{Math.round(stats.totalUsers * 0.72).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Verified</p>
                </Card>
                <Card className="p-4 text-center">
                  <UserX className="w-6 h-6 mx-auto mb-2 text-destructive" />
                  <p className="text-xl font-bold">{Math.round(stats.totalUsers * 0.28).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Unverified</p>
                </Card>
              </div>

              <p className="text-muted-foreground text-center py-8">
                User management table coming soon...
              </p>
            </div>
          )}

          {activeTab === 'chefs' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Card className="p-4">
                  <ChefHat className="w-6 h-6 mb-2 text-secondary" />
                  <p className="text-2xl font-bold">{stats.totalChefs}</p>
                  <p className="text-xs text-muted-foreground">Registered Chefs</p>
                </Card>
                <Card className="p-4">
                  <ShieldCheck className="w-6 h-6 mb-2 text-primary" />
                  <p className="text-2xl font-bold">{stats.activeKitchens}</p>
                  <p className="text-xs text-muted-foreground">Kitchens Open</p>
                </Card>
              </div>

              <h3 className="font-semibold">Top Performing Chefs</h3>
              {topChefs.map((chef, i) => (
                <Card key={chef.name} className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
                      <ChefHat className="w-6 h-6 text-secondary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{chef.name}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{chef.orders} orders</span>
                        <span className="flex items-center">
                          <Star className="w-3 h-3 text-accent fill-accent mr-0.5" />
                          {chef.rating}
                        </span>
                      </div>
                    </div>
                    <Badge variant="secondary">₦{(chef.revenue / 1000000).toFixed(1)}M</Badge>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {activeTab === 'riders' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Card className="p-4">
                  <Bike className="w-6 h-6 mb-2 text-accent" />
                  <p className="text-2xl font-bold">{stats.totalRiders}</p>
                  <p className="text-xs text-muted-foreground">Registered Riders</p>
                </Card>
                <Card className="p-4">
                  <Activity className="w-6 h-6 mb-2 text-primary" />
                  <p className="text-2xl font-bold">{stats.onlineRiders}</p>
                  <p className="text-xs text-muted-foreground">Online Now</p>
                </Card>
              </div>

              <Card className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold">Avg Delivery Time</p>
                  <Badge variant="secondary">28 min</Badge>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-secondary w-3/4 rounded-full" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Target: 35 min</p>
              </Card>

              <p className="text-muted-foreground text-center py-8">
                Rider management and live map coming soon...
              </p>
            </div>
          )}

          {activeTab === 'finance' && (
            <div className="space-y-6">
              <Card className="bg-escrow-gradient text-white p-6 rounded-2xl">
                <p className="text-white/70 mb-1">Total Platform Revenue</p>
                <p className="text-4xl font-bold mb-4">
                  {showRevenue ? `₦${(stats.totalRevenue / 1000000).toFixed(1)}M` : '₦•••••'}
                </p>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-white/10 rounded-lg p-2">
                    <p className="text-lg font-bold">₦{(stats.todayRevenue / 1000000).toFixed(1)}M</p>
                    <p className="text-xs text-white/60">Today</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-2">
                    <p className="text-lg font-bold">₦{(stats.escrowHeld / 1000000).toFixed(1)}M</p>
                    <p className="text-xs text-white/60">In Escrow</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-2">
                    <p className="text-lg font-bold">15%</p>
                    <p className="text-xs text-white/60">Commission</p>
                  </div>
                </div>
              </Card>

              <div className="grid grid-cols-2 gap-3">
                <Card className="p-4">
                  <Banknote className="w-6 h-6 mb-2 text-secondary" />
                  <p className="text-xl font-bold">₦{((stats.totalRevenue * 0.15) / 1000000).toFixed(1)}M</p>
                  <p className="text-xs text-muted-foreground">Platform Commission</p>
                </Card>
                <Card className="p-4">
                  <CreditCard className="w-6 h-6 mb-2 text-primary" />
                  <p className="text-xl font-bold">₦{((stats.totalRevenue * 0.075) / 1000000).toFixed(1)}M</p>
                  <p className="text-xs text-muted-foreground">VAT Collected</p>
                </Card>
              </div>

              <Card className="p-4">
                <h3 className="font-semibold mb-3">Fee Breakdown</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Platform Fee</span>
                    <span className="font-medium">13%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Referrer Commission</span>
                    <span className="font-medium">2%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">VAT</span>
                    <span className="font-medium">7.5%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Service Fee</span>
                    <span className="font-medium">₦300/order</span>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-4">
              <Card className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Shield className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-bold text-xl">{profile?.full_name || 'Founder'}</h2>
                    <p className="text-muted-foreground">{profile?.phone}</p>
                    <Badge className="mt-1">Admin</Badge>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <h3 className="font-semibold mb-3">Platform Settings</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b">
                    <span>Commission Rate</span>
                    <Badge variant="secondary">15%</Badge>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b">
                    <span>Chef Advance Rate</span>
                    <Badge variant="secondary">Up to 40%</Badge>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span>Service Fee</span>
                    <Badge variant="secondary">₦300</Badge>
                  </div>
                </div>
              </Card>

              <Card 
                className="p-4 cursor-pointer hover:bg-destructive/10 transition-colors" 
                onClick={signOut}
              >
                <div className="flex items-center gap-3 text-destructive">
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">Sign Out</span>
                </div>
              </Card>
            </div>
          )}
        </main>

        {/* Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 bg-card border-t z-50">
          <div className="flex justify-around py-2">
            {[
              { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
              { id: 'users', icon: Users, label: 'Users' },
              { id: 'chefs', icon: ChefHat, label: 'Chefs' },
              { id: 'riders', icon: Bike, label: 'Riders' },
              { id: 'finance', icon: DollarSign, label: 'Finance' },
              { id: 'settings', icon: Settings, label: 'Settings' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex flex-col items-center py-2 px-2 transition-colors ${
                  activeTab === tab.id ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="text-xs mt-1">{tab.label}</span>
              </button>
            ))}
          </div>
        </nav>
      </div>
    </>
  );
};

export default FounderDashboard;
