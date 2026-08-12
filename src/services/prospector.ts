import { supabase } from '../config/supabase';
import {
  DEFAULT_MAX_RESULTADOS,
  DEFAULT_RADIO_METROS,
  getGooglePlacesApiKey,
  GOOGLE_PLACES_SEARCH_NEARBY,
  TIPOS_POR_DEFECTO,
} from '../config/google-places';
import {
  GooglePlace,
  GooglePlacesSearchResponse,
  NearbySearchRequest,
} from '../types/google-places';
import {
  Diagnostico,
  Prioridad,
  Prospecto,
  ScoreDiagnostico,
  SERVICIO_B2B,
  SERVICIO_LANDING,
} from '../types/supabase';

export interface ResultadoProspeccion {
  prospectosTotal: number;
  prospectosInsertados: number;
  diagnosticosInsertados: number;
  errores: string[];
}

/** Umbral de actividad para Regla B (Sistemas B2B) */
const UMBRAL_RESENIAS_B2B = 150;

const TIMEOUT_GOOGLE = 10_000;

/**
 * Client del fetch hacia Google Places API v1 (searchNearby).
 */
async function buscarLugaresCercanos(
  latitud: number,
  longitud: number,
  radio: number,
  tipos: string[],
): Promise<GooglePlace[]> {
  const body: NearbySearchRequest = {
    locationRestriction: {
      circle: {
        center: { latitude: latitud, longitude: longitud },
        radius: radio,
      },
    },
    includedTypes: tipos.length > 0 ? tipos : TIPOS_POR_DEFECTO,
    maxResultCount: DEFAULT_MAX_RESULTADOS,
    languageCode: 'es',
    regionCode: 'PE',
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_GOOGLE);

  try {
    const response = await fetch(GOOGLE_PLACES_SEARCH_NEARBY, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': getGooglePlacesApiKey(),
        'X-Goog-FieldMask':
          'places.id,places.name,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.websiteUri,places.googleMapsUri,places.location',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Google Places API error ${response.status}: ${errorText}`,
      );
    }

    const data = (await response.json()) as GooglePlacesSearchResponse;
    return data.places ?? [];
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Reglas de Negocio:
 * - Regla A (Web): sin websiteUri -> Landing Page. Prioridad Alta.
 * - Regla B (B2B): userRatingCount > 150 -> Sistema de Gestión B2B.
 *   Prioridad Alta si no tiene web, Media si ya tiene.
 * Un mismo negocio puede calificar para ambas reglas a la vez.
 */
export function evaluarReglasNegocio(place: GooglePlace): ScoreDiagnostico[] {
  const ligas: ScoreDiagnostico[] = [];

  const tieneWeb = place.websiteUri ? place.websiteUri.trim().length > 0 : false;
  const altoVolumen = (place.userRatingCount ?? 0) > UMBRAL_RESENIAS_B2B;

  // Regla A
  if (!tieneWeb) {
    ligas.push({
      servicio: SERVICIO_LANDING,
      prioridad: 'Alta',
    });
  }

  // Regla B
  if (altoVolumen) {
    ligas.push({
      servicio: SERVICIO_B2B,
      prioridad: tieneWeb ? 'Media' : 'Alta',
    });
  }

  return ligas;
}

/**
 * Genera el argumento de venta en texto, listo para copiar a correos/WhatsApp.
 */
export function generarArgumentoVenta(
  place: GooglePlace,
  servicio: string,
): string {
  const nombre = place.displayName?.text ?? 'Este negocio';
  const calificacion = place.rating
    ? `una calificación de ${place.rating}/5`
    : 'una calificación destacada';
  const reseñas = place.userRatingCount
    ? `${place.userRatingCount} reseñas`
    : 'gran número de reseñas';

  if (servicio === SERVICIO_LANDING) {
    return (
      `Hola ${nombre}: hemos notado que cuenta con ${reseñas} y ${calificacion}, ` +
      `pero actualmente NO tiene presencia web. Esto está dejando fuera a clientes ` +
      `que buscan su tipo de negocio en Google. Le propongo desarrollar una landing ` +
      `page optimizada para posicionarlo en el mercado digital.`
    );
  }

  return (
    `Hola ${nombre}: con ${reseñas}, su volumen de operaciones claramente está ` +
    `creciendo. El manejo de clientes y pedidos en Excel o papel empieza a colapsar ` +
    `y a generar errores. Le propongo migrar a una base de datos relacional y un ` +
    `sistema de gestión a medida que centralice sus procesos.`
  );
}

function convertirPlaceAProspecto(place: GooglePlace): Prospecto {
  const urlWeb = place.websiteUri?.trim() || undefined;
  return {
    nombre: place.displayName?.text ?? place.name,
    direccion: place.formattedAddress,
    latitud: place.location?.lat ?? 0,
    longitud: place.location?.lng ?? 0,
    cantidad_resenias: place.userRatingCount ?? 0,
    calificacion: place.rating,
    tiene_web: Boolean(urlWeb),
    url_web: urlWeb,
    place_id: place.id,
  };
}

/**
 * Flujo principal: busca lugares, evalúa reglas e inserta todo en Supabase.
 */
export async function prospectar(
  latitud: number,
  longitud: number,
  radio: number = DEFAULT_RADIO_METROS,
  tipos: string[] = TIPOS_POR_DEFECTO,
): Promise<ResultadoProspeccion> {
  const lugares = await buscarLugaresCercanos(latitud, longitud, radio, tipos);

  const errores: string[] = [];
  let prospectosInsertados = 0;
  let diagnosticosInsertados = 0;

  for (const place of lugares) {
    try {
      const prospecto = convertirPlaceAProspecto(place);
      const scores = evaluarReglasNegocio(place);

      // Solo guardamos si al menos califica para una oportunidad
      if (scores.length === 0) continue;

      const { data: fila, error: errProspecto } = await supabase
        .from('prospectos')
        .upsert(prospecto, { onConflict: 'place_id' })
        .select('id')
        .single();

      if (errProspecto) throw new Error(errProspecto.message);
      if (!fila) throw new Error('No se pudo obtener el id del prospecto');

      const diagnosticos: Diagnostico[] = scores.map((s) => ({
        prospecto_id: fila.id,
        servicio_sugerido: s.servicio,
        prioridad: s.prioridad as Prioridad,
        argumento_venta: generarArgumentoVenta(place, s.servicio),
      }));

      const { error: errDiagnostico } = await supabase
        .from('diagnosticos')
        .insert(diagnosticos);

      if (errDiagnostico) throw new Error(errDiagnostico.message);

      prospectosInsertados += 1;
      diagnosticosInsertados += diagnosticos.length;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      errores.push(`Lugar "${place.displayName?.text ?? place.id}": ${msg}`);
    }
  }

  return {
    prospectosTotal: lugares.length,
    prospectosInsertados,
    diagnosticosInsertados,
    errores,
  };
}