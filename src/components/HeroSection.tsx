import { Button } from "@/components/ui/button";
import { MapPin, Clock, Shield, ChevronDown } from "lucide-react";
import heroImage from "@/assets/hero-jollof.jpg";

const HeroSection = () => {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Background with overlay */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Delicious Nigerian Jollof Rice"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-foreground/90 via-foreground/70 to-foreground/40" />
      </div>

      {/* Content */}
      <div className="container relative z-10 py-20">
        <div className="max-w-2xl space-y-8 animate-fade-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 backdrop-blur-sm border border-primary/30">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-primary-foreground text-sm font-medium">
              Now serving Lagos
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold text-primary-foreground leading-tight">
            Authentic Home
            <br />
            <span className="text-gradient">Cooked Food</span>
            <br />
            Delivered Fresh
          </h1>

          <p className="text-lg md:text-xl text-primary-foreground/80 max-w-lg">
            Order directly from verified local chefs. Fresh ingredients, 
            traditional recipes, delivered to your doorstep with trust & transparency.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button variant="hero" size="xl">
              Order Now
            </Button>
            <Button variant="hero-outline" size="xl">
              Become a Chef
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap items-center gap-6 pt-4 text-primary-foreground/70">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-accent" />
              <span className="text-sm">PIN-Secured Payments</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-accent" />
              <span className="text-sm">Scheduled Delivery</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-accent" />
              <span className="text-sm">Verified Kitchens</span>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-float">
        <ChevronDown className="w-8 h-8 text-primary-foreground/50" />
      </div>
    </section>
  );
};

export default HeroSection;
