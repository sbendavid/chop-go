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
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  ChefHat, 
  Store, 
  FileCheck,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle2
} from 'lucide-react';

interface BecomeChefModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const BecomeChefModal = ({ open, onOpenChange, onSuccess }: BecomeChefModalProps) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    brandName: '',
    bio: '',
    specialtyTags: [] as string[],
    bankName: '',
    bankAccountNumber: '',
    nin: '',
    bvn: '',
  });
  const [tagInput, setTagInput] = useState('');

  const handleAddTag = () => {
    if (tagInput.trim() && formData.specialtyTags.length < 5) {
      setFormData(prev => ({
        ...prev,
        specialtyTags: [...prev.specialtyTags, tagInput.trim()],
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      specialtyTags: prev.specialtyTags.filter(t => t !== tag),
    }));
  };

  const handleSubmit = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Create chef profile
      const { error: chefError } = await supabase
        .from('chef_profiles')
        .insert({
          user_id: user.id,
          brand_name: formData.brandName,
          bio: formData.bio,
          specialty_tags: formData.specialtyTags,
          bank_name: formData.bankName,
          bank_account_number: formData.bankAccountNumber,
          kitchen_verified: false,
          kitchen_open: false,
        });

      if (chefError) throw chefError;

      // Add chef role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          role: 'chef',
        });

      if (roleError) throw roleError;

      toast.success('Chef application submitted!', {
        description: 'Your kitchen will be verified within 24 hours.',
      });
      
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Chef registration error:', error);
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
        return formData.brandName.length >= 3;
      case 2:
        return formData.bankName && formData.bankAccountNumber.length >= 10;
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
            <ChefHat className="w-5 h-5 text-primary" />
            Become a Chef
          </DialogTitle>
          <DialogDescription>
            Step {step} of 3: {step === 1 ? 'Kitchen Details' : step === 2 ? 'Bank Info' : 'Identity Verification'}
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
              <div className="space-y-2">
                <Label htmlFor="brandName">Kitchen/Brand Name *</Label>
                <div className="relative">
                  <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="brandName"
                    placeholder="e.g., Mama Titi's Kitchen"
                    value={formData.brandName}
                    onChange={(e) => setFormData(prev => ({ ...prev, brandName: e.target.value }))}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Tell us about your cooking</Label>
                <Textarea
                  id="bio"
                  placeholder="What makes your food special?"
                  value={formData.bio}
                  onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Specialty Tags (up to 5)</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., Jollof Rice"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  />
                  <Button type="button" variant="outline" onClick={handleAddTag}>
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.specialtyTags.map(tag => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => handleRemoveTag(tag)}
                    >
                      {tag} ×
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="p-4 bg-primary/10 rounded-lg mb-4">
                <p className="text-sm font-medium">40% Advance for NIN-Verified Chefs</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Complete identity verification to receive advance payments on confirmed orders.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bankName">Bank Name *</Label>
                <Input
                  id="bankName"
                  placeholder="e.g., GTBank"
                  value={formData.bankName}
                  onChange={(e) => setFormData(prev => ({ ...prev, bankName: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountNumber">Account Number *</Label>
                <Input
                  id="accountNumber"
                  placeholder="10-digit account number"
                  value={formData.bankAccountNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, bankAccountNumber: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                  maxLength={10}
                />
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
                  onChange={(e) => setFormData(prev => ({ ...prev, nin: e.target.value.replace(/\D/g, '').slice(0, 11) }))}
                  maxLength={11}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bvn">Bank Verification Number (BVN) *</Label>
                <Input
                  id="bvn"
                  placeholder="11-digit BVN"
                  value={formData.bvn}
                  onChange={(e) => setFormData(prev => ({ ...prev, bvn: e.target.value.replace(/\D/g, '').slice(0, 11) }))}
                  maxLength={11}
                />
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

export default BecomeChefModal;
