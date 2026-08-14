import { supabase } from '../config/supabase';

const RATE_LIMIT_MAX_POR_DIA = parseInt(
  process.env.RATE_LIMIT_MAX_POR_DIA ?? '10',
  10,
);
const PRESUPUESTO_MENSUAL_GOOGLE = parseInt(
  process.env.PRESUPUESTO_MENSUAL_GOOGLE ?? '800',
  10,
);

export interface ResultadoVerificacionLimites {
  permitido: boolean;
  motivo?: 'diario' | 'mensual';
}

function fechaDiaUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function fechaMesUtc(): string {
  return new Date().toISOString().slice(0, 7);
}

function clavePorDia(ip: string): string {
  return `ip:${ip}:${fechaDiaUtc()}`;
}

function claveMensual(): string {
  return `global:${fechaMesUtc()}`;
}

/**
 * Incrementa el contador de la clave de forma atómica y devuelve
 * si el consumo sigue dentro del máximo permitido.
 */
async function consumirClave(clave: string, maximo: number): Promise<boolean> {
  const { data, error } = await supabase.rpc('consumir_uso', {
    p_clave: clave,
    p_max: maximo,
  });

  if (error) throw new Error(error.message);
  return Boolean(data);
}

/**
 * Verifica (y consume) el presupuesto mensual global y el límite
 * diario por IP. Si la verificación falla, se deniega el consumo para
 * proteger el presupuesto (fail-closed).
 */
export async function verificarLimites(
  ip: string,
): Promise<ResultadoVerificacionLimites> {
  const presupuestoOk = await consumirClave(
    claveMensual(),
    PRESUPUESTO_MENSUAL_GOOGLE,
  );
  if (!presupuestoOk) {
    return { permitido: false, motivo: 'mensual' };
  }

  const diarioOk = await consumirClave(clavePorDia(ip), RATE_LIMIT_MAX_POR_DIA);
  if (!diarioOk) {
    return { permitido: false, motivo: 'diario' };
  }

  return { permitido: true };
}
