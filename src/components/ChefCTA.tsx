import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChefHat, TrendingUp, Shield, Wallet, ArrowRight } from "lucide-react";

const ChefCTA = () => {
  return (
    <section id="chefs" className="py-20 bg-foreground text-primary-foreground relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="container relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <Badge className="bg-primary text-primary-foreground">
              <ChefHat className="w-3 h-3 mr-1" />
              Join as a Chef
            </Badge>

            <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold">
              Turn Your Kitchen Into a Business
            </h2>

            <p className="text-lg text-primary-foreground/80">
              Cook what you love, get paid fairly. Join over 500 verified chefs 
              earning ₦150,000+ monthly on Chop Market.
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                  <Wallet className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold">Fair Commission</h4>
                  <p className="text-sm text-primary-foreground/70">12-15% only, Pro chefs get better rates</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold">Fast Payouts</h4>
                  <p className="text-sm text-primary-foreground/70">Pro chefs get 40% advance on orders</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold">Protected Payments</h4>
                  <p className="text-sm text-primary-foreground/70">Escrow ensures you always get paid</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                  <ChefHat className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold">Pro Chef Status</h4>
                  <p className="text-sm text-primary-foreground/70">Unlock perks with 21+ orders & 4.0+ rating</p>
                </div>
              </div>
            </div>

            <Button variant="hero" size="xl" className="group">
              Apply to Cook
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>

          <div className="relative">
            <Card className="bg-primary-foreground/10 backdrop-blur-sm border-primary-foreground/20 p-8 space-y-6">
              <h3 className="font-display font-semibold text-xl">Chef Requirements</h3>
              <div className="space-y-4">
                {[
                  "Valid NIN/BVN for identity verification",
                  "Food Handler's Certificate (Medical Fitness)",
                  "Clean kitchen space (video audit required)",
                  "Smartphone for order management",
                  "Passion for authentic Nigerian cuisine",
                ].map((req, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-primary-foreground">{index + 1}</span>
                    </div>
                    <span className="text-primary-foreground/90">{req}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Floating stats */}
            <div className="absolute -top-4 -right-4 bg-accent text-accent-foreground px-4 py-2 rounded-full font-bold shadow-lg animate-float">
              ₦150k+/month
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ChefCTA;
