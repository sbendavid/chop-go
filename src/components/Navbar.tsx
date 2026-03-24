import { UtensilsCrossed, Menu, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="container flex items-center justify-between h-16 md:h-20">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-xl bg-hero-gradient flex items-center justify-center shadow-lg group-hover:shadow-glow transition-shadow">
            <UtensilsCrossed className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold text-foreground">
            Chop<span className="text-primary">Market</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          <a href="#dishes" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
            Browse Food
          </a>
          <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
            How It Works
          </a>
          <a href="#chefs" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
            For Chefs
          </a>
          <a href="#corporate" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
            Corporate
          </a>
        </div>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-3">
          {loading ? (
            <div className="w-20 h-9 bg-muted animate-pulse rounded-md" />
          ) : user ? (
            <>
              <Button variant="ghost" asChild>
                <Link to="/dashboard" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Dashboard
                </Link>
              </Button>
              <Button variant="outline" onClick={handleSignOut} className="flex items-center gap-2">
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link to="/auth">Sign In</Link>
              </Button>
              <Button variant="default" asChild>
                <Link to="/auth">Get Started</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
          onClick={() => setIsOpen(!isOpen)}
        >
          <Menu className="w-6 h-6 text-foreground" />
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-background border-b border-border animate-fade-in">
          <div className="container py-4 space-y-4">
            <a href="#dishes" className="block py-2 text-muted-foreground hover:text-foreground transition-colors">
              Browse Food
            </a>
            <a href="#how-it-works" className="block py-2 text-muted-foreground hover:text-foreground transition-colors">
              How It Works
            </a>
            <a href="#chefs" className="block py-2 text-muted-foreground hover:text-foreground transition-colors">
              For Chefs
            </a>
            <a href="#corporate" className="block py-2 text-muted-foreground hover:text-foreground transition-colors">
              Corporate
            </a>
            <div className="flex gap-3 pt-4">
              {user ? (
                <>
                  <Button variant="outline" className="flex-1" asChild>
                    <Link to="/dashboard">Dashboard</Link>
                  </Button>
                  <Button variant="default" className="flex-1" onClick={handleSignOut}>
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" className="flex-1" asChild>
                    <Link to="/auth">Sign In</Link>
                  </Button>
                  <Button variant="default" className="flex-1" asChild>
                    <Link to="/auth">Get Started</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
