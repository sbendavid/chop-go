import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bike, Zap, Clock, Wallet } from 'lucide-react';
import BecomeRiderModal from '@/components/rider/BecomeRiderModal';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const RiderCTA = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleBecomeRider = () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    setModalOpen(true);
  };

  const benefits = [
    { icon: Zap, label: 'Flexible Hours', desc: 'Work when you want' },
    { icon: Clock, label: 'Quick Payouts', desc: 'Get paid daily' },
    { icon: Wallet, label: 'Competitive Rates', desc: 'Earn per delivery' },
  ];

  return (
    <section className="py-16 bg-gradient-to-br from-accent/20 to-primary/10">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-accent/20 text-accent-foreground px-4 py-2 rounded-full text-sm font-medium mb-4">
                <Bike className="w-4 h-4" />
                Join Our Delivery Team
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Become a Chop Market Rider
              </h2>
              <p className="text-muted-foreground mb-6">
                Deliver delicious food across Lagos and earn on your own terms. 
                Use your motorcycle, car, or bicycle to make money.
              </p>
              
              <div className="space-y-3 mb-8">
                {benefits.map((benefit, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      <benefit.icon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <span className="font-medium">{benefit.label}</span>
                      <span className="text-muted-foreground text-sm ml-2">— {benefit.desc}</span>
                    </div>
                  </div>
                ))}
              </div>

              <Button size="lg" onClick={handleBecomeRider} className="gap-2">
                <Bike className="w-5 h-5" />
                Start Delivering Today
              </Button>
            </div>

            <div className="relative">
              <div className="aspect-square bg-gradient-to-br from-primary/20 to-accent/20 rounded-3xl flex items-center justify-center">
                <div className="text-center">
                  <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Bike className="w-12 h-12 text-primary" />
                  </div>
                  <p className="text-2xl font-bold text-foreground">₦2,500+</p>
                  <p className="text-muted-foreground text-sm">Average per delivery</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <BecomeRiderModal 
        open={modalOpen} 
        onOpenChange={setModalOpen}
        onSuccess={() => navigate('/rider')}
      />
    </section>
  );
};

export default RiderCTA;
