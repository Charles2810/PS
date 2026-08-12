export type Prioridad = 'Alta' | 'Media' | 'Baja';

export const SERVICIO_LANDING = 'Desarrollo de Landing Page / Presencia Digital';
export const SERVICIO_B2B = 'Migración a Base de Datos Relacional y Sistema de Gestión';

export type ServicioSugerido =
  | typeof SERVICIO_LANDING
  | typeof SERVICIO_B2B;

export interface Prospecto {
  id?: string;
  nombre: string;
  direccion?: string;
  latitud: number;
  longitud: number;
  cantidad_resenias: number;
  calificacion?: number;
  tiene_web: boolean;
  url_web?: string;
  place_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Diagnostico {
  id?: string;
  prospecto_id: string;
  servicio_sugerido: ServicioSugerido;
  prioridad: Prioridad;
  argumento_venta: string;
  created_at?: string;
}

export interface ScoreDiagnostico {
  servicio: ServicioSugerido;
  prioridad: Prioridad;
}

export interface ProspectoConDiagnosticos extends Prospecto {
  diagnosticos: Diagnostico[];
}