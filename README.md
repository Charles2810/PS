# Sistema Automatizado de Prospección de Clientes

Sistema que busca negocios locales vía la **Google Places API (v1)**, evalúa su
madurez tecnológica según dos reglas de negocio y guarda prospectos con
oportunidades de venta automáticas en **Supabase**.

## Reglas de negocio

| Regla | Condición | Servicio sugerido | Prioridad |
| --- | --- | --- | --- |
| A (Web) | `websiteUri` ausente/vacío | Desarrollo de Landing Page / Presencia Digital | Alta |
| B (B2B) | `userRatingCount > 150` | Migración a Base de Datos Relacional y Sistema de Gestión | Alta si no tiene web, Media si sí |

Un negocio puede calificar para ambas reglas a la vez.

## Estructura

```
.
├── api/                      # Vercel Functions (POST /api/prospectar, GET /api/health)
├── src/
│   ├── app.ts                # App Express (Render / local)
│   ├── index.ts              # Entrypoint (servidor local)
│   ├── config/               # Cliente Supabase + config Google Places
│   ├── controllers/          # Handlers HTTP
│   ├── middleware/           # errorHandler, validator, logger
│   ├── routes/               # Definición de rutas Express
│   ├── services/prospector.ts# Lógica principal + reglas de negocio
│   └── types/                # Tipos estrictos (TS) para Places y DB
├── supabase/schema.sql       # Tablas prospectos + diagnosticos + RLS
├── vercel.json
├── render.yaml
└── package.json
```

## Configuración local

```bash
npm install
cp .env.example .env   # completa SUPABASE_URL, SUPABASE_KEY, GOOGLE_PLACES_API_KEY
npm run dev            # http://localhost:3000/api/health
```

### Base de datos

1. Crea un proyecto en [Supabase](https://supabase.com).
2. Abre **SQL Editor** y pega el contenido de `supabase/schema.sql`.
3. Copia desde *Project Settings → API*: `URL` y `anon key` (o `service_role` para producción).

### APIs de Google

1. Crea un proyecto en [Google Cloud Console](https://console.cloud.google.com).
2. Habilita la **Places API (nueva)**.
3. Crea una API key y restringe su uso a Places API.

## Uso del endpoint

```bash
curl -X POST http://localhost:3000/api/prospectar \
  -H "Content-Type: application/json" \
  -d '{
    "latitud": -12.046374,
    "longitud": -77.042793,
    "radio": 5000,
    "tipos": ["restaurant", "store"]
  }'
```

El backend:
1. Llama a `places:searchNearby` con el círculo (centro + radio).
2. Evalúa Regla A y Regla B.
3. Inserta `prospectos` (upsert por `place_id`) y sus `diagnosticos` en Supabase.
4. Devuelve un resumen de insertados y errores.

## Límites de uso

Para no superar el tier gratuito de la Google Places API (~1.000 llamadas/mes),
las funciones de Vercel verifican dos límites antes de llamar a Google
(`src/services/rateLimiter.ts`, contadores atómicos en Supabase, tabla `limites_uso`):

| Límite | Clave env | Default |
| --- | --- | --- |
| Consultas por IP al día | `RATE_LIMIT_MAX_POR_DIA` | `10` |
| Presupuesto mensual global | `PRESUPUESTO_MENSUAL_GOOGLE` | `800` |

Al excederse se responde `429 Too Many Requests`. El límite por IP se reinicia
a las 00:00 UTC; el mensual el día 1. Los conteos son por clave (`ip:{ip}:{día}` y
`global:{mes}`) y se incrementan de forma atómica vía el RPC `consumir_uso`,
por lo que son compartidos entre todas las instancias serverless.

> Cada `POST /api/prospectar` autorizado equivale a **1 llamada** a Google Places
> (los 20 resultados vienen en una sola respuesta). El presupuesto se consume
> de forma conservadora: incluso las peticiones que luego fallan restan del contador.

## Despliegue

### Opción 1: Vercel (funciones serverless)

1. Impulsa este repo a GitHub.
2. En Vercel: *Add New Project* → importa el repo. Vercel detectará las rutas `api/*.ts` automáticamente.
3. Añade las variables de entorno: `SUPABASE_URL`, `SUPABASE_KEY`, `GOOGLE_PLACES_API_KEY`, `CORS_ORIGIN`, `RATE_LIMIT_MAX_POR_DIA`, `PRESUPUESTO_MENSUAL_GOOGLE`.
4. *Deploy*. Nuestros endpoints quedan en:
   - `https://TU-PROYECTO.vercel.app/api/prospectar`
   - `https://TU-PROYECTO.vercel.app/api/health`

> `vercel.json` ya configura runtime nodejs20, memoria 1024 MB y timeout 30 s.

### Opción 2: Render (Web Service)

1. En Render: *New → Web Service* → conecta el repo.
2. **Build Command:** `npm install && npm run build`
3. **Start Command:** `npm start`
4. Añade las variables de entorno (mismas que Vercel).
5. *Create Web Service*. Queda en `https://TU-SERVICIO.onrender.com/api/prospectar`.

> Nota: en Render el `render.yaml` opcional permite desplegar vía Blueprint.

## Scripts

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Ejecuta con ts-node en watch |
| `npm run build` | Compila TypeScript a `dist/` |
| `npm start` | Sirve `dist/src/index.js` |
| `npm run type-check` | Verifica tipos sin emitir |