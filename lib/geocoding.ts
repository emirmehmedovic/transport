/**
 * Geocoding utilities using Nominatim (OpenStreetMap)
 */

export interface GeocodingResult {
  latitude: number;
  longitude: number;
  displayName: string;
  address?: {
    road?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

/**
 * Convert address to coordinates (Geocoding)
 * Uses viewbox to prioritize European results
 */
export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        address
      )}&format=json&addressdetails=1&limit=1&viewbox=-10,35,40,70&bounded=1`,
      {
        headers: {
          "User-Agent": "TransportApp/1.0",
        },
      }
    );

    if (!response.ok) {
      throw new Error("Geocoding failed");
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      return null;
    }

    const result = data[0];

    return {
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      displayName: result.display_name,
      address: {
        road: result.address?.road,
        city:
          result.address?.city ||
          result.address?.town ||
          result.address?.village ||
          result.address?.municipality,
        state: result.address?.state || result.address?.region,
        postcode: result.address?.postcode,
        country: result.address?.country,
      },
    };
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}

/**
 * Convert coordinates to address (Reverse Geocoding)
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<GeocodingResult | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
      {
        headers: {
          "User-Agent": "TransportApp/1.0",
        },
      }
    );

    if (!response.ok) {
      throw new Error("Reverse geocoding failed");
    }

    const data = await response.json();

    if (!data) {
      return null;
    }

    return {
      latitude,
      longitude,
      displayName: data.display_name,
      address: {
        road: data.address?.road,
        city:
          data.address?.city || data.address?.town || data.address?.village,
        state: data.address?.state,
        postcode: data.address?.postcode,
        country: data.address?.country,
      },
    };
  } catch (error) {
    console.error("Reverse geocoding error:", error);
    return null;
  }
}
