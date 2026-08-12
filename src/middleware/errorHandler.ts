import { NextFunction, Request, Response } from 'express';

export class ApiError extends Error {
  statusCode: number;
  detalles?: unknown;

  constructor(statusCode: number, mensaje: string, detalles?: unknown) {
    super(mensaje);
    this.statusCode = statusCode;
    this.detalles = detalles;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ success: false, error: 'Ruta no encontrada' });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      detalles: err.detalles,
    });
    return;
  }

  const message =
    err instanceof Error ? err.message : 'Error interno del servidor';
  console.error('[errorHandler]', err);
  res.status(500).json({ success: false, error: message });
}

/** Captura errores en controladores async sin try-catch repetido */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}