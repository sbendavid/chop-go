import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { 
  Lock, 
  CheckCircle,
  AlertTriangle,
  Shield,
  Package,
  MapPin,
  Phone
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface PinVerificationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  delivery: {
    id: string;
    buyer_name: string;
    buyer_phone: string;
    address: string;
    amount: number;
  } | null;
  onVerified: () => void;
}

const PinVerificationSheet = ({ open, onOpenChange, delivery, onVerified }: PinVerificationSheetProps) => {
  const { toast } = useToast();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);

  const handleVerifyPin = async () => {
    if (pin.length !== 4) {
      toast({ title: 'Enter 4-digit delivery PIN', variant: 'destructive' });
      return;
    }

    if (!delivery?.id) {
      toast({ title: 'Invalid delivery', variant: 'destructive' });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('verify-delivery-pin', {
        body: { 
          orderId: delivery.id, 
          pin: pin 
        }
      });

      if (error) {
        console.error('PIN verification error:', error);
        toast({
          title: 'Verification failed',
          description: 'Please try again',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      if (data.success) {
        setVerified(true);
        toast({
          title: '✅ Delivery Confirmed!',
          description: `₦${delivery.amount.toLocaleString()} released from escrow`,
        });

        setTimeout(() => {
          onVerified();
          onOpenChange(false);
          setPin('');
          setVerified(false);
          setRemainingAttempts(null);
        }, 2000);
      } else {
        if (data.remainingAttempts !== undefined) {
          setRemainingAttempts(data.remainingAttempts);
        }
        
        toast({
          title: data.error || 'Invalid PIN',
          description: data.remainingAttempts !== undefined 
            ? `${data.remainingAttempts} attempts remaining`
            : undefined,
          variant: 'destructive',
        });

        if (data.remainingAttempts === 0) {
          onOpenChange(false);
        }
      }
    } catch (err) {
      console.error('PIN verification exception:', err);
      toast({
        title: 'Verification failed',
        description: 'Please try again',
        variant: 'destructive',
      });
    }

    setLoading(false);
  };

  if (!delivery) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="font-display">
            {verified ? 'Delivery Complete!' : 'Verify Delivery'}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          {verified ? (
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-full bg-secondary/20 flex items-center justify-center mx-auto mb-4 animate-scale-in">
                <CheckCircle className="w-10 h-10 text-secondary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Delivery Confirmed!</h2>
              <p className="text-muted-foreground mb-4">
                Escrow funds have been released
              </p>
              <Card className="p-4 bg-secondary/10">
                <p className="text-2xl font-bold text-secondary">
                  +₦{delivery.amount.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">Added to your balance</p>
              </Card>
            </div>
          ) : (
            <>
              {/* Delivery Info */}
              <Card className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Package className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">Order #{delivery.id}</p>
                    <p className="text-sm text-muted-foreground">{delivery.buyer_name}</p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span>{delivery.address}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{delivery.buyer_phone}</span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t flex items-center justify-between">
                  <span className="text-muted-foreground">Delivery Earnings</span>
                  <span className="font-bold text-primary">₦{delivery.amount.toLocaleString()}</span>
                </div>
              </Card>

              {/* PIN Entry */}
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Lock className="w-5 h-5 text-primary" />
                  <span className="font-semibold">Enter 4-Digit Delivery PIN</span>
                </div>

                <div className="flex gap-2 justify-center mb-4">
                  {[0, 1, 2, 3].map(i => (
                    <Input
                      key={i}
                      type="tel"
                      maxLength={1}
                      inputMode="numeric"
                      className="w-12 h-14 text-center text-2xl font-bold"
                      value={pin[i] || ''}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        const newPin = pin.split('');
                        newPin[i] = value;
                        setPin(newPin.join(''));
                        if (value) {
                          const inputs = document.querySelectorAll('input[type="tel"]');
                          const next = inputs[i + 1] as HTMLInputElement;
                          next?.focus();
                        }
                      }}
                    />
                  ))}
                </div>
              </Card>

              {/* Security Notice */}
              <Card className="bg-escrow-gradient text-white p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5" />
                  <span className="font-semibold">Escrow Protection</span>
                </div>
                <p className="text-sm text-white/80">
                  Verify the customer's PIN to release escrow funds. Never mark delivered without PIN confirmation.
                </p>
              </Card>

              {remainingAttempts !== null && remainingAttempts < 5 && (
                <div className="flex items-center gap-2 text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="text-sm">{remainingAttempts} attempts remaining</span>
                </div>
              )}

              <Button 
                className="w-full" 
                size="lg"
                onClick={handleVerifyPin}
                disabled={loading}
              >
                {loading ? 'Verifying...' : 'Confirm Delivery'}
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default PinVerificationSheet;
