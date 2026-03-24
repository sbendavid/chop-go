/**
 * Calculate the distance between two coordinates using the Haversine formula
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Calculate ETA based on distance and average speed
 * @param distanceKm Distance in kilometers
 * @param avgSpeedKmh Average speed in km/h (default: 25 for motorcycle in urban traffic)
 * @returns ETA in minutes
 */
export function calculateETA(distanceKm: number, avgSpeedKmh: number = 25): number {
  const hours = distanceKm / avgSpeedKmh;
  return Math.ceil(hours * 60); // Convert to minutes and round up
}

/**
 * Format ETA for display
 * @param minutes ETA in minutes
 * @returns Formatted string like "5 mins" or "1 hr 20 mins"
 */
export function formatETA(minutes: number): string {
  if (minutes < 1) return 'Arriving now';
  if (minutes < 60) return `${minutes} min${minutes > 1 ? 's' : ''}`;
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (mins === 0) return `${hours} hr${hours > 1 ? 's' : ''}`;
  return `${hours} hr ${mins} min${mins > 1 ? 's' : ''}`;
}
