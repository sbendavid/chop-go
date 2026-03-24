import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Shield, 
  Lock, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  Wallet,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Clock,
  BadgeCheck
} from "lucide-react";

const EscrowWallet = () => {
  const [showBalance, setShowBalance] = useState(true);
  const [activePin, setActivePin] = useState([false, false, false, false]);
  const [isAnimating, setIsAnimating] = useState(false);

  // Simulate PIN entry animation
  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setActivePin([false, false, false, false]);
      
      const delays = [0, 300, 600, 900];
      delays.forEach((delay, index) => {
        setTimeout(() => {
          setActivePin(prev => {
            const newState = [...prev];
            newState[index] = true;
            return newState;
          });
        }, delay);
      });

      setTimeout(() => {
        setIsAnimating(false);
      }, 1500);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const trustFeatures = [
    {
      icon: Lock,
      title: "4-Digit PIN Escrow",
      description: "Money only released when you confirm delivery with your secret PIN"
    },
    {
      icon: ShieldCheck,
      title: "Geo-Fenced Security",
      description: "Rider must be within 50m of your location to complete delivery"
    },
    {
      icon: Clock,
      title: "Instant Refunds",
      description: "Cancel before prep starts and get 100% back immediately"
    },
    {
      icon: BadgeCheck,
      title: "Verified Chefs Only",
      description: "NIN/BVN verified with hygiene-audited kitchens"
    }
  ];

  return (
    <section id="escrow" className="py-24 relative overflow-hidden">
      {/* Dark vault-like background */}
      <div className="absolute inset-0 bg-vault-gradient" />
      
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-escrow-gradient opacity-10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-secondary/5 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-secondary/10 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-secondary/15 rounded-full" />
      </div>

      <div className="container relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge className="mb-4 bg-secondary/20 text-secondary border-secondary/30 px-4 py-1.5">
            <Shield className="w-3.5 h-3.5 mr-1.5" />
            Bank-Grade Security
          </Badge>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-white mb-6">
            Your Money is{" "}
            <span className="relative">
              <span className="relative z-10 text-transparent bg-clip-text bg-escrow-gradient">
                Locked & Safe
              </span>
              <span className="absolute -inset-1 bg-secondary/20 blur-lg rounded-lg" />
            </span>
          </h2>
          <p className="text-lg text-white/70 leading-relaxed">
            Unlike other apps, we don't touch your money until you're 100% satisfied. 
            Our PIN-secured escrow means zero fraud, guaranteed.
          </p>
        </div>

        {/* Main Escrow Card */}
        <div className="max-w-5xl mx-auto">
          <Card className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border-white/10 p-8 md:p-12 relative overflow-hidden">
            {/* Shimmer effect */}
            <div className="absolute inset-0 shimmer opacity-20" />
            
            <div className="grid lg:grid-cols-2 gap-12 items-center relative">
              {/* Left: Wallet Visualization */}
              <div className="relative">
                {/* Floating Wallet Card */}
                <div className="relative animate-float">
                  <div className="bg-gradient-to-br from-secondary via-secondary/90 to-emerald-600 rounded-3xl p-8 shadow-2xl animate-pulse-glow">
                    {/* Card Header */}
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                          <Wallet className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="text-white/70 text-sm">Chop Wallet</p>
                          <p className="text-white font-semibold">Escrow Balance</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setShowBalance(!showBalance)}
                        className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                      >
                        {showBalance ? (
                          <Eye className="w-5 h-5 text-white" />
                        ) : (
                          <EyeOff className="w-5 h-5 text-white" />
                        )}
                      </button>
                    </div>

                    {/* Balance Display */}
                    <div className="mb-8">
                      <p className="text-white/60 text-sm mb-1">Protected Amount</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl md:text-5xl font-bold text-white font-display">
                          {showBalance ? "₦45,750" : "₦••••••"}
                        </span>
                        <Badge className="bg-white/20 text-white border-0">
                          <Lock className="w-3 h-3 mr-1" />
                          Secured
                        </Badge>
                      </div>
                    </div>

                    {/* PIN Entry Visualization */}
                    <div className="bg-black/20 rounded-2xl p-6">
                      <p className="text-white/60 text-sm mb-4 text-center">
                        Enter PIN to release funds
                      </p>
                      <div className="flex justify-center gap-4">
                        {[0, 1, 2, 3].map((index) => (
                          <div
                            key={index}
                            className={`
                              w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-bold
                              transition-all duration-300 transform
                              ${activePin[index] 
                                ? 'bg-white text-secondary scale-110 animate-digit-reveal' 
                                : 'bg-white/10 text-white/30 border-2 border-white/20'
                              }
                            `}
                            style={{ animationDelay: `${index * 100}ms` }}
                          >
                            {activePin[index] ? '•' : ''}
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-center gap-2 mt-4 text-white/50 text-sm">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Only you know your PIN</span>
                      </div>
                    </div>
                  </div>

                  {/* Floating security badges */}
                  <div className="absolute -top-4 -right-4 bg-accent text-accent-foreground rounded-full px-4 py-2 shadow-lg flex items-center gap-2 animate-fade-in">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-sm font-semibold">Zero Fraud</span>
                  </div>
                </div>
              </div>

              {/* Right: Trust Features */}
              <div className="space-y-6">
                <div className="space-y-4">
                  {trustFeatures.map((feature, index) => {
                    const Icon = feature.icon;
                    return (
                      <div 
                        key={feature.title}
                        className="flex items-start gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group animate-fade-up"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center shrink-0 group-hover:bg-secondary/30 transition-colors">
                          <Icon className="w-6 h-6 text-secondary" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-white mb-1">{feature.title}</h4>
                          <p className="text-white/60 text-sm">{feature.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-4">
                  <Button variant="hero" size="lg" className="w-full group">
                    <span>Start Ordering Securely</span>
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                  <p className="text-center text-white/40 text-sm mt-4">
                    Join 50,000+ Nigerians who trust Chop Market
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Bottom Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto mt-16">
          {[
            { value: "₦0", label: "Lost to Fraud", highlight: true },
            { value: "100%", label: "Refund Rate" },
            { value: "2.5s", label: "Avg. Refund Time" },
            { value: "4.9★", label: "Trust Rating" },
          ].map((stat, index) => (
            <div 
              key={stat.label}
              className="text-center animate-fade-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <p className={`text-3xl md:text-4xl font-display font-bold mb-2 ${
                stat.highlight ? 'text-secondary' : 'text-white'
              }`}>
                {stat.value}
              </p>
              <p className="text-white/50 text-sm">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default EscrowWallet;
