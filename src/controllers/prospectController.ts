import { Request, Response } from 'express';
import { prospectar } from '../services/prospector';
import { ProspectarRequest } from '../types/api';
import { DEFAULT_RADIO_METROS, TIPOS_POR_DEFECTO } from '../config/google-places';
import { logger } from '../middleware/logger';
import { ApiError } from '../middleware/errorHandler';

/**
 * POST /api/prospectar
 * Recibe latitud, longitud y radio. Consulta Google Places, aplica las
 * Reglas de Negocio e inserta prospectos y diagnósticos en Supabase.
 */
export async function prospectarHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const body = req.body as ProspectarRequest;

  logger.info('Inicio de prospección', {
    latitud: body.latitud,
    longitud: body.longitud,
    radio: body.radio ?? DEFAULT_RADIO_METROS,
  });

  const resultado = await prospectar(
    body.latitud,
    body.longitud,
    body.radio ?? DEFAULT_RADIO_METROS,
    body.tipos ?? TIPOS_POR_DEFECTO,
  );

  logger.info('Prospección completada', resultado);

  res.status(200).json({
    success: true,
    resultado,
  });
}

/** GET /api/health — verificación simple de disponibilidad */
export function healthHandler(_req: Request, res: Response): void {
  res.status(200).json({
    estado: 'activo',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? '1.0.0',
  });
}

export { ApiError };