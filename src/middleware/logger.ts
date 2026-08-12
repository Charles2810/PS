function log(nivel: string, mensaje: string, meta?: unknown): void {
  const ts = new Date().toISOString();
  const linea = `[${ts}] [${nivel.toUpperCase()}] ${mensaje}`;
  const detalle = meta ? ` ${JSON.stringify(meta)}` : '';
  const stream = nivel === 'error' ? console.error : console.log;
  stream(linea + detalle);
}

export const logger = {
  info: (mensaje: string, meta?: unknown) => log('info', mensaje, meta),
  warn: (mensaje: string, meta?: unknown) => log('warn', mensaje, meta),
  error: (mensaje: string, meta?: unknown) => log('error', mensaje, meta),
  debug: (mensaje: string, meta?: unknown) => {
    if ((process.env.LOG_LEVEL ?? 'info') === 'debug') {
      log('debug', mensaje, meta);
    }
  },
};