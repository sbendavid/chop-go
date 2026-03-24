import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Clock, Check, X, MessageSquare, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

interface Haggle {
  id: string;
  dish_id: string;
  buyer_id: string;
  chef_id: string;
  original_price_kobo: number;
  buyer_offer_kobo: number | null;
  chef_counter_kobo: number | null;
  final_price_kobo: number | null;
  buyer_slider_position: number;
  chef_slider_position: number;
  status: string;
  rounds: number;
  expires_at: string;
  created_at: string;
}

interface BargainSliderProps {
  dishId: string;
  dishName: string;
  originalPriceKobo: number;
  chefId: string;
  buyerId: string;
  userRole: "buyer" | "chef";
  existingHaggleId?: string;
  onAccepted?: (finalPriceKobo: number) => void;
  onRejected?: () => void;
}

const formatNaira = (kobo: number) => {
  return `₦${(kobo / 100).toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;
};

const MAX_ROUNDS = 5;

export function BargainSlider({
  dishId,
  dishName,
  originalPriceKobo,
  chefId,
  buyerId,
  userRole,
  existingHaggleId,
  onAccepted,
  onRejected,
}: BargainSliderProps) {
  const [haggle, setHaggle] = useState<Haggle | null>(null);
  const [sliderValue, setSliderValue] = useState(userRole === "buyer" ? 0 : 100);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const { toast } = useToast();

  const minPrice = originalPriceKobo * 0.5; // 50% minimum
  const maxPrice = originalPriceKobo;

  const sliderToKobo = (position: number) => {
    return Math.round(minPrice + (position / 100) * (maxPrice - minPrice));
  };

  const koboToSlider = (kobo: number) => {
    return Math.round(((kobo - minPrice) / (maxPrice - minPrice)) * 100);
  };

  // Fetch or create haggle
  useEffect(() => {
    const fetchHaggle = async () => {
      if (existingHaggleId) {
        const { data, error } = await supabase
          .from("haggles")
          .select("*")
          .eq("id", existingHaggleId)
          .single();

        if (data && !error) {
          setHaggle(data);
          setSliderValue(
            userRole === "buyer" ? data.buyer_slider_position : data.chef_slider_position
          );
        }
      }
    };

    fetchHaggle();
  }, [existingHaggleId, userRole]);

  // Real-time subscription
  useEffect(() => {
    if (!haggle?.id) return;

    const channel = supabase
      .channel(`haggle-${haggle.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "haggles",
          filter: `id=eq.${haggle.id}`,
        },
        (payload) => {
          const updated = payload.new as Haggle;
          setHaggle(updated);

          // Notify on status changes
          if (updated.status === "accepted") {
            toast({
              title: "Deal Accepted! 🎉",
              description: `Final price: ${formatNaira(updated.final_price_kobo!)}`,
            });
            onAccepted?.(updated.final_price_kobo!);
          } else if (updated.status === "rejected") {
            toast({
              title: "Haggle Rejected",
              description: "The other party declined the offer.",
              variant: "destructive",
            });
            onRejected?.();
          } else if (updated.status === "countered") {
            toast({
              title: "Counter Offer Received!",
              description: userRole === "buyer"
                ? `Chef countered: ${formatNaira(updated.chef_counter_kobo!)}`
                : `Buyer offered: ${formatNaira(updated.buyer_offer_kobo!)}`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [haggle?.id, userRole, toast, onAccepted, onRejected]);

  // Countdown timer
  useEffect(() => {
    if (!haggle?.expires_at || haggle.status !== "pending" && haggle.status !== "countered") return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const expiry = new Date(haggle.expires_at).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft("Expired");
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, "0")}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [haggle?.expires_at, haggle?.status]);

  const startHaggle = async () => {
    setIsSubmitting(true);
    try {
      const offerKobo = sliderToKobo(sliderValue);

      const { data, error } = await supabase
        .from("haggles")
        .insert({
          dish_id: dishId,
          buyer_id: buyerId,
          chef_id: chefId,
          original_price_kobo: originalPriceKobo,
          buyer_offer_kobo: offerKobo,
          buyer_slider_position: sliderValue,
          chef_slider_position: 100,
          status: "pending",
          rounds: 1,
        })
        .select()
        .single();

      if (error) throw error;

      setHaggle(data);
      toast({
        title: "Offer Sent!",
        description: `You offered ${formatNaira(offerKobo)} for ${dishName}`,
      });
    } catch (error: any) {
      toast({
        title: "Failed to send offer",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitCounter = async () => {
    if (!haggle) return;

    setIsSubmitting(true);
    try {
      const counterKobo = sliderToKobo(sliderValue);
      const newRounds = haggle.rounds + 1;

      if (newRounds > MAX_ROUNDS) {
        toast({
          title: "Max rounds reached",
          description: "You've reached the maximum negotiation rounds. Accept or reject.",
          variant: "destructive",
        });
        return;
      }

      const updateData = userRole === "buyer"
        ? {
            buyer_offer_kobo: counterKobo,
            buyer_slider_position: sliderValue,
            status: "countered",
            rounds: newRounds,
          }
        : {
            chef_counter_kobo: counterKobo,
            chef_slider_position: sliderValue,
            status: "countered",
            rounds: newRounds,
          };

      const { error } = await supabase
        .from("haggles")
        .update(updateData)
        .eq("id", haggle.id);

      if (error) throw error;

      toast({
        title: "Counter Sent!",
        description: `Your counter: ${formatNaira(counterKobo)}`,
      });
    } catch (error: any) {
      toast({
        title: "Failed to send counter",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const acceptOffer = async () => {
    if (!haggle) return;

    setIsSubmitting(true);
    try {
      const finalPrice = userRole === "buyer"
        ? haggle.chef_counter_kobo || haggle.original_price_kobo
        : haggle.buyer_offer_kobo || haggle.original_price_kobo;

      const { error } = await supabase
        .from("haggles")
        .update({
          status: "accepted",
          final_price_kobo: finalPrice,
        })
        .eq("id", haggle.id);

      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Failed to accept",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const rejectOffer = async () => {
    if (!haggle) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("haggles")
        .update({ status: "rejected" })
        .eq("id", haggle.id);

      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Failed to reject",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentOffer = sliderToKobo(sliderValue);
  const buyerOffer = haggle?.buyer_offer_kobo;
  const chefCounter = haggle?.chef_counter_kobo;
  const isExpired = haggle?.status === "expired" || timeLeft === "Expired";
  const isFinalized = haggle?.status === "accepted" || haggle?.status === "rejected";

  const getStatusBadge = () => {
    if (!haggle) return null;
    
    const statusStyles: Record<string, string> = {
      pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      countered: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      accepted: "bg-green-500/20 text-green-400 border-green-500/30",
      rejected: "bg-red-500/20 text-red-400 border-red-500/30",
      expired: "bg-muted text-muted-foreground border-muted",
    };

    return (
      <Badge className={cn("border", statusStyles[haggle.status] || statusStyles.pending)}>
        {haggle.status.charAt(0).toUpperCase() + haggle.status.slice(1)}
      </Badge>
    );
  };

  return (
    <Card className="w-full max-w-md border-primary/20 bg-card/80 backdrop-blur">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Flame className="h-5 w-5 text-primary" />
            Haggle: {dishName}
          </CardTitle>
          {getStatusBadge()}
        </div>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Original: {formatNaira(originalPriceKobo)}</span>
          {haggle && !isFinalized && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {timeLeft}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Price Range Display */}
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatNaira(minPrice)}</span>
          <span>{formatNaira(maxPrice)}</span>
        </div>

        {/* Dual Position Indicator */}
        <div className="relative h-8">
          {/* Track background */}
          <div className="absolute inset-x-0 top-3 h-2 rounded-full bg-muted">
            {/* Overlap zone */}
            {haggle && (
              <div
                className="absolute h-full rounded-full bg-gradient-to-r from-accent to-primary opacity-50"
                style={{
                  left: `${Math.min(haggle.buyer_slider_position, haggle.chef_slider_position)}%`,
                  width: `${Math.abs(haggle.chef_slider_position - haggle.buyer_slider_position)}%`,
                }}
              />
            )}
          </div>

          {/* Buyer position indicator */}
          {haggle && (
            <div
              className="absolute top-0 flex flex-col items-center transition-all duration-300"
              style={{ left: `${haggle.buyer_slider_position}%`, transform: "translateX(-50%)" }}
            >
              <span className="text-[10px] font-medium text-accent">Buyer</span>
              <div className="h-4 w-4 rounded-full border-2 border-accent bg-accent/30" />
            </div>
          )}

          {/* Chef position indicator */}
          {haggle && (
            <div
              className="absolute top-0 flex flex-col items-center transition-all duration-300"
              style={{ left: `${haggle.chef_slider_position}%`, transform: "translateX(-50%)" }}
            >
              <span className="text-[10px] font-medium text-primary">Chef</span>
              <div className="h-4 w-4 rounded-full border-2 border-primary bg-primary/30" />
            </div>
          )}
        </div>

        {/* Interactive Slider */}
        {!isFinalized && !isExpired && (
          <div className="space-y-2">
            <Slider
              value={[sliderValue]}
              onValueChange={([val]) => setSliderValue(val)}
              max={100}
              step={1}
              disabled={isSubmitting}
              className={cn(
                userRole === "buyer" ? "[&_[role=slider]]:border-accent [&_[role=slider]]:bg-accent" : ""
              )}
            />
            <div className="text-center">
              <span className="text-2xl font-bold text-primary">
                {formatNaira(currentOffer)}
              </span>
              <span className="ml-2 text-sm text-muted-foreground">
                ({Math.round((currentOffer / originalPriceKobo) * 100)}% of original)
              </span>
            </div>
          </div>
        )}

        {/* Offer Summary */}
        {haggle && (
          <div className="rounded-lg bg-muted/50 p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Buyer's Offer:</span>
              <span className="font-medium text-accent">
                {buyerOffer ? formatNaira(buyerOffer) : "—"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Chef's Counter:</span>
              <span className="font-medium text-primary">
                {chefCounter ? formatNaira(chefCounter) : "—"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Round:</span>
              <span className="font-medium">{haggle.rounds} / {MAX_ROUNDS}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {!haggle && userRole === "buyer" && (
            <Button
              onClick={startHaggle}
              disabled={isSubmitting}
              className="flex-1"
              variant="hero"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              {isSubmitting ? "Sending..." : "Start Haggle"}
            </Button>
          )}

          {haggle && !isFinalized && !isExpired && (
            <>
              <Button
                onClick={submitCounter}
                disabled={isSubmitting || haggle.rounds >= MAX_ROUNDS}
                className="flex-1"
                variant="outline"
              >
                Counter
              </Button>
              <Button
                onClick={acceptOffer}
                disabled={isSubmitting}
                className="flex-1"
                variant="default"
              >
                <Check className="h-4 w-4 mr-1" />
                Accept
              </Button>
              <Button
                onClick={rejectOffer}
                disabled={isSubmitting}
                variant="destructive"
                size="icon"
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          )}

          {isFinalized && haggle?.status === "accepted" && (
            <div className="flex-1 text-center py-2 rounded-lg bg-green-500/10 border border-green-500/30">
              <span className="text-green-400 font-semibold">
                Deal! {formatNaira(haggle.final_price_kobo!)}
              </span>
            </div>
          )}

          {(isFinalized && haggle?.status === "rejected") || isExpired ? (
            <div className="flex-1 text-center py-2 rounded-lg bg-red-500/10 border border-red-500/30">
              <span className="text-red-400 font-semibold">
                {isExpired ? "Expired" : "Rejected"}
              </span>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
