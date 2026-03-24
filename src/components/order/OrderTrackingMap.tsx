import { useEffect, useRef, useState, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Clock, Navigation } from 'lucide-react';
import { calculateDistance, calculateETA, formatETA } from '@/lib/distance';

interface OrderTrackingMapProps {
  orderId: string;
  riderLocation?: { lat: number; lng: number } | null;
  deliveryLocation: { lat: number; lng: number };
  chefLocation?: { lat: number; lng: number } | null;
  status: string;
}

const OrderTrackingMap = ({ 
  orderId, 
  riderLocation, 
  deliveryLocation,
  chefLocation,
  status 
}: OrderTrackingMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const riderMarker = useRef<mapboxgl.Marker | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculate ETA based on rider location
  const etaInfo = useMemo(() => {
    if (!riderLocation) return null;
    
    const distanceKm = calculateDistance(
      riderLocation.lat,
      riderLocation.lng,
      deliveryLocation.lat,
      deliveryLocation.lng
    );
    
    const etaMinutes = calculateETA(distanceKm);
    const formattedETA = formatETA(etaMinutes);
    const formattedDistance = distanceKm < 1 
      ? `${Math.round(distanceKm * 1000)}m` 
      : `${distanceKm.toFixed(1)}km`;
    
    return {
      etaMinutes,
      formattedETA,
      distanceKm,
      formattedDistance
    };
  }, [riderLocation, deliveryLocation]);

  // Fetch Mapbox token
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        if (error) throw error;
        if (data?.token) {
          setMapboxToken(data.token);
        } else {
          setError('Failed to get map token');
        }
      } catch (err) {
        console.error('Error fetching Mapbox token:', err);
        setError('Map unavailable');
      } finally {
        setLoading(false);
      }
    };
    fetchToken();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    const centerLat = riderLocation?.lat || chefLocation?.lat || deliveryLocation.lat;
    const centerLng = riderLocation?.lng || chefLocation?.lng || deliveryLocation.lng;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [centerLng, centerLat],
      zoom: 14,
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add delivery destination marker (green)
    new mapboxgl.Marker({ color: '#22c55e' })
      .setLngLat([deliveryLocation.lng, deliveryLocation.lat])
      .setPopup(new mapboxgl.Popup().setText('Delivery Location'))
      .addTo(map.current);

    // Add chef/restaurant marker (orange) if available
    if (chefLocation) {
      new mapboxgl.Marker({ color: '#f97316' })
        .setLngLat([chefLocation.lng, chefLocation.lat])
        .setPopup(new mapboxgl.Popup().setText('Restaurant'))
        .addTo(map.current);
    }

    // Add rider marker (blue) if available
    if (riderLocation) {
      riderMarker.current = new mapboxgl.Marker({ color: '#3b82f6' })
        .setLngLat([riderLocation.lng, riderLocation.lat])
        .setPopup(new mapboxgl.Popup().setText('Rider'))
        .addTo(map.current);
    }

    // Fit bounds to show all markers
    const bounds = new mapboxgl.LngLatBounds();
    bounds.extend([deliveryLocation.lng, deliveryLocation.lat]);
    if (chefLocation) bounds.extend([chefLocation.lng, chefLocation.lat]);
    if (riderLocation) bounds.extend([riderLocation.lng, riderLocation.lat]);
    
    map.current.fitBounds(bounds, { padding: 60, maxZoom: 15 });

    return () => {
      map.current?.remove();
    };
  }, [mapboxToken, deliveryLocation, chefLocation]);

  // Update rider marker position when riderLocation changes
  useEffect(() => {
    if (!map.current || !riderLocation) return;

    if (riderMarker.current) {
      riderMarker.current.setLngLat([riderLocation.lng, riderLocation.lat]);
    } else {
      riderMarker.current = new mapboxgl.Marker({ color: '#3b82f6' })
        .setLngLat([riderLocation.lng, riderLocation.lat])
        .setPopup(new mapboxgl.Popup().setText('Rider'))
        .addTo(map.current);
    }

    // Smoothly pan to show rider
    map.current.panTo([riderLocation.lng, riderLocation.lat], { duration: 1000 });
  }, [riderLocation]);

  if (loading) {
    return (
      <div className="h-48 rounded-xl bg-muted flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-48 rounded-xl bg-muted flex items-center justify-center">
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div ref={mapContainer} className="h-48 rounded-xl overflow-hidden" />
      
      {/* ETA Badge - Top right corner */}
      {etaInfo && status === 'in_transit' && (
        <div className="absolute top-2 left-2 bg-primary text-primary-foreground rounded-lg px-3 py-1.5 shadow-lg">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            <span className="font-semibold text-sm">{etaInfo.formattedETA}</span>
          </div>
        </div>
      )}
      
      {/* Status overlay */}
      <div className="absolute bottom-2 left-2 right-2 bg-card/95 backdrop-blur-sm rounded-lg p-2 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <span className="w-2 h-2 rounded-full bg-[#f97316]" title="Restaurant" />
              <span className="w-2 h-2 rounded-full bg-[#3b82f6]" title="Rider" />
              <span className="w-2 h-2 rounded-full bg-[#22c55e]" title="Delivery" />
            </div>
            <span className="text-xs text-muted-foreground">
              {status === 'in_transit' ? 'Rider on the way' : 
               status === 'picked_up' ? 'Picking up order' :
               status === 'ready' ? 'Ready for pickup' : 
               'Tracking order'}
            </span>
          </div>
          
          {/* Distance indicator */}
          {etaInfo && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Navigation className="w-3 h-3" />
              <span>{etaInfo.formattedDistance} away</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderTrackingMap;
