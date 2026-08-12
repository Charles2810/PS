export const GOOGLE_PLACES_BASE_URL = 'https://places.googleapis.com/v1';
export const GOOGLE_PLACES_SEARCH_NEARBY =
  `${GOOGLE_PLACES_BASE_URL}/places:searchNearby`;

export const DEFAULT_RADIO_METROS = 5000;
export const DEFAULT_MAX_RESULTADOS = 20;

export const TIPOS_POR_DEFECTO = [
  'restaurant',
  'store',
  'cafe',
  'bank',
  'clothing_store',
  'hardware_store',
];

export function getGooglePlacesApiKey(): string {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key || key.trim() === '') {
    throw new Error('Falta la variable de entorno: GOOGLE_PLACES_API_KEY');
  }
  return key;
}