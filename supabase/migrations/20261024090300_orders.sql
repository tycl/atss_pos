create table public.tables (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  outlet_id uuid not null references public.outlets (id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index tables_merchant_id_idx on public.tables (merchant_id);
create index tables_outlet_id_idx on public.tables (outlet_id);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  outlet_id uuid not null references public.outlets (id) on delete cascade,
  device_id uuid not null references public.devices (id) on delete restrict,
  order_no text not null,
  type text not null check (type in ('dine_in', 'takeaway')),
  table_id uuid references public.tables (id) on delete set null,
  status text not null default 'open' check (status in ('open', 'paid', 'void')),
  subtotal_sen integer not null default 0,
  service_charge_sen integer not null default 0,
  sst_sen integer not null default 0,
  rounding_sen integer not null default 0,
  total_sen integer not null default 0,
  created_by uuid references public.staff (id),
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  synced_at timestamptz,
  unique (outlet_id, order_no)
);

create index orders_merchant_id_idx on public.orders (merchant_id);
create index orders_outlet_id_idx on public.orders (outlet_id);
create index orders_device_id_idx on public.orders (device_id);

create table public.order_lines (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  item_id uuid references public.items (id) on delete set null,
  name_snapshot text not null,
  unit_price_sen integer not null check (unit_price_sen >= 0),
  qty integer not null check (qty > 0),
  modifiers_snapshot jsonb not null default '[]'::jsonb,
  line_total_sen integer not null check (line_total_sen >= 0),
  note text,
  status text not null default 'active' check (status in ('active', 'void')),
  void_reason text,
  created_at timestamptz not null default now()
);

create index order_lines_merchant_id_idx on public.order_lines (merchant_id);
create index order_lines_order_id_idx on public.order_lines (order_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  method text not null check (method in ('cash', 'duitnow_qr')),
  amount_sen integer not null check (amount_sen >= 0),
  cash_received_sen integer,
  change_sen integer,
  reference text,
  created_at timestamptz not null default now()
);

create index payments_merchant_id_idx on public.payments (merchant_id);
create index payments_order_id_idx on public.payments (order_id);
