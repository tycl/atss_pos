create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  outlet_id uuid not null references public.outlets (id) on delete cascade,
  device_id uuid not null references public.devices (id) on delete restrict,
  opened_by uuid references public.staff (id),
  opened_at timestamptz not null default now(),
  opening_float_sen integer not null default 0,
  closed_by uuid references public.staff (id),
  closed_at timestamptz,
  counted_cash_sen integer,
  expected_cash_sen integer,
  variance_sen integer,
  created_at timestamptz not null default now()
);

create index shifts_merchant_id_idx on public.shifts (merchant_id);
create index shifts_outlet_id_idx on public.shifts (outlet_id);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  staff_id uuid references public.staff (id),
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_merchant_id_idx on public.audit_log (merchant_id);
