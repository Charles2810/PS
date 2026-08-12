/**
 * Vercel Function: GET /api/health
 */
export function GET() {
  return Response.json({
    estado: 'activo',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? '1.0.0',
  });
}