export type Coordinates = {
  latitude: number;
  longitude: number;
};

export async function getCurrentCoordinates(): Promise<Coordinates | null> {
  const geo = typeof navigator !== 'undefined' ? navigator.geolocation : null;
  if (!geo?.getCurrentPosition) return null;

  return new Promise((resolve) => {
    geo.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 120000 }
    );
  });
}

export function formatDistanceKm(distanceKm?: number) {
  if (!Number.isFinite(distanceKm)) return '';
  if ((distanceKm as number) < 1) return `${Math.round((distanceKm as number) * 1000)} m`;
  return `${(distanceKm as number).toFixed(1)} km`;
}

export function formatAvailability(entry: { is24Hours?: boolean; hours?: string }) {
  if (entry.is24Hours) return 'Open 24/7';
  return entry.hours?.trim() || 'Hours unavailable';
}

export function typeLabel(type?: string) {
  switch (type) {
    case 'hospital':
      return 'Hospital';
    case 'counselor':
      return 'Counseling';
    case 'organization':
      return 'Organization';
    case 'helpline':
      return 'Helpline';
    default:
      return 'Support';
  }
}
