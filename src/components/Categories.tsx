import { Badge } from "@/components/ui/badge";
import { 
  Utensils, 
  Cake, 
  Flame, 
  Soup, 
  Cookie, 
  Wine, 
  Salad, 
  Fish 
} from "lucide-react";

const categories = [
  { name: "Rice Dishes", icon: Utensils, count: 124, color: "bg-primary/10 text-primary" },
  { name: "Cakes & Pastries", icon: Cake, count: 89, color: "bg-secondary/20 text-secondary" },
  { name: "Grills & Suya", icon: Flame, count: 67, color: "bg-destructive/10 text-destructive" },
  { name: "Soups & Swallows", icon: Soup, count: 156, color: "bg-accent/30 text-accent-foreground" },
  { name: "Snacks", icon: Cookie, count: 98, color: "bg-primary/10 text-primary" },
  { name: "Drinks", icon: Wine, count: 45, color: "bg-secondary/20 text-secondary" },
  { name: "Healthy", icon: Salad, count: 34, color: "bg-secondary/20 text-secondary" },
  { name: "Seafood", icon: Fish, count: 56, color: "bg-primary/10 text-primary" },
];

const Categories = () => {
  return (
    <section className="py-16 bg-background border-y border-border">
      <div className="container">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-display font-bold text-foreground">
              Browse by Category
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              Find exactly what you're craving
            </p>
          </div>
          <a href="#" className="text-primary font-medium hover:underline text-sm">
            View all categories →
          </a>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
          {categories.map((category, index) => {
            const Icon = category.icon;
            return (
              <button
                key={category.name}
                className="group flex flex-col items-center gap-3 p-4 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-card transition-all duration-300 animate-fade-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className={`w-14 h-14 rounded-xl ${category.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-foreground text-sm group-hover:text-primary transition-colors">
                    {category.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{category.count} items</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Categories;
