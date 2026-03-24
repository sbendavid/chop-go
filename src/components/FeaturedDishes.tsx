import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Clock, Plus, ChefHat, HandCoins } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMultipleChefRatings } from "@/hooks/useChefRatings";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BargainSlider } from "@/components/haggle/BargainSlider";

import suyaImage from "@/assets/dish-suya.jpg";
import puffpuffImage from "@/assets/dish-puffpuff.jpg";
import egusiImage from "@/assets/dish-egusi.jpg";
import cakeImage from "@/assets/dish-cake.jpg";
import friedriceImage from "@/assets/dish-friedrice.jpg";
import heroJollofImage from "@/assets/hero-jollof.jpg";

interface DishData {
  id: string;
  name: string;
  price: number;
  category: string | null;
  prep_time_minutes: number | null;
  chef_id: string;
  chef_profiles: {
    id: string;
    brand_name: string;
    kitchen_verified: boolean | null;
  };
}

interface DishProps {
  id: string;
  name: string;
  chef: string;
  chefId: string;
  price: string;
  priceKobo: number;
  rating: number;
  reviews: number;
  prepTime: string;
  image: string;
  category: string;
  isProChef?: boolean;
  onHaggle?: () => void;
}

const categoryImages: Record<string, string> = {
  "Rice": heroJollofImage,
  "Grills": suyaImage,
  "Snacks": puffpuffImage,
  "Soups": egusiImage,
  "Cakes": cakeImage,
  "default": friedriceImage
};

const DishCard = ({ name, chef, price, rating, reviews, prepTime, image, category, isProChef, onHaggle }: DishProps) => {
  return (
    <Card variant="dish" className="group">
      <div className="relative overflow-hidden">
        <img
          src={image}
          alt={name}
          className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute top-3 left-3">
          <Badge variant="accent">{category}</Badge>
        </div>
        {isProChef && (
          <div className="absolute top-3 right-3">
            <Badge variant="success" className="gap-1">
              <ChefHat className="w-3 h-3" />
              Pro Chef
            </Badge>
          </div>
        )}
        <button className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 hover:scale-110">
          <Plus className="w-5 h-5" />
        </button>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-display font-semibold text-foreground group-hover:text-primary transition-colors">
              {name}
            </h3>
            <p className="text-sm text-muted-foreground">by {chef}</p>
          </div>
          <span className="font-bold text-primary text-lg">{price}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1 text-accent">
            <Star className="w-4 h-4 fill-current" />
            <span className="font-medium text-foreground">{rating > 0 ? rating : 'New'}</span>
            <span className="text-muted-foreground">({reviews})</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>{prepTime}</span>
          </div>
        </div>
        {onHaggle && (
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full gap-2 mt-2"
            onClick={onHaggle}
          >
            <HandCoins className="w-4 h-4" />
            Haggle Price
          </Button>
        )}
      </div>
    </Card>
  );
};
// Fallback static dishes for when no DB dishes exist (no haggle available for static)
const staticDishes: Omit<DishProps, 'onHaggle'>[] = [
  {
    id: "static-1",
    name: "Party Jollof Rice",
    chef: "Mama Titi's Kitchen",
    chefId: "",
    price: "₦3,500",
    priceKobo: 350000,
    rating: 4.9,
    reviews: 234,
    prepTime: "45 mins",
    image: heroJollofImage,
    category: "Rice",
    isProChef: true,
  },
  {
    id: "static-2",
    name: "Spicy Suya Skewers",
    chef: "Abuja Grill Master",
    chefId: "",
    price: "₦2,500",
    priceKobo: 250000,
    rating: 4.7,
    reviews: 156,
    prepTime: "30 mins",
    image: suyaImage,
    category: "Grills",
    isProChef: true,
  },
  {
    id: "static-3",
    name: "Fresh Puff Puff",
    chef: "Sweet Fingers Bakery",
    chefId: "",
    price: "₦1,200",
    priceKobo: 120000,
    rating: 4.8,
    reviews: 89,
    prepTime: "20 mins",
    image: puffpuffImage,
    category: "Snacks",
  },
  {
    id: "static-4",
    name: "Egusi Soup & Pounded Yam",
    chef: "Iya Basira",
    chefId: "",
    price: "₦4,000",
    priceKobo: 400000,
    rating: 4.6,
    reviews: 178,
    prepTime: "1 hour",
    image: egusiImage,
    category: "Soups",
    isProChef: true,
  },
  {
    id: "static-5",
    name: "Birthday Celebration Cake",
    chef: "Lagos Cake Queen",
    chefId: "",
    price: "₦15,000",
    priceKobo: 1500000,
    rating: 4.9,
    reviews: 67,
    prepTime: "24 hours",
    image: cakeImage,
    category: "Cakes",
  },
  {
    id: "static-6",
    name: "Nigerian Fried Rice",
    chef: "Chef Adaeze",
    chefId: "",
    price: "₦3,200",
    priceKobo: 320000,
    rating: 4.5,
    reviews: 124,
    prepTime: "40 mins",
    image: friedriceImage,
    category: "Rice",
  },
];

const FeaturedDishes = () => {
  const [dbDishes, setDbDishes] = useState<DishData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDish, setSelectedDish] = useState<{
    id: string;
    name: string;
    priceKobo: number;
    chefId: string;
  } | null>(null);
  const [haggleOpen, setHaggleOpen] = useState(false);
  
  const { user } = useAuth();
  const chefIds = dbDishes.map(d => d.chef_id);
  const { ratings } = useMultipleChefRatings(chefIds);

  useEffect(() => {
    const fetchDishes = async () => {
      const { data, error } = await supabase
        .from('dishes')
        .select(`
          id,
          name,
          price,
          category,
          prep_time_minutes,
          chef_id,
          chef_profiles!inner (
            id,
            brand_name,
            kitchen_verified
          )
        `)
        .eq('is_available', true)
        .limit(6);

      if (!error && data && data.length > 0) {
        setDbDishes(data as unknown as DishData[]);
      }
      setLoading(false);
    };

    fetchDishes();
  }, []);

  const handleHaggle = (dish: { id: string; name: string; priceKobo: number; chefId: string }) => {
    setSelectedDish(dish);
    setHaggleOpen(true);
  };

  // Convert DB dishes to display format
  const displayDishes = dbDishes.length > 0 
    ? dbDishes.map(dish => {
        const chefRating = ratings[dish.chef_id];
        const priceKobo = Math.round(dish.price * 100);
        return {
          id: dish.id,
          name: dish.name,
          chef: dish.chef_profiles.brand_name,
          chefId: dish.chef_id,
          price: `₦${dish.price.toLocaleString()}`,
          priceKobo,
          rating: chefRating?.averageRating || 0,
          reviews: chefRating?.reviewCount || 0,
          prepTime: dish.prep_time_minutes ? `${dish.prep_time_minutes} mins` : '30 mins',
          image: categoryImages[dish.category || 'default'] || categoryImages.default,
          category: dish.category || 'Food',
          isProChef: dish.chef_profiles.kitchen_verified || false,
          onHaggle: user ? () => handleHaggle({ id: dish.id, name: dish.name, priceKobo, chefId: dish.chef_id }) : undefined
        };
      })
    : staticDishes;

  return (
    <section id="dishes" className="py-20 bg-muted/30">
      <div className="container">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <Badge variant="outline" className="mb-4">Fresh Today</Badge>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
            Featured Dishes
          </h2>
          <p className="text-muted-foreground">
            Hand-picked selections from our verified chefs. Order now for scheduled delivery.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayDishes.map((dish, index) => (
            <div
              key={dish.name + index}
              className="animate-fade-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <DishCard {...dish} />
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Button variant="outline" size="lg">
            View All Dishes
          </Button>
        </div>
      </div>

      {/* Haggle Dialog */}
      <Dialog open={haggleOpen} onOpenChange={setHaggleOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Haggle for {selectedDish?.name}</DialogTitle>
          </DialogHeader>
          {selectedDish && user && (
            <BargainSlider
              dishId={selectedDish.id}
              dishName={selectedDish.name}
              originalPriceKobo={selectedDish.priceKobo}
              chefId={selectedDish.chefId}
              buyerId={user.id}
              userRole="buyer"
              onAccepted={() => setHaggleOpen(false)}
              onRejected={() => setHaggleOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default FeaturedDishes;
