import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import EscrowWallet from "@/components/EscrowWallet";
import Categories from "@/components/Categories";
import FeaturedDishes from "@/components/FeaturedDishes";
import HowItWorks from "@/components/HowItWorks";
import CorporateSection from "@/components/CorporateSection";
import ChefCTA from "@/components/ChefCTA";
import RiderCTA from "@/components/RiderCTA";
import Footer from "@/components/Footer";
import { SteamShotRing } from "@/components/steamshots/SteamShotRing";

const Index = () => {
  return (
    <>
      <Helmet>
        <title>Chop Market | Authentic Nigerian Home-Cooked Food Delivered</title>
        <meta 
          name="description" 
          content="Order authentic Nigerian food from verified local chefs. Fresh jollof rice, suya, cakes & more delivered to your doorstep in Lagos with PIN-secured payments." 
        />
        <meta name="keywords" content="Nigerian food delivery, Lagos food marketplace, home cooked food, jollof rice delivery, local chefs, food ordering Nigeria" />
        <link rel="canonical" href="https://chopmarket.ng" />
        
        {/* Open Graph */}
        <meta property="og:title" content="Chop Market | Authentic Nigerian Home-Cooked Food" />
        <meta property="og:description" content="Order directly from verified local chefs. Fresh ingredients, traditional recipes, delivered with trust." />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="en_NG" />
        
        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FoodEstablishment",
            "name": "Chop Market",
            "description": "Hyperlocal marketplace for authentic Nigerian home-cooked food",
            "url": "https://chopmarket.ng",
            "areaServed": "Lagos, Nigeria",
            "servesCuisine": "Nigerian",
            "priceRange": "₦₦",
          })}
        </script>
      </Helmet>

      <main className="min-h-screen">
        <Navbar />
        <HeroSection />
        
        {/* Steam Shots - Stories-style chef previews */}
        <section className="container py-4 border-b border-border/50">
          <SteamShotRing />
        </section>
        
        <EscrowWallet />
        <Categories />
        <FeaturedDishes />
        <HowItWorks />
        <CorporateSection />
        <ChefCTA />
        <RiderCTA />
        <Footer />
      </main>
    </>
  );
};

export default Index;
