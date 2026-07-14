export interface GeocodedLocation {
  latitude: number;
  longitude: number;
}

export interface GeocoderPort {
  geocodeAddress(address: string): Promise<GeocodedLocation | null>;
}
