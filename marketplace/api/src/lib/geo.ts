const EARTH_RADIUS_MILES = 3958.8;

function toRadians(deg: number) {
  return (deg * Math.PI) / 180;
}

export function haversineMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(h));
}
