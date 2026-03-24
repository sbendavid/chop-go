import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  Bike, 
  Car,
  FileCheck,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Zap
} from 'lucide-react';

interface BecomeRiderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const BecomeRiderModal = ({ open, onOpenChange, onSuccess }: BecomeRiderModalProps) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    vehicleType: 'motorcycle',
    plateNumber: '',
    nin: '',
    bvn: '',
  });

  const vehicleOptions = [
    { value: 'motorcycle', label: 'Motorcycle', icon: Bike, description: 'Okada / Power bike' },
    { value: 'bicycle', label: 'Bicycle', icon: Bike, description: 'Pedal bicycle' },
    { value: 'car', label: 'Car', icon: Car, description: 'Sedan / SUV' },
  ];

  const handleSubmit = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Create rider profile
      const { error: riderError } = await supabase
        .from('rider_profiles')
        .insert({
          user_id: user.id,
          vehicle_type: formData.vehicleType,
          plate_number: formData.plateNumber || null,
          is_online: false,
          rating: 0,
          total_deliveries: 0,
          earnings_balance: 0,
        });

      if (riderError) throw riderError;

      // Add rider role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          role: 'rider',
        });

      if (roleError) throw roleError;

      toast.success('Rider application submitted!', {
        description: 'Your profile will be verified within 24 hours.',
      });
      
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Rider registration error:', error);
      toast.error('Failed to submit application', {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.vehicleType !== '';
      case 2:
        // Plate number required for motorcycle/car, optional for bicycle
        if (formData.vehicleType === 'bicycle') return true;
        return formData.plateNumber.length >= 6;
      case 3:
        return formData.nin.length === 11 && formData.bvn.length === 11;
      default:
        return false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Become a Rider
          </DialogTitle>
          <DialogDescription>
            Step {step} of 3: {step === 1 ? 'Vehicle Type' : step === 2 ? 'Vehicle Details' : 'Identity Verification'}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="flex gap-2">
          {[1, 2, 3].map(s => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                s <= step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        <div className="py-4 space-y-4">
          {step === 1 && (
            <>
              <div className="p-4 bg-primary/10 rounded-lg mb-4">
                <p className="text-sm font-medium">Earn on Your Own Schedule</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Deliver food and earn competitive rates per delivery. Get paid daily.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Select Your Vehicle Type *</Label>
                <RadioGroup
                  value={formData.vehicleType}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, vehicleType: value }))}
                  className="grid gap-3"
                >
                  {vehicleOptions.map(option => (
                    <div key={option.value}>
                      <RadioGroupItem
                        value={option.value}
                        id={option.value}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={option.value}
                        className="flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 hover:bg-muted/50"
                      >
                        <div className="p-2 rounded-full bg-muted">
                          <option.icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{option.label}</p>
                          <p className="text-xs text-muted-foreground">{option.description}</p>
                        </div>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="p-4 bg-accent/10 rounded-lg mb-4">
                <p className="text-sm font-medium">Vehicle Registration</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.vehicleType === 'bicycle' 
                    ? 'Plate number is optional for bicycles.'
                    : 'Enter your vehicle plate number for verification.'}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="plateNumber">
                  Plate Number {formData.vehicleType !== 'bicycle' && '*'}
                </Label>
                <Input
                  id="plateNumber"
                  placeholder="e.g., LAG 123 XY"
                  value={formData.plateNumber}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    plateNumber: e.target.value.toUpperCase().slice(0, 12) 
                  }))}
                  maxLength={12}
                />
                {formData.vehicleType !== 'bicycle' && (
                  <p className="text-xs text-muted-foreground">
                    Enter your registered plate number (min 6 characters)
                  </p>
                )}
              </div>

              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm">
                  <span className="font-medium">Selected Vehicle:</span>{' '}
                  {vehicleOptions.find(v => v.value === formData.vehicleType)?.label}
                </p>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="p-4 bg-accent/10 rounded-lg mb-4">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-accent" />
                  <p className="text-sm font-medium">Identity Verification</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Your NIN and BVN are securely encrypted and used only for verification.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nin">National Identification Number (NIN) *</Label>
                <Input
                  id="nin"
                  placeholder="11-digit NIN"
                  value={formData.nin}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    nin: e.target.value.replace(/\D/g, '').slice(0, 11) 
                  }))}
                  maxLength={11}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bvn">Bank Verification Number (BVN) *</Label>
                <Input
                  id="bvn"
                  placeholder="11-digit BVN"
                  value={formData.bvn}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    bvn: e.target.value.replace(/\D/g, '').slice(0, 11) 
                  }))}
                  maxLength={11}
                />
              </div>

              <div className="p-3 bg-primary/10 rounded-lg text-sm">
                <p className="font-medium text-primary">✓ Daily Payouts</p>
                <p className="text-muted-foreground text-xs mt-1">
                  Once verified, you'll receive earnings directly to your bank account daily.
                </p>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-3">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(s => s - 1)} className="flex-1">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
          
          {step < 3 ? (
            <Button 
              onClick={() => setStep(s => s + 1)} 
              disabled={!canProceed()}
              className="flex-1"
            >
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit} 
              disabled={loading || !canProceed()}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Submit Application
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BecomeRiderModal;
