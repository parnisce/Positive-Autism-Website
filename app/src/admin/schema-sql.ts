/**
 * Run this once in Supabase (SQL Editor → New query → paste → Run).
 * Row level security is on: visitors' browsers (the publishable key) can only read public data;
 * everything that changes data goes through the server with the secret key.
 */
export const SCHEMA_SQL = `create table if not exists public.settings (
  key text primary key,
  value jsonb not null
);
create table if not exists public.posts (
  id bigint generated always as identity primary key,
  slug text unique not null,
  title text not null,
  excerpt text not null default '',
  body text not null default '',
  cover text not null default '',
  published boolean not null default false,
  cats text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.products (
  id bigint primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create table if not exists public.images (
  id text primary key,
  mime text not null,
  data text not null,
  created_at timestamptz not null default now()
);
create table if not exists public.stats (
  day date not null,
  kind text not null,
  key text not null,
  n bigint not null default 0,
  primary key (day, kind, key)
);

alter table public.settings enable row level security;
alter table public.posts enable row level security;
alter table public.products enable row level security;
alter table public.images enable row level security;
alter table public.stats enable row level security;

drop policy if exists "public reads content" on public.settings;
create policy "public reads content" on public.settings for select to anon using (key in ('content', 'categories', 'seed_imported'));
drop policy if exists "public reads published posts" on public.posts;
create policy "public reads published posts" on public.posts for select to anon using (published);
drop policy if exists "public reads products" on public.products;
create policy "public reads products" on public.products for select to anon using (true);
drop policy if exists "public reads images" on public.images;
create policy "public reads images" on public.images for select to anon using (true);

create or replace function public.bump_stats(rows jsonb) returns void
language sql security definer set search_path = public as $$
  insert into public.stats (day, kind, key, n)
  select (r->>'day')::date, r->>'kind', r->>'key', 1 from jsonb_array_elements(rows) r
  on conflict (day, kind, key) do update set n = public.stats.n + 1
$$;
grant execute on function public.bump_stats(jsonb) to anon, authenticated;
`;

/** Already installed? Run just this once to add blog categories (safe to run again). */
export const UPDATE_SQL = `alter table public.posts add column if not exists cats text[] not null default '{}';

drop policy if exists "public reads content" on public.settings;
create policy "public reads content" on public.settings for select to anon
  using (key in ('content', 'categories', 'seed_imported'));
`;
