export interface ProspectarRequest {
  latitud: number;
  longitud: number;
  radio?: number;
  tipos?: string[];
}

export interface ProspectarResponse {
  success: boolean;
  prospectos: unknown[];
  estadisticas: {
    total_prospectos: number;
    oportunidades_web: number;
    oportunidades_b2b: number;
    calificacion_promedio: number | null;
  };
}

export interface ApiError {
  success: boolean;
  error: string;
  detalles?: unknown;
}

export interface HealthResponse {
  estado: 'activo' | 'deteriorado';
  timestamp: string;
  version: string;
}