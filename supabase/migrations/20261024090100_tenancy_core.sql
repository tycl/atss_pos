-- merchants: the tenant root
create table public.merchants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  ssm_no text,
  sst_no text,
  address text,
  phone text,
  logo_url text,
  plan text not null default 'trial',
  status text not null default 'active' check (status in ('active', 'suspended', 'cancelled')),
  created_at timestamptz not null default now()
);

-- merchant_users: maps a Supabase Auth user (owner/manager signed in on a
-- device or in the back office) to the merchant(s) they can access.
-- Cashiers never get a row here -- they authenticate locally via staff PIN
-- on a device that is already signed in as an owner/manager (see `staff`).
create table public.merchant_users (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'manager')),
  created_at timestamptz not null default now(),
  unique (merchant_id, user_id)
);

create index merchant_users_user_id_idx on public.merchant_users (user_id);
create index merchant_users_merchant_id_idx on public.merchant_users (merchant_id);

create table public.outlets (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  name text not null,
  address text,
  receipt_footer text,
  created_at timestamptz not null default now()
);

create index outlets_merchant_id_idx on public.outlets (merchant_id);

create table public.devices (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  outlet_id uuid not null references public.outlets (id) on delete cascade,
  label text not null,
  receipt_prefix text not null,
  created_at timestamptz not null default now()
);

create index devices_merchant_id_idx on public.devices (merchant_id);
create index devices_outlet_id_idx on public.devices (outlet_id);

create table public.staff (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  name text not null,
  role text not null check (role in ('owner', 'manager', 'cashier')),
  pin_hash text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index staff_merchant_id_idx on public.staff (merchant_id);

create table public.settings (
  outlet_id uuid primary key references public.outlets (id) on delete cascade,
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  sst_enabled boolean not null default false,
  sst_rate_bp integer not null default 0,
  service_charge_enabled boolean not null default false,
  service_charge_rate_bp integer not null default 0,
  cash_rounding_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create index settings_merchant_id_idx on public.settings (merchant_id);
