/**
 * useHaggle.ts
 * Migrated from Supabase to Express API + WebSocket realtime.
 *
 * Express endpoints expected:
 *   GET  /api/haggles?dish_id=...   → Haggle[]
 *   POST /api/haggles               → Haggle
 *   PUT  /api/haggles/:id           → Haggle
 *
 * WebSocket channel: 'haggles' — server emits INSERT / UPDATE / DELETE events
 */

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/apiClient";
// import { createChannel } from "@/lib/socketClient";
import { useAuth } from "@/hooks/useAuth";

export interface Haggle {
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

  const fetchHaggles = useCallback(async () => {
    if (!user) {
      setHaggles([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const params = dishId ? `?dish_id=${dishId}` : "";
      const data = await api.get<Haggle[]>(`/haggles${params}`);
      setHaggles(data);
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

  // ── Realtime subscription (replaces supabase postgres_changes)
  useEffect(() => {
    if (!user) return;

    const unsub = createChannel<Haggle>("haggles", (event) => {
      if (event.type === "INSERT" && event.new) {
        setHaggles((prev) => [event.new!, ...prev]);
      } else if (event.type === "UPDATE" && event.new) {
        setHaggles((prev) =>
          prev.map((h) => (h.id === event.new!.id ? event.new! : h)),
        );
      } else if (event.type === "DELETE" && event.old) {
        setHaggles((prev) => prev.filter((h) => h.id !== event.old!.id));
      }
    });

    return unsub;
  }, [user]);

  const getActiveHaggle = useCallback(
    (targetDishId: string) =>
      haggles.find(
        (h) =>
          h.dish_id === targetDishId &&
          (h.status === "pending" || h.status === "countered"),
      ),
    [haggles],
  );

  const canHaggle = useCallback(
    (targetDishId: string) => !getActiveHaggle(targetDishId),
    [getActiveHaggle],
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
function createChannel<T>(arg0: string, arg1: (event: any) => void) {
  throw new Error("Function not implemented.");
}
