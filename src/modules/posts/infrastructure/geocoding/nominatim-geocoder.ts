import type {
  GeocodedLocation,
  GeocoderPort,
} from "@/modules/posts/application/ports/geocoder.port";

const SEARCH_ENDPOINT = "https://nominatim.openstreetmap.org/search";

interface NominatimResult {
  lat: string;
  lon: string;
}

export class NominatimGeocoder implements GeocoderPort {
  constructor(
    private readonly userAgent: string = "Agora/1.0 (student project)",
    private readonly logger: Pick<Console, "error"> = console,
  ) {}

  async geocodeAddress(address: string): Promise<GeocodedLocation | null> {
    if (!address.trim()) return null;

    const url = new URL(SEARCH_ENDPOINT);
    url.searchParams.set("q", address);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    url.searchParams.set("countrycodes", "br");

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": this.userAgent,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        this.logger.error("Falha ao geocodificar endereço.", {
          operation: "geocodeAddress",
          status: response.status,
        });
        return null;
      }

      const data = (await response.json()) as NominatimResult[];
      const firstResult = data.at(0);

      if (!firstResult) {
        return null;
      }

      const latitude = Number.parseFloat(firstResult.lat);
      const longitude = Number.parseFloat(firstResult.lon);

      if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
        return null;
      }

      return { latitude, longitude };
    } catch (error) {
      this.logger.error("Erro inesperado ao geocodificar endereço.", {
        operation: "geocodeAddress",
        errorName: error instanceof Error ? error.name : "UnknownError",
      });
      return null;
    }
  }
}
