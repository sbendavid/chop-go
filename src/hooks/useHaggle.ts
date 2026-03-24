import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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

export function useHaggle(dishId?: string) {
  const { user } = useAuth();
  const [haggles, setHaggles] = useState<Haggle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch haggles for the current user (as buyer or chef)
  const fetchHaggles = useCallback(async () => {
    if (!user) {
      setHaggles([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      let query = supabase
        .from("haggles")
        .select("*")
        .order("created_at", { ascending: false });

      if (dishId) {
        query = query.eq("dish_id", dishId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setHaggles(data || []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      setHaggles([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, dishId]);

  useEffect(() => {
    fetchHaggles();
  }, [fetchHaggles]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("haggles-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "haggles",
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setHaggles((prev) => [payload.new as Haggle, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setHaggles((prev) =>
              prev.map((h) => (h.id === (payload.new as Haggle).id ? (payload.new as Haggle) : h))
            );
          } else if (payload.eventType === "DELETE") {
            setHaggles((prev) => prev.filter((h) => h.id !== (payload.old as Haggle).id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Get active haggle for a specific dish
  const getActiveHaggle = useCallback(
    (targetDishId: string) => {
      return haggles.find(
        (h) =>
          h.dish_id === targetDishId &&
          (h.status === "pending" || h.status === "countered")
      );
    },
    [haggles]
  );

  // Check if user can haggle on a dish
  const canHaggle = useCallback(
    (targetDishId: string) => {
      const activeHaggle = getActiveHaggle(targetDishId);
      return !activeHaggle;
    },
    [getActiveHaggle]
  );

  return {
    haggles,
    isLoading,
    error,
    refetch: fetchHaggles,
    getActiveHaggle,
    canHaggle,
  };
}
