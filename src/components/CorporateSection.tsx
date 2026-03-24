import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Users, Calendar, CheckCircle } from "lucide-react";

const benefits = [
  "Recurring bulk orders for your team",
  "Dedicated account manager",
  "Custom menu planning",
  "Invoice-based payments",
  "Real-time order tracking dashboard",
  "Dietary preferences management",
];

const CorporateSection = () => {
  return (
    <section id="corporate" className="py-20 bg-secondary/10">
      <div className="container">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <Badge variant="secondary">For Businesses</Badge>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">
              Corporate Kitchen Portal
            </h2>
            <p className="text-lg text-muted-foreground">
              Feed your team with authentic local cuisine. Our Corporate Kitchen Portal 
              makes bulk ordering simple, transparent, and delicious.
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              {benefits.map((benefit, index) => (
                <div
                  key={benefit}
                  className="flex items-center gap-3 animate-fade-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CheckCircle className="w-5 h-5 text-secondary shrink-0" />
                  <span className="text-foreground">{benefit}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="secondary" size="lg">
                Request Demo
              </Button>
              <Button variant="outline" size="lg">
                Download Brochure
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Card variant="elevated" className="p-6 space-y-4 animate-fade-up">
              <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-2xl text-foreground">50+</h3>
                <p className="text-muted-foreground text-sm">Corporate Partners</p>
              </div>
            </Card>

            <Card variant="elevated" className="p-6 space-y-4 animate-fade-up" style={{ animationDelay: "100ms" }}>
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-2xl text-foreground">10,000+</h3>
                <p className="text-muted-foreground text-sm">Meals Delivered Monthly</p>
              </div>
            </Card>

            <Card variant="elevated" className="p-6 space-y-4 col-span-2 animate-fade-up" style={{ animationDelay: "200ms" }}>
              <div className="w-12 h-12 rounded-xl bg-accent/30 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-accent-foreground" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-2xl text-foreground">3 Daily Windows</h3>
                <p className="text-muted-foreground text-sm">12PM • 2PM • 6PM - Scheduled drops to your office</p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CorporateSection;
