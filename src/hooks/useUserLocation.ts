import { useEffect, useState } from "react";

export function useUserLocation() {
  const [location, setLocation] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation([position.coords.latitude, position.coords.longitude]);
      },
      () => {
        // Permission denied or unavailable — callers keep their fallback behavior.
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 },
    );
  }, []);

  return location;
}
