import { createClient, SupabaseClient } from '@supabase/supabase-js';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Falta la variable de entorno: ${name}`);
  }
  return value;
}

/**
 * Cliente de Supabase. Inicializado con la anon key (cliente público).
 * Nota: para operaciones de escritura en producción se recomienda usar
 * la key service_role únicamente desde el backend.
 */
export function createSupabaseClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL || requireEnv('SUPABASE_URL');
  const key = process.env.SUPABASE_KEY || requireEnv('SUPABASE_KEY');

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export const supabase = createSupabaseClient();