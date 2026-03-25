import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth, AppRole } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Mail,
  Lock,
  User,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Shield,
  ChefHat,
  Bike,
  ShoppingBag,
  CheckCircle2,
  Phone,
} from 'lucide-react';
import { z } from 'zod';

// Validation 

const phoneNumberSchema    = z.string().min(10, 'PhoneNumber number must be at least 10 digits');
const emailSchema    = z.string().email('Please enter a valid email');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

// Modes

type AuthMode = 'signin' | 'signup-info' | 'signup-role' | 'otp-verify' | 'nin-verify';

// Role options 

const ROLE_OPTIONS = [
  {
    id:          'buyer' as AppRole,
    title:       'Hungry Customer',
    description: 'Order delicious food from verified local chefs',
    icon:        ShoppingBag,
    color:       'text-primary',
    bgColor:     'bg-primary/10',
    borderColor: 'border-primary/40',
  },
  {
    id:          'chef' as AppRole,
    title:       'Home Chef',
    description: 'Sell your signature dishes and build your brand',
    icon:        ChefHat,
    color:       'text-secondary',
    bgColor:     'bg-secondary/10',
    borderColor: 'border-secondary/40',
  },
  {
    id:          'rider' as AppRole,
    title:       'Delivery Rider',
    description: 'Earn money delivering food in your area',
    icon:        Bike,
    color:       'text-accent',
    bgColor:     'bg-accent/10',
    borderColor: 'border-accent/40',
  },
] as const;

// Component 

const Auth = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { signIn, signUp, verifyOtp, resendVerifyOtp, user } = useAuth();
  const { toast } = useToast();

  const [mode, setMode] = useState<AuthMode>('signin');
  const [loading, setLoading] = useState(false);

  // Basic info fields
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Role + NIN
  const [selectedRole, setSelectedRole] = useState<AppRole | null>(null);
  const [nin, setNin] = useState('');
  const [otpCode, setOtpCode] = useState('');

  const getDashboardRoute = (role: AppRole) => {
    switch (role) {
      case 'buyer':
        return '/buyer';
      case 'chef':
        return '/chef';
      case 'rider':
        return '/rider';
      case 'admin':
        return '/founder';
      default:
        return '/dashboard';
    }
  };

  type LocationState = {
    from?: {
      pathname?: string;
    };
  };

  const from = (location.state as LocationState)?.from?.pathname;

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate(from || getDashboardRoute(user.role ?? 'buyer'), { replace: true });
    }
  }, [user, navigate, from]);

  // Sign In

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);

      const { error } = await signIn(email, password);
      if (error) throw error;

      toast({ title: 'Welcome back! 👋', description: 'Signed in successfully' });
    } catch (err: any) {
      toast({ title: 'Sign in failed', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Step 1: validate basic info, advance to role select 

  const handleInfoNext = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!fullName.trim()) throw new Error('Full name is required');
      phoneNumberSchema.parse(phoneNumber);
      emailSchema.parse(email);
      passwordSchema.parse(password);
      setMode('signup-role');
    } catch (err: any) {
      toast({ title: 'Check your details', description: err.message, variant: 'destructive' });
    }
  };

  // Step 2: role selected → call backend with all fields 

  const handleRoleSelect = async (role: AppRole) => {
    setSelectedRole(role);
    setLoading(true);
    try {
      const { error } = await signUp(email, password, fullName, role, phoneNumber as any);
      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('already') || msg.includes('exists') || msg.includes('duplicate')) {
          toast({
            title: 'Account already exists',
            description: 'This email is registered. Please sign in instead.',
            variant: 'destructive',
          });
          setMode('signin');
        } else {
          throw error;
        }
        return;
      }

      toast({ title: '🎉 Account created!', description: 'Welcome to Chop Market' });

      setMode('otp-verify');
    } catch (err: any) {
      toast({ title: 'Registration failed', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (otpCode.trim().length < 4) {
        throw new Error('Please enter a valid OTP code');
      }

      const { error } = await verifyOtp(otpCode.trim());
      if (error) throw error;

      toast({
        title: 'Welcome! 🎉',
        description: 'Signed in successfully with OTP',
      });

      // Chef and Rider need NIN verification before entering their dashboard
      if (selectedRole === 'chef' || selectedRole === 'rider') {
        setMode('nin-verify');
      } else {
        navigate('/buyer', { replace: true });
      }
    } catch (err: any) {
      toast({
        title: 'OTP verification failed',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // NIN verification (mocked — wire to Smile ID when ready)

  const handleNinVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      toast({
        title: 'Verification Submitted',
        description: 'Your NIN is being verified. This usually takes 2–5 minutes.',
      });
      setLoading(false);
      navigate(selectedRole === 'chef' ? '/chef' : '/rider', { replace: true });
    }, 2000);
  };

  const handleResendOtp = async () => {
    setLoading(true);

    try {
      const { error } = await resendVerifyOtp(email);
      if (error) throw error;

      toast({
        title: 'OTP resent',
        description: 'A new code has been sent to your phone number.',
      });
    } catch (err: any) {
      toast({
        title: 'Failed to resend OTP',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  //─ Render─

  const pageTitle =
    mode === 'signin' ? 'Sign In' :
    mode === 'signup-info' ? 'Create Account' :
    mode === 'otp-verify' ? 'Verify OTP' :
    mode === 'signup-role' ? 'Choose Role' : 'Verify Identity';

  return (
    <>
      <Helmet>
        <title>{pageTitle} | Chop Market</title>
        <meta name="description" content="Sign in to Chop Market to order authentic Nigerian food or start selling as a chef." />
      </Helmet>

      <div className="min-h-screen bg-vault-gradient flex items-center justify-center p-4">
        {/* Background blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
        </div>

        <Card className="relative w-full max-w-md bg-white/10 backdrop-blur-xl border-white/10 p-8">

          {/* Logo + subtitle */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-display font-bold text-white mb-2">
              Chop<span className="text-primary">Market</span>
            </h1>
            <p className="text-white/60 text-sm">
              {mode === 'signin'      && 'Welcome back! Sign in to continue'}
              {mode === 'signup-info' && 'Create your account — step 1 of 2'}
              {mode === 'signup-role' && 'How will you use Chop Market?'}
              {mode === 'otp-verify' && 'Enter the verification code sent to your email'}
              {mode === 'nin-verify'  && 'Verify your identity'}
            </p>

            {/* Progress dots for signup */}
            {(mode === 'signup-info' || mode === 'signup-role') && (
              <div className="flex justify-center gap-2 mt-3">
                <span className={`w-2 h-2 rounded-full transition-colors ${mode === 'signup-info' ? 'bg-primary' : 'bg-white/30'}`} />
                <span className={`w-2 h-2 rounded-full transition-colors ${mode === 'signup-role' ? 'bg-primary' : 'bg-white/30'}`} />
              </div>
            )}
          </div>

          {/* SIGN IN */}
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
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-primary"
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
                    onChange={e => setPassword(e.target.value)}
                    required
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-primary"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading
                  ? <Loader2 className="w-5 h-5 animate-spin" />
                  : <> Sign In <ArrowRight className="w-4 h-4 ml-2" /> </>
                }
              </Button>

              <p className="text-center text-white/60 text-sm pt-1">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('signup-info'); setEmail(''); setPassword(''); }}
                  className="text-primary font-semibold hover:underline"
                >
                  Sign up
                </button>
              </p>
            </form>
          )}

          {/* SIGN UP — STEP 1: Basic info */}
          {mode === 'signup-info' && (
            <form onSubmit={handleInfoNext} className="space-y-4">
              {/* Full Name */}
              <div className="space-y-2">
                <label className="text-white/70 text-sm">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <Input
                    type="text"
                    placeholder="Chioma Okafor"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    required
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-primary"
                  />
                </div>
              </div>

              {/* PhoneNumber */}
              <div className="space-y-2">
                <label className="text-white/70 text-sm">PhoneNumber Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <Input
                    type="tel"
                    placeholder="+234 801 234 5678"
                    value={phoneNumber}
                    onChange={e => setPhoneNumber(e.target.value)}
                    required
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-primary"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="text-white/70 text-sm">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-primary"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="text-white/70 text-sm">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <Input
                    type="password"
                    placeholder="Min. 6 characters"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-primary"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full">
                Next — Choose Your Role <ArrowRight className="w-4 h-4 ml-2" />
              </Button>

              <p className="text-center text-white/60 text-sm pt-1">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className="text-primary font-semibold hover:underline"
                >
                  Sign in
                </button>
              </p>
            </form>
          )}

          {/* SIGN UP — STEP 2: Role selection */}
          {mode === 'signup-role' && (
            <div className="space-y-3">
              {/* Back button */}
              <button
                onClick={() => setMode('signup-info')}
                disabled={loading}
                className="flex items-center gap-1 text-white/50 hover:text-white text-sm mb-2 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>

              {ROLE_OPTIONS.map(role => {
                const Icon = role.icon;
                const isSelected = selectedRole === role.id;
                const isThisLoading = loading && isSelected;

                return (
                  <button
                    key={role.id}
                    onClick={() => handleRoleSelect(role.id)}
                    disabled={loading}
                    className={`
                      w-full p-4 rounded-xl border transition-all text-left group
                      ${isSelected
                        ? `${role.bgColor} ${role.borderColor} border-2`
                        : 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/20'
                      }
                      disabled:opacity-60 disabled:cursor-not-allowed
                    `}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl ${role.bgColor} flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-6 h-6 ${role.color}`} />
                      </div>
                      <div className="flex-1 text-left">
                        <h3 className="font-semibold text-white">{role.title}</h3>
                        <p className="text-sm text-white/60">{role.description}</p>
                      </div>
                      {isThisLoading
                        ? <Loader2 className="w-5 h-5 text-white/60 animate-spin flex-shrink-0" />
                        : <ArrowRight className="w-5 h-5 text-white/30 group-hover:text-white group-hover:translate-x-1 transition-all flex-shrink-0" />
                      }
                    </div>
                  </button>
                );
              })}

              <p className="text-white/40 text-xs text-center pt-2">
                Your role determines your dashboard and permissions
              </p>
            </div>
          )}

          {/* OTP VERIFICATION */}
          {mode === 'otp-verify' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="text-center text-white/60 text-sm">
                Code sent to <span className="text-white font-medium">{email}</span>
              </div>

              <div className="space-y-2">
                <label className="text-white/70 text-sm">Enter OTP Code</label>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="123456"
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  maxLength={6}
                  required
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40 text-center text-2xl tracking-[0.5em] focus-visible:ring-primary"
                />
                <p className="text-white/40 text-xs text-center">{otpCode.length}/6 digits</p>
              </div>

              <Button type="submit" className="w-full" disabled={loading || otpCode.length < 4}>
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Verifying...
                  </>
                ) : (
                  <>
                    Verify OTP <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={loading}
                className="w-full text-white/60 text-sm hover:text-white transition-colors text-center"
              >
                Resend OTP
              </button>
            </form>
          )}

          {/* NIN VERIFICATION */}
          {mode === 'nin-verify' && (
            <form onSubmit={handleNinVerify} className="space-y-6">
              <div className="text-center mb-4">
                <div className="w-16 h-16 rounded-full bg-secondary/20 flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-secondary" />
                </div>
                <Badge className="bg-secondary/20 text-secondary border-secondary/30">
                  Identity Verification Required
                </Badge>
                <p className="text-white/60 text-sm mt-2">
                  Required for {selectedRole === 'chef' ? 'chefs' : 'riders'} to keep the platform safe
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-white/70 text-sm">NIN (National Identification Number)</label>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="12345678901"
                  value={nin}
                  onChange={e => setNin(e.target.value.replace(/\D/g, ''))}
                  maxLength={11}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40 text-center text-lg tracking-widest focus-visible:ring-primary"
                />
                <p className="text-white/40 text-xs text-center">{nin.length}/11 digits</p>
              </div>

              <div className="bg-white/5 rounded-xl p-4 space-y-2">
                {[
                  'Verified via Smile ID',
                  'Your data is encrypted & secure',
                  'One-time verification only',
                ].map(item => (
                  <div key={item} className="flex items-center gap-2 text-white/70 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-secondary flex-shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading || nin.length !== 11}
              >
                {loading
                  ? <> <Loader2 className="w-5 h-5 animate-spin mr-2" /> Verifying... </>
                  : <> Verify & Continue <ArrowRight className="w-5 h-5 ml-2" /> </>
                }
              </Button>

              <button
                type="button"
                onClick={() => navigate(selectedRole === 'chef' ? '/chef' : '/rider', { replace: true })}
                className="w-full text-white/40 text-sm hover:text-white/70 transition-colors text-center"
              >
                Skip for now — verify later
              </button>
            </form>
          )}

        </Card>
      </div>
    </>
  );
};

export default Auth;