import { prospectar } from '../src/services/prospector';
import { verificarLimites } from '../src/services/rateLimiter';
import { logger } from '../src/middleware/logger';
import { DEFAULT_RADIO_METROS, TIPOS_POR_DEFECTO } from '../src/config/google-places';

export const config = {
  runtime: 'nodejs',
};

/**
 * Vercel Function: POST /api/prospectar
 */
export async function POST(request: Request) {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      return Response.json(
        { success: false, error: 'El cuerpo de la petición no es JSON válido' },
        { status: 400 },
      );
    }

    const latitud = Number(body.latitud);
    const longitud = Number(body.longitud);

    if (
      Number.isNaN(latitud) ||
      Number.isNaN(longitud) ||
      latitud < -90 ||
      latitud > 90 ||
      longitud < -180 ||
      longitud > 180
    ) {
      return Response.json(
        { success: false, error: 'Parámetros inválidos: latitud y longitud son requeridos' },
        { status: 400 },
      );
    }

    const radio = body.radio ?? DEFAULT_RADIO_METROS;
    const tipos = Array.isArray(body.tipos) && body.tipos.length > 0
      ? body.tipos
      : TIPOS_POR_DEFECTO;

    const ip =
      request.headers.get('x-real-ip') ??
      request.headers.get('x-forwarded-for') ??
      'desconocido';

    const limite = await verificarLimites(ip);
    if (!limite.permitido) {
      const mensaje =
        limite.motivo === 'mensual'
          ? 'Se alcanzó el presupuesto mensual de consultas. Inténtalo el próximo mes.'
          : 'Alcanzaste el límite diario de consultas. Inténtalo mañana.';
      return Response.json({ success: false, error: mensaje }, { status: 429 });
    }

    logger.info('Vercel: inicio de prospección', { latitud, longitud, radio });

    const resultado = await prospectar(latitud, longitud, radio, tipos);

    return Response.json({ success: true, resultado });
  } catch (err) {
    logger.error('Vercel: error en prospectar', err);
    return Response.json(
      { success: false, error: err instanceof Error ? err.message : 'Error interno' },
      { status: 500 },
    );
  }
}

export function GET() {
  return Response.json({ estado: 'activo', timestamp: new Date().toISOString() });
}