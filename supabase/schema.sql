-- DeliveryOS — Supabase Schema
-- Ejecutar en Supabase SQL Editor

create extension if not exists pgcrypto;

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  rut text,
  address text,
  contact_person text,
  contact_email text,
  contact_phone text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password_hash text not null,
  role text not null check (role in ('admin', 'driver', 'company')),
  company_id uuid references companies(id) on delete set null,
  active boolean not null default true,
  phone text,
  vehicle text,
  license_plate text,
  location jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists routes (
  id uuid primary key default gen_random_uuid(),
  route_code text not null unique,
  name text,
  date timestamptz not null default now(),
  driver_id uuid references app_users(id) on delete set null,
  company_id uuid references companies(id) on delete set null,
  status text not null default 'active' check (status in ('draft', 'active', 'paused', 'completed', 'cancelled')),
  stats jsonb not null default '{"total":0,"delivered":0,"failed":0,"pending":0,"totalAmount":0,"collectedAmount":0}'::jsonb,
  notes text,
  share_token text unique,
  start_point jsonb not null default '{}'::jsonb,
  distance_km numeric,
  driver_payout numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists packages (
  id uuid primary key default gen_random_uuid(),
  tracking_id text not null unique,
  route_id uuid references routes(id) on delete set null,
  company_id uuid references companies(id) on delete set null,
  customer_name text not null,
  customer_last_name text,
  customer_phone text,
  address text not null,
  commune text,
  apt_floor text,
  zone text,
  price numeric not null default 0,
  lat double precision,
  lng double precision,
  stop_order integer not null default 0,
  status text not null default 'pendiente' check (status in ('pendiente', 'entregado', 'no-entregado', 'devuelto', 'eliminado')),
  fail_reason text,
  note text,
  photo_url text,
  photo_public_id text,
  photo_uploaded_at timestamptz,
  photo2_url text,
  photo2_public_id text,
  photo2_uploaded_at timestamptz,
  delivered_at timestamptz,
  delivered_by uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists price_configs (
  id uuid primary key default gen_random_uuid(),
  commune text not null unique,
  price numeric not null default 0,
  zone text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric not null default 0,
  tiers jsonb not null default '[]'::jsonb,
  color text not null default '#0052FF',
  source text not null default 'custom' check (source in ('commune', 'custom')),
  polygon jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Índices
create index if not exists idx_routes_date on routes(date desc);
create index if not exists idx_routes_status on routes(status);
create index if not exists idx_packages_route_id on packages(route_id);
create index if not exists idx_packages_status on packages(status);
create index if not exists idx_packages_company_id on packages(company_id);
create index if not exists idx_packages_created_at on packages(created_at desc);
create index if not exists idx_packages_tracking_id on packages(tracking_id);

-- RLS (el backend usa service_role_key que bypasea RLS)
alter table companies enable row level security;
alter table app_users enable row level security;
alter table routes enable row level security;
alter table packages enable row level security;
alter table price_configs enable row level security;
alter table zones enable row level security;
