/**
 * useRiderLocationTracking.ts
 * Migrated from Supabase Realtime presence to WebSocket + REST.
 *
 * Express endpoints expected:
 *   PATCH /api/riders/:riderId/location  { lat, lng }  → 200
 *
 * WebSocket: sends presence track to channel `rider-location-{riderId}`
 */

import { useEffect, useRef } from "react";
import { api } from "@/lib/apiClient";
// import { trackPresence, createChannel } from "@/lib/socketClient";

interface UseRiderLocationTrackingProps {
  riderId: string;
  isOnline: boolean;
  updateInterval?: number; // ms
}

export const useRiderLocationTracking = ({
  riderId,
  isOnline,
  updateInterval = 10000,
}: UseRiderLocationTrackingProps) => {
  const watchIdRef = useRef<number | null>(null);
  const dbTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPositionRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!isOnline || !riderId) {
      // Clean up when going offline
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (dbTimerRef.current !== null) {
        clearInterval(dbTimerRef.current);
        dbTimerRef.current = null;
      }
      return;
    }

    const channel = `rider-location-${riderId}`;

    if ("geolocation" in navigator) {
      // Watch position and push to WebSocket presence (realtime, lightweight)
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude: lat, longitude: lng } = position.coords;
          lastPositionRef.current = { lat, lng };

          trackPresence(channel, {
            lat,
            lng,
            updated_at: new Date().toISOString(),
          });
        },
        (error) => console.error("Geolocation error:", error),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 },
      );

      // Persist to DB at a lower frequency (every updateInterval ms)
      dbTimerRef.current = setInterval(async () => {
        if (!lastPositionRef.current) return;
        const { lat, lng } = lastPositionRef.current;
        try {
          await api.patch(`/riders/${riderId}/location`, { lat, lng });
        } catch (err) {
          console.error("Failed to persist rider location:", err);
        }
      }, updateInterval);
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (dbTimerRef.current !== null) {
        clearInterval(dbTimerRef.current);
        dbTimerRef.current = null;
      }
    };
  }, [riderId, isOnline, updateInterval]);
};

export default useRiderLocationTracking;
function trackPresence(
  channel: string,
  arg1: { lat: number; lng: number; updated_at: string },
) {
  throw new Error("Function not implemented.");
}
