/**
 * useChefRatings.ts
 * Migrated from Supabase to Express API.
 *
 * Express endpoints expected:
 *   GET /api/chefs/:chefId/ratings          → { averageRating, reviewCount }
 *   GET /api/chefs/ratings?ids=id1,id2,...  → Record<chefId, { averageRating, reviewCount }>
 */

import { useState, useEffect } from "react";
import { api } from "@/lib/apiClient";

interface ChefRatingStats {
  averageRating: number;
  reviewCount: number;
}

export const useChefRatings = (chefId: string | null) => {
  const [stats, setStats] = useState<ChefRatingStats>({
    averageRating: 0,
    reviewCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!chefId) {
      setLoading(false);
      return;
    }

    api
      .get<ChefRatingStats>(`/chefs/${chefId}/ratings`)
      .then((data) => setStats(data))
      .catch((err) => console.error("Error fetching chef ratings:", err))
      .finally(() => setLoading(false));
  }, [chefId]);

  return { ...stats, loading };
};

export const useMultipleChefRatings = (chefIds: string[]) => {
  const [ratings, setRatings] = useState<Record<string, ChefRatingStats>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (chefIds.length === 0) {
      setLoading(false);
      return;
    }

    const ids = chefIds.join(",");
    api
      .get<Record<string, ChefRatingStats>>(`/chefs/ratings?ids=${ids}`)
      .then((data) => setRatings(data))
      .catch((err) =>
        console.error("Error fetching multiple chef ratings:", err),
      )
      .finally(() => setLoading(false));
  }, [chefIds.join(",")]);

  return { ratings, loading };
};
