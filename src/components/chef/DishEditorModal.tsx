import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAIWatchdog } from '@/hooks/useAIWatchdog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, SpellCheck, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Dish {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string | null;
  prep_time_minutes: number;
  is_available: boolean;
}

interface DishEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dish: Dish | null;
  chefId: string;
  onSaved: () => void;
}

interface SpellingError {
  original: string;
  correction: string;
  reason: string;
}

export const DishEditorModal = ({
  open,
  onOpenChange,
  dish,
  chefId,
  onSaved,
}: DishEditorModalProps) => {
  const { checkSpelling, loading: aiLoading } = useAIWatchdog();
  const [saving, setSaving] = useState(false);
  const [spellingChecked, setSpellingChecked] = useState(false);
  const [spellingErrors, setSpellingErrors] = useState<SpellingError[]>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    prep_time_minutes: '30',
    inscription: '', // Special field for cake inscriptions
  });

  const isCakeDish = formData.category?.toLowerCase().includes('cake') || 
                     formData.name?.toLowerCase().includes('cake');

  useEffect(() => {
    if (dish) {
      setFormData({
        name: dish.name,
        description: dish.description || '',
        price: dish.price.toString(),
        category: dish.category || '',
        prep_time_minutes: dish.prep_time_minutes.toString(),
        inscription: '',
      });
    } else {
      setFormData({
        name: '',
        description: '',
        price: '',
        category: '',
        prep_time_minutes: '30',
        inscription: '',
      });
    }
    setSpellingChecked(false);
    setSpellingErrors([]);
  }, [dish, open]);

  const handleSpellingCheck = async () => {
    if (!formData.inscription.trim()) {
      toast.error('Please enter an inscription to check');
      return;
    }

    const result = await checkSpelling(formData.inscription);
    
    if (result) {
      setSpellingChecked(true);
      setSpellingErrors(result.errors);
      
      if (result.hasErrors) {
        toast.warning('Spelling issues found', {
          description: `${result.errors.length} suggestion(s) available`,
        });
      } else {
        toast.success('Inscription looks good!', {
          description: 'No spelling errors detected',
        });
      }
    }
  };

  const applyCorrection = () => {
    if (spellingErrors.length > 0) {
      let correctedText = formData.inscription;
      spellingErrors.forEach(error => {
        correctedText = correctedText.replace(error.original, error.correction);
      });
      setFormData(prev => ({ ...prev, inscription: correctedText }));
      setSpellingErrors([]);
      setSpellingChecked(true);
      toast.success('Corrections applied');
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.price) {
      toast.error('Name and price are required');
      return;
    }

    // Warn if cake inscription hasn't been spell-checked
    if (isCakeDish && formData.inscription.trim() && !spellingChecked) {
      toast.warning('Please check inscription spelling first');
      return;
    }

    setSaving(true);

    try {
      const description = formData.inscription.trim()
        ? `${formData.description}\n\n📝 Inscription: "${formData.inscription}"`
        : formData.description;

      const dishData = {
        name: formData.name,
        description,
        price: parseFloat(formData.price),
        category: formData.category || null,
        prep_time_minutes: parseInt(formData.prep_time_minutes) || 30,
        chef_id: chefId,
      };

      if (dish) {
        const { error } = await supabase
          .from('dishes')
          .update(dishData)
          .eq('id', dish.id);

        if (error) throw error;
        toast.success('Dish updated successfully');
      } else {
        const { error } = await supabase
          .from('dishes')
          .insert(dishData);

        if (error) throw error;
        toast.success('Dish added successfully');
      }

      onSaved();
      onOpenChange(false);
    } catch (error: any) {
      toast.error('Failed to save dish', { description: error.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{dish ? 'Edit Dish' : 'Add New Dish'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Dish Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Jollof Rice Special"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              placeholder="e.g., Cake, Rice, Soup"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price (₦) *</Label>
              <Input
                id="price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                placeholder="5000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prep_time">Prep Time (min)</Label>
              <Input
                id="prep_time"
                type="number"
                value={formData.prep_time_minutes}
                onChange={(e) => setFormData(prev => ({ ...prev, prep_time_minutes: e.target.value }))}
                placeholder="30"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe your dish..."
              rows={3}
            />
          </div>

          {/* Cake Inscription Section */}
          {isCakeDish && (
            <div className="space-y-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-center gap-2">
                <SpellCheck className="w-5 h-5 text-primary" />
                <Label htmlFor="inscription" className="text-primary font-medium">
                  Cake Inscription
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                AI-powered spelling verification to ensure perfect inscriptions
              </p>
              <Input
                id="inscription"
                value={formData.inscription}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, inscription: e.target.value }));
                  setSpellingChecked(false);
                  setSpellingErrors([]);
                }}
                placeholder="e.g., Happy Birthday Adaeze!"
              />
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSpellingCheck}
                disabled={aiLoading || !formData.inscription.trim()}
                className="w-full"
              >
                {aiLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <SpellCheck className="w-4 h-4 mr-2" />
                    Check Spelling
                  </>
                )}
              </Button>

              {/* Spelling Results */}
              {spellingChecked && spellingErrors.length === 0 && (
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle2 className="w-4 h-4" />
                  Inscription verified - no spelling errors
                </div>
              )}

              {spellingErrors.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                    <AlertCircle className="w-4 h-4" />
                    Spelling suggestions:
                  </div>
                  <div className="space-y-1">
                    {spellingErrors.map((error, idx) => (
                      <div key={idx} className="text-sm bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
                        <span className="line-through text-muted-foreground">{error.original}</span>
                        {' → '}
                        <span className="font-medium text-foreground">{error.correction}</span>
                        <p className="text-xs text-muted-foreground mt-1">{error.reason}</p>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={applyCorrection}
                    className="w-full"
                  >
                    Apply Corrections
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              dish ? 'Update Dish' : 'Add Dish'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
