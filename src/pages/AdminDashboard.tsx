import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Home, Users, ChefHat, Bike, DollarSign, Settings, TrendingUp, CheckCircle, XCircle, Clock, LogOut, Shield } from 'lucide-react';

const AdminDashboard = () => {
  const { signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'home' | 'users' | 'chefs' | 'riders' | 'settings'>('home');

  const stats = { totalUsers: 12450, activeChefs: 234, activeRiders: 89, todayOrders: 1247, revenue: 4850000 };
  const pendingVerifications = [
    { id: '1', name: 'Chioma Okafor', type: 'chef', status: 'pending' },
    { id: '2', name: 'Emeka Nwachukwu', type: 'rider', status: 'pending' },
  ];

  return (
    <>
      <Helmet><title>Admin Dashboard | Chop Market</title></Helmet>
      <div className="min-h-screen bg-background pb-20">
        <header className="bg-foreground text-background sticky top-0 z-40">
          <div className="container py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8" />
              <div><h1 className="font-display font-bold">Admin Panel</h1><p className="text-sm opacity-70">Chop Market</p></div>
            </div>
          </div>
        </header>

        <main className="container py-6">
          {activeTab === 'home' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-4"><p className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</p><p className="text-sm text-muted-foreground">Total Users</p></Card>
                <Card className="p-4"><p className="text-2xl font-bold text-primary">{stats.todayOrders}</p><p className="text-sm text-muted-foreground">Today's Orders</p></Card>
                <Card className="p-4"><p className="text-2xl font-bold text-secondary">{stats.activeChefs}</p><p className="text-sm text-muted-foreground">Active Chefs</p></Card>
                <Card className="p-4"><p className="text-2xl font-bold text-accent">{stats.activeRiders}</p><p className="text-sm text-muted-foreground">Active Riders</p></Card>
              </div>

              <Card className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-muted-foreground">Today's Revenue</p>
                  <TrendingUp className="w-5 h-5 text-secondary" />
                </div>
                <p className="text-3xl font-bold">₦{stats.revenue.toLocaleString()}</p>
              </Card>

              <div>
                <h2 className="font-display font-semibold mb-3">Pending Verifications</h2>
                {pendingVerifications.map(v => (
                  <Card key={v.id} className="p-4 mb-3">
                    <div className="flex items-center justify-between">
                      <div><p className="font-semibold">{v.name}</p><Badge variant="secondary">{v.type}</Badge></div>
                      <div className="flex gap-2">
                        <Button size="icon" variant="outline" className="text-secondary"><CheckCircle className="w-4 h-4" /></Button>
                        <Button size="icon" variant="outline" className="text-destructive"><XCircle className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'users' && <div className="space-y-4"><h2 className="font-bold text-xl">All Users</h2><p className="text-muted-foreground">{stats.totalUsers.toLocaleString()} registered users</p></div>}
          {activeTab === 'chefs' && <div className="space-y-4"><h2 className="font-bold text-xl">Chef Management</h2><p className="text-muted-foreground">{stats.activeChefs} verified chefs</p></div>}
          {activeTab === 'riders' && <div className="space-y-4"><h2 className="font-bold text-xl">Rider Management</h2><p className="text-muted-foreground">{stats.activeRiders} active riders</p></div>}
          {activeTab === 'settings' && <Card className="p-4 cursor-pointer hover:bg-destructive/10" onClick={signOut}><div className="flex items-center gap-3 text-destructive"><LogOut className="w-5 h-5" /><span>Sign Out</span></div></Card>}
        </main>

        <nav className="fixed bottom-0 left-0 right-0 bg-card border-t z-50">
          <div className="flex justify-around py-2">
            {[{ id: 'home', icon: Home }, { id: 'users', icon: Users }, { id: 'chefs', icon: ChefHat }, { id: 'riders', icon: Bike }, { id: 'settings', icon: Settings }].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex flex-col items-center py-2 px-4 ${activeTab === tab.id ? 'text-primary' : 'text-muted-foreground'}`}>
                <tab.icon className="w-5 h-5" /><span className="text-xs mt-1 capitalize">{tab.id}</span>
              </button>
            ))}
          </div>
        </nav>
      </div>
    </>
  );
};

export default AdminDashboard;
