import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ChefRatingStats {
  averageRating: number;
  reviewCount: number;
}

export const useChefRatings = (chefId: string | null) => {
  const [stats, setStats] = useState<ChefRatingStats>({ averageRating: 0, reviewCount: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!chefId) {
      setLoading(false);
      return;
    }

    const fetchRatings = async () => {
      const { data, error } = await supabase
        .from('order_reviews')
        .select('chef_rating')
        .eq('chef_id', chefId);

      if (error) {
        console.error('Error fetching chef ratings:', error);
        setLoading(false);
        return;
      }

      if (data && data.length > 0) {
        const total = data.reduce((sum, r) => sum + r.chef_rating, 0);
        setStats({
          averageRating: Math.round((total / data.length) * 10) / 10,
          reviewCount: data.length
        });
      }
      setLoading(false);
    };

    fetchRatings();
  }, [chefId]);

  return { ...stats, loading };
};

// Hook for fetching multiple chef ratings at once (for listings)
export const useMultipleChefRatings = (chefIds: string[]) => {
  const [ratings, setRatings] = useState<Record<string, ChefRatingStats>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (chefIds.length === 0) {
      setLoading(false);
      return;
    }

    const fetchAllRatings = async () => {
      const { data, error } = await supabase
        .from('order_reviews')
        .select('chef_id, chef_rating')
        .in('chef_id', chefIds);

      if (error) {
        console.error('Error fetching chef ratings:', error);
        setLoading(false);
        return;
      }

      if (data) {
        const grouped: Record<string, number[]> = {};
        data.forEach(r => {
          if (!grouped[r.chef_id]) grouped[r.chef_id] = [];
          grouped[r.chef_id].push(r.chef_rating);
        });

        const stats: Record<string, ChefRatingStats> = {};
        Object.entries(grouped).forEach(([chefId, ratings]) => {
          const total = ratings.reduce((sum, r) => sum + r, 0);
          stats[chefId] = {
            averageRating: Math.round((total / ratings.length) * 10) / 10,
            reviewCount: ratings.length
          };
        });
        setRatings(stats);
      }
      setLoading(false);
    };

    fetchAllRatings();
  }, [chefIds.join(',')]);

  return { ratings, loading };
};
