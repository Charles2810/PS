export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface LocalizedText {
  text: string;
  languageCode?: string;
}

export interface PlaceLocation {
  lat: number;
  lng: number;
}

/** Respuesta del endpoint POST /places:searchNearby (Google Places API v1) */
export interface GooglePlace {
  id: string;
  name: string;
  displayName: LocalizedText;
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  websiteUri?: string;
  googleMapsUri?: string;
  location: PlaceLocation;
  types?: string[];
  primaryTypeDisplayName?: LocalizedText;
}

export interface GooglePlacesSearchResponse {
  places?: GooglePlace[];
  nextPageToken?: string;
  status?: string;
  errorMessage?: string;
}

export interface GooglePlacesError {
  error?: {
    code: number;
    message: string;
    status: string;
  };
}

/** Body de la petición a Google Places API v5 : searchNearby */
export interface NearbySearchRequest {
  locationRestriction: {
    circle: {
      center: LatLng;
      radius: number;
    };
  };
  includedTypes?: string[];
  excludedTypes?: string[];
  maxResultCount?: number;
  languageCode?: string;
  regionCode?: string;
}