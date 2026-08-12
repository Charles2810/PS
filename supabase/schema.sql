-- ============================================================
-- SISTEMA DE PROSPECCION DE CLIENTES (Supabase / PostgreSQL)
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

-- Extensión para generar UUIDs
create extension if not exists "pgcrypto";

-- ============================================================
-- TABLA: prospectos
-- Almacena los negocios detectados via Google Places API
-- ============================================================
create table if not exists public.prospectos (
    id               uuid        primary key default gen_random_uuid(),
    nombre           text        not null,
    direccion        text,
    latitud          numeric(10, 8) not null,
    longitud         numeric(11, 8) not null,
    cantidad_resenias integer    not null default 0,
    calificacion     numeric(3, 2),
    tiene_web        boolean     not null default false,
    url_web          text,
    place_id         text        unique,
    created_at       timestamptz not null default now()
);

-- Índices para rendimiento en búsquedas por ubicación y reseñas
create index if not exists idx_prospectos_ubicacion on public.prospectos (latitud, longitud);
create index if not exists idx_prospectos_resenias  on public.prospectos (cantidad_resenias);
create index if not exists idx_prospectos_tiene_web  on public.prospectos (tiene_web);

-- ============================================================
-- TABLA: diagnosticos
-- Oportunidades generadas por las Reglas de Negocio (1 a N con prospectos)
-- ============================================================
create table if not exists public.diagnosticos (
    id                uuid        primary key default gen_random_uuid(),
    prospecto_id      uuid        not null references public.prospectos (id) on delete cascade,
    servicio_sugerido text        not null,
    prioridad         text        not null check (prioridad in ('Alta', 'Media', 'Baja')),
    argumento_venta   text        not null,
    created_at        timestamptz not null default now()
);

create index if not exists idx_diagnosticos_prospecto on public.diagnosticos (prospecto_id);
create index if not exists idx_diagnosticos_prioridad on public.diagnosticos (prioridad);

-- ============================================================
-- TRIGGER: actualizar updated_at
-- ============================================================
alter table public.prospectos add column if not exists updated_at timestamptz not null default now();

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create or replace trigger trg_prospectos_updated_at
    before update on public.prospectos
    for each row execute function public.set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
alter table public.prospectos   enable row level security;
alter table public.diagnosticos enable row level security;

-- Política de lectura: cualquiera puede consultar (para dashboard / reportes)
create policy "prospectos_select_policy"
    on public.prospectos for select using (true);

create policy "diagnosticos_select_policy"
    on public.diagnosticos for select using (true);

-- Política de inserción: el servicio backend (service_role) inserta datos.
-- El service_role bypassa RLS automáticamente; esta política permite la
-- inserción mediante la anon key para facilitar pruebas locales.
create policy "prospectos_insert_policy"
    on public.prospectos for insert with check (true);

create policy "diagnosticos_insert_policy"
    on public.diagnosticos for insert with check (true);

-- Política de actualización: solo el service_role actualiza (usando true se perm
-- el update desde la anon key; restrigir a service_role revocando el grant).
create policy "prospectos_update_policy"
    on public.prospectos for update using (true) with check (true);

create policy "diagnosticos_update_policy"
    on public.diagnosticos for update using (true) with check (true);

-- ============================================================
-- LIMPIEZA DE PERMISOS RECOMENDADA (producción):
-- Revocar la anon key y dejar SOLO el service_role en el backend:
-- revoke all on public.prospectos   from anon;
-- revoke all on public.diagnosticos from anon;
-- grant select, insert, update on public.prospectos   to service_role;
-- grant select, insert, update on public.diagnosticos to service_role;
-- ============================================================