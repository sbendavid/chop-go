import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Phone, 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  Loader2, 
  Shield, 
  ChefHat, 
  Bike, 
  ShoppingBag,
  CheckCircle2
} from 'lucide-react';
import { z } from 'zod';

type AuthMode = 'signin' | 'signup' | 'otp-sent' | 'role-select' | 'nin-verify';

const phoneSchema = z.string().min(10, 'Phone number must be at least 10 digits');
const emailSchema = z.string().email('Please enter a valid email');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signUp, signIn, addRole, user } = useAuth();
  const { toast } = useToast();

  const [mode, setMode] = useState<AuthMode>('signin');
  const [loading, setLoading] = useState(false);

  // Form states
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [nin, setNin] = useState('');
  const [selectedRole, setSelectedRole] = useState<'buyer' | 'chef' | 'rider' | null>(null);

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
      phoneSchema.parse(phone);

      const { error } = await signUp(email, password, phone, fullName);
      
      if (error) {
        if (error.message.includes('already registered')) {
          toast({
            title: 'Account exists',
            description: 'This email is already registered. Please sign in instead.',
            variant: 'destructive',
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: 'Account created!',
          description: 'Welcome to Chop Market',
        });
        setMode('role-select');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);

      const { error } = await signIn(email, password);
      
      if (error) {
        toast({
          title: 'Sign in failed',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Welcome back!',
          description: 'Signed in successfully',
        });
        navigate(from, { replace: true });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSelect = async (role: 'buyer' | 'chef' | 'rider') => {
    setSelectedRole(role);
    setLoading(true);

    try {
      if (role !== 'buyer') {
        const { error } = await addRole(role);
        if (error) throw error;
      }
      
      if (role === 'chef' || role === 'rider') {
        setMode('nin-verify');
      } else {
        navigate('/buyer', { replace: true });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNinVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Mocked verification - in production would call Smile ID
    setTimeout(() => {
      toast({
        title: 'Verification Submitted',
        description: 'Your NIN/BVN is being verified. This usually takes 2-5 minutes.',
      });
      setLoading(false);
      
      if (selectedRole === 'chef') {
        navigate('/chef', { replace: true });
      } else {
        navigate('/rider', { replace: true });
      }
    }, 2000);
  };

  const roles = [
    {
      id: 'buyer',
      title: 'Hungry Customer',
      description: 'Order delicious food from verified local chefs',
      icon: ShoppingBag,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      id: 'chef',
      title: 'Home Chef',
      description: 'Sell your signature dishes and build your brand',
      icon: ChefHat,
      color: 'text-secondary',
      bgColor: 'bg-secondary/10',
    },
    {
      id: 'rider',
      title: 'Delivery Rider',
      description: 'Earn money delivering food in your area',
      icon: Bike,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
  ];

  return (
    <>
      <Helmet>
        <title>Sign In | Chop Market</title>
        <meta name="description" content="Sign in to Chop Market to order authentic Nigerian food or start selling as a chef." />
      </Helmet>

      <div className="min-h-screen bg-vault-gradient flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
        </div>

        <Card className="relative w-full max-w-md bg-white/10 backdrop-blur-xl border-white/10 p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-display font-bold text-white mb-2">
              Chop<span className="text-primary">Market</span>
            </h1>
            <p className="text-white/60">
              {mode === 'signin' && 'Welcome back! Sign in to continue'}
              {mode === 'signup' && 'Create your account'}
              {mode === 'otp-sent' && 'Enter the code we sent you'}
              {mode === 'role-select' && 'How will you use Chop Market?'}
              {mode === 'nin-verify' && 'Verify your identity'}
            </p>
          </div>

          {/* Sign In Form */}
          {mode === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <label className="text-white/70 text-sm">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-white/70 text-sm">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40"
                  />
                </div>
              </div>

              <Button type="submit" variant="hero" className="w-full" disabled={loading}>
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>

              <div className="text-center pt-4">
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="text-white/60 hover:text-white transition-colors text-sm"
                >
                  Don't have an account? <span className="text-primary font-semibold">Sign up</span>
                </button>
              </div>
            </form>
          )}

          {/* Sign Up Form */}
          {mode === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <label className="text-white/70 text-sm">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <Input
                    type="text"
                    placeholder="Chioma Okafor"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-white/70 text-sm">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <Input
                    type="tel"
                    placeholder="+234 801 234 5678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-white/70 text-sm">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-white/70 text-sm">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <Input
                    type="password"
                    placeholder="Min. 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40"
                  />
                </div>
              </div>

              <Button type="submit" variant="hero" className="w-full" disabled={loading}>
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>

              <div className="text-center pt-4">
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className="text-white/60 hover:text-white transition-colors text-sm"
                >
                  Already have an account? <span className="text-primary font-semibold">Sign in</span>
                </button>
              </div>
            </form>
          )}

          {/* Role Selection */}
          {mode === 'role-select' && (
            <div className="space-y-4">
              {roles.map((role) => {
                const Icon = role.icon;
                return (
                  <button
                    key={role.id}
                    onClick={() => handleRoleSelect(role.id as 'buyer' | 'chef' | 'rider')}
                    disabled={loading}
                    className="w-full p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all text-left group"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl ${role.bgColor} flex items-center justify-center`}>
                        <Icon className={`w-6 h-6 ${role.color}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-white">{role.title}</h3>
                        <p className="text-sm text-white/60">{role.description}</p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-white/40 group-hover:text-white group-hover:translate-x-1 transition-all" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* NIN/BVN Verification (Mocked) */}
          {mode === 'nin-verify' && (
            <form onSubmit={handleNinVerify} className="space-y-6">
              <div className="text-center mb-4">
                <div className="w-16 h-16 rounded-full bg-secondary/20 flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-secondary" />
                </div>
                <Badge className="bg-secondary/20 text-secondary border-secondary/30">
                  Identity Verification Required
                </Badge>
              </div>

              <div className="space-y-2">
                <label className="text-white/70 text-sm">NIN (National Identification Number)</label>
                <Input
                  type="text"
                  placeholder="12345678901"
                  value={nin}
                  onChange={(e) => setNin(e.target.value)}
                  maxLength={11}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40 text-center text-lg tracking-widest"
                />
              </div>

              <div className="bg-white/5 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-white/70 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-secondary" />
                  <span>Verified via Smile ID</span>
                </div>
                <div className="flex items-center gap-2 text-white/70 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-secondary" />
                  <span>Your data is encrypted</span>
                </div>
                <div className="flex items-center gap-2 text-white/70 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-secondary" />
                  <span>One-time verification</span>
                </div>
              </div>

              <Button type="submit" variant="hero" className="w-full" disabled={loading || nin.length !== 11}>
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Verifying...
                  </>
                ) : (
                  <>
                    Verify Identity
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </>
  );
};

export default Auth;
