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
  MapPin, 
  Clock, 
  Shield, 
  Gift,
  ChefHat,
  CheckCircle,
  CreditCard,
  Wallet,
  Landmark
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CartItem {
  dish: {
    id: string;
    name: string;
    price: number;
    chef_profiles: {
      brand_name: string;
    } | null;
  };
  quantity: number;
}

interface CheckoutSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cart: CartItem[];
  onOrderComplete: () => void;
}

const CheckoutSheet = ({ open, onOpenChange, cart, onOrderComplete }: CheckoutSheetProps) => {
  const { toast } = useToast();
  const [step, setStep] = useState<'address' | 'payment' | 'confirm' | 'success'>('address');
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'card' | 'bank'>('wallet');
  const [isGift, setIsGift] = useState(false);
  const [giftPhone, setGiftPhone] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  const subtotal = cart.reduce((sum, item) => sum + item.dish.price * item.quantity, 0);
  const deliveryFee = 500;
  const serviceFee = 300;
  const vat = Math.round(subtotal * 0.075);
  const total = subtotal + deliveryFee + serviceFee + vat;

  const handleContinue = () => {
    if (step === 'address') {
      if (!address.trim()) {
        toast({ title: 'Enter delivery address', variant: 'destructive' });
        return;
      }
      setStep('payment');
    } else if (step === 'payment') {
      setStep('confirm');
    } else if (step === 'confirm') {
      handlePlaceOrder();
    }
  };

  const handlePlaceOrder = async () => {
    if (pin.length !== 4) {
      toast({ title: 'Enter your 4-digit PIN', variant: 'destructive' });
      return;
    }

    setLoading(true);
    // Simulate order creation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setStep('success');
    setLoading(false);
    
    toast({
      title: '🎉 Order Placed Successfully!',
      description: 'Your food is being prepared',
    });

    setTimeout(() => {
      onOpenChange(false);
      onOrderComplete();
      setStep('address');
      setPin('');
    }, 3000);
  };

  // Delivery PIN is now generated server-side when order is created
  // The PIN will be securely stored in the database and shown to the buyer only

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="font-display">
            {step === 'address' && 'Delivery Details'}
            {step === 'payment' && 'Payment Method'}
            {step === 'confirm' && 'Confirm Order'}
            {step === 'success' && 'Order Confirmed!'}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 overflow-y-auto max-h-[calc(90vh-120px)] pb-20">
          {step === 'address' && (
            <>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Delivery Address</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Enter your full address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Landmark (Optional)</label>
                  <Input
                    placeholder="e.g. Beside GTBank, After the junction"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                  />
                </div>
              </div>

              {/* Gift Option */}
              <Card 
                className={`p-4 cursor-pointer transition-all ${isGift ? 'border-primary bg-primary/5' : ''}`}
                onClick={() => setIsGift(!isGift)}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isGift ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    <Gift className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">Chop-for-a-Friend</p>
                    <p className="text-sm text-muted-foreground">Gift this order to someone else</p>
                  </div>
                  {isGift && <CheckCircle className="w-5 h-5 text-primary" />}
                </div>
              </Card>

              {isGift && (
                <Input
                  placeholder="Recipient's phone number"
                  value={giftPhone}
                  onChange={(e) => setGiftPhone(e.target.value)}
                />
              )}

              {/* Order Summary */}
              <Card className="p-4">
                <h3 className="font-semibold mb-3">Order Summary</h3>
                <div className="space-y-2">
                  {cart.map(item => (
                    <div key={item.dish.id} className="flex justify-between text-sm">
                      <span>{item.quantity}x {item.dish.name}</span>
                      <span>₦{(item.dish.price * item.quantity).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}

          {step === 'payment' && (
            <>
              <div className="space-y-3">
                {[
                  { id: 'wallet', icon: Wallet, label: 'Chop Wallet', desc: 'Pay from your escrow balance' },
                  { id: 'card', icon: CreditCard, label: 'Debit Card', desc: 'Pay with your bank card' },
                  { id: 'bank', icon: Landmark, label: 'Bank Transfer', desc: 'Pay via bank transfer' },
                ].map(method => (
                  <Card
                    key={method.id}
                    className={`p-4 cursor-pointer transition-all ${paymentMethod === method.id ? 'border-primary bg-primary/5' : ''}`}
                    onClick={() => setPaymentMethod(method.id as any)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${paymentMethod === method.id ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                        <method.icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold">{method.label}</p>
                        <p className="text-sm text-muted-foreground">{method.desc}</p>
                      </div>
                      {paymentMethod === method.id && <CheckCircle className="w-5 h-5 text-primary" />}
                    </div>
                  </Card>
                ))}
              </div>

              <Card className="bg-escrow-gradient text-white p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5" />
                  <span className="font-semibold">Escrow Protected</span>
                </div>
                <p className="text-sm text-white/80">
                  Your payment is held securely until you receive your order. 
                  Funds are only released when you confirm delivery.
                </p>
              </Card>
            </>
          )}

          {step === 'confirm' && (
            <>
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span className="font-medium">Delivering to:</span>
                </div>
                <p className="text-sm">{address}</p>
                {landmark && <p className="text-sm text-muted-foreground">{landmark}</p>}
              </Card>

              <Card className="p-4">
                <h3 className="font-semibold mb-3">Payment Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>₦{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delivery Fee</span>
                    <span>₦{deliveryFee.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Service Fee</span>
                    <span>₦{serviceFee.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">VAT (7.5%)</span>
                    <span>₦{vat.toLocaleString()}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-bold">
                    <span>Total</span>
                    <span className="text-primary">₦{total.toLocaleString()}</span>
                  </div>
                </div>
              </Card>

              <div>
                <label className="text-sm font-medium mb-2 block">Enter your 4-digit PIN</label>
                <div className="flex gap-2 justify-center">
                  {[0, 1, 2, 3].map(i => (
                    <Input
                      key={i}
                      type="password"
                      maxLength={1}
                      className="w-14 h-14 text-center text-2xl font-bold"
                      value={pin[i] || ''}
                      onChange={(e) => {
                        const newPin = pin.split('');
                        newPin[i] = e.target.value;
                        setPin(newPin.join(''));
                        if (e.target.value && i < 3) {
                          const next = document.querySelector(`input:nth-child(${i + 2})`) as HTMLInputElement;
                          next?.focus();
                        }
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Lock className="w-4 h-4" />
                <span>A secure delivery PIN will be sent to you after payment</span>
              </div>
            </>
          )}

          {step === 'success' && (
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-full bg-secondary/20 flex items-center justify-center mx-auto mb-4 animate-scale-in">
                <CheckCircle className="w-10 h-10 text-secondary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Order Confirmed!</h2>
              <p className="text-muted-foreground mb-4">
                Your order has been placed successfully
              </p>
              <Card className="p-4 bg-muted/50">
                <div className="flex items-center justify-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <span className="font-medium">Estimated delivery: 45-60 mins</span>
                </div>
              </Card>
            </div>
          )}
        </div>

        {step !== 'success' && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-card border-t">
            <Button 
              className="w-full" 
              size="lg"
              onClick={handleContinue}
              disabled={loading}
            >
              {loading ? (
                'Processing...'
              ) : step === 'confirm' ? (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Pay ₦{total.toLocaleString()} Securely
                </>
              ) : (
                'Continue'
              )}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default CheckoutSheet;
