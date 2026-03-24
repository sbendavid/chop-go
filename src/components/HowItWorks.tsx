import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, ShieldCheck, Clock, MapPin, Banknote, CheckCircle } from "lucide-react";

const steps = [
  {
    icon: Search,
    title: "Browse & Order",
    description: "Explore dishes from verified local chefs. Filter by cuisine, price, or dietary needs.",
    highlight: "AI-powered recommendations",
  },
  {
    icon: Clock,
    title: "Schedule Delivery",
    description: "Choose your preferred delivery window: 12PM, 2PM, or 6PM estate drops.",
    highlight: "Batched for freshness",
  },
  {
    icon: ShieldCheck,
    title: "Verified Kitchen",
    description: "Every chef passes NIN/BVN verification and kitchen hygiene audits.",
    highlight: "100% verified",
  },
  {
    icon: MapPin,
    title: "Track in Real-time",
    description: "GPS-tracked delivery with geo-fenced confirmation for your security.",
    highlight: "50m delivery radius",
  },
  {
    icon: Banknote,
    title: "Secure PIN Payment",
    description: "Funds held in escrow until you confirm delivery with a 4-digit PIN.",
    highlight: "Zero fraud risk",
  },
  {
    icon: CheckCircle,
    title: "Rate & Earn",
    description: "Review your meal and earn ChopCoins for future discounts.",
    highlight: "Loyalty rewards",
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-20 bg-background">
      <div className="container">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <Badge variant="secondary" className="mb-4">Trust Built-In</Badge>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
            How Chop Market Works
          </h2>
          <p className="text-muted-foreground">
            We've reimagined food delivery with security, transparency, and community at the core.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <Card
                key={step.title}
                variant="feature"
                className="p-6 animate-fade-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-hero-gradient flex items-center justify-center shrink-0 shadow-lg">
                    <Icon className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground">
                        0{index + 1}
                      </span>
                    </div>
                    <h3 className="font-display font-semibold text-foreground text-lg">
                      {step.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                    <Badge variant="muted" className="mt-2">
                      {step.highlight}
                    </Badge>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
