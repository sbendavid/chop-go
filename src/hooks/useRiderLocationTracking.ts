import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseRiderLocationTrackingProps {
  riderId: string;
  isOnline: boolean;
  updateInterval?: number; // in milliseconds
}

export const useRiderLocationTracking = ({
  riderId,
  isOnline,
  updateInterval = 10000, // 10 seconds default
}: UseRiderLocationTrackingProps) => {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOnline || !riderId) {
      // Clean up when going offline
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    // Create presence channel for real-time location sharing
    const channel = supabase.channel(`rider-location-${riderId}`);
    channelRef.current = channel;

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        // Start tracking location
        if ('geolocation' in navigator) {
          watchIdRef.current = navigator.geolocation.watchPosition(
            async (position) => {
              const { latitude, longitude } = position.coords;
              
              // Update presence with current location
              await channel.track({
                lat: latitude,
                lng: longitude,
                updated_at: new Date().toISOString(),
              });

              // Also update the database periodically
              await supabase
                .from('rider_profiles')
                .update({
                  current_lat: latitude,
                  current_lng: longitude,
                })
                .eq('id', riderId);
            },
            (error) => {
              console.error('Geolocation error:', error);
            },
            {
              enableHighAccuracy: true,
              timeout: 5000,
              maximumAge: 0,
            }
          );
        }
      }
    });

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [riderId, isOnline, updateInterval]);
};

export default useRiderLocationTracking;
