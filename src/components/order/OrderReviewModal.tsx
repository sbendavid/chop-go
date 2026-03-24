import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Star } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface OrderReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  chefId: string;
  riderId: string | null;
  chefName: string;
  buyerId: string;
  onReviewSubmitted?: () => void;
}

const StarRating = ({
  rating,
  onRate,
  label,
}: {
  rating: number;
  onRate: (rating: number) => void;
  label: string;
}) => {
  const [hoverRating, setHoverRating] = useState(0);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onRate(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            className="p-0.5 transition-transform hover:scale-110"
          >
            <Star
              className={`w-8 h-8 transition-colors ${
                star <= (hoverRating || rating)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-muted-foreground'
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
};

export const OrderReviewModal = ({
  open,
  onOpenChange,
  orderId,
  chefId,
  riderId,
  chefName,
  buyerId,
  onReviewSubmitted,
}: OrderReviewModalProps) => {
  const [chefRating, setChefRating] = useState(0);
  const [riderRating, setRiderRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (chefRating === 0) {
      toast({
        title: 'Rating required',
        description: 'Please rate the chef before submitting.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('order_reviews').insert({
        order_id: orderId,
        buyer_id: buyerId,
        chef_id: chefId,
        rider_id: riderId,
        chef_rating: chefRating,
        rider_rating: riderId ? riderRating || null : null,
        review_text: reviewText.trim() || null,
      });

      if (error) throw error;

      toast({
        title: 'Review submitted!',
        description: 'Thank you for your feedback.',
      });

      onOpenChange(false);
      onReviewSubmitted?.();
    } catch (error) {
      console.error('Error submitting review:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit review. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rate Your Order</DialogTitle>
          <DialogDescription>
            How was your experience with {chefName}?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <StarRating
            rating={chefRating}
            onRate={setChefRating}
            label="Rate the food & chef"
          />

          {riderId && (
            <StarRating
              rating={riderRating}
              onRate={setRiderRating}
              label="Rate the delivery (optional)"
            />
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Write a review (optional)
            </label>
            <Textarea
              placeholder="Tell us about your experience..."
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {reviewText.length}/500
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Skip
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || chefRating === 0}
            className="flex-1"
          >
            {submitting ? 'Submitting...' : 'Submit Review'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
