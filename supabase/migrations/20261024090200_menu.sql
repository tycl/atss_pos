create table public.categories (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index categories_merchant_id_idx on public.categories (merchant_id);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  name text not null,
  price_sen integer not null check (price_sen >= 0),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index items_merchant_id_idx on public.items (merchant_id);
create index items_category_id_idx on public.items (category_id);

create table public.modifier_groups (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  name text not null,
  required boolean not null default false,
  max_select integer not null default 1 check (max_select >= 1),
  created_at timestamptz not null default now()
);

create index modifier_groups_merchant_id_idx on public.modifier_groups (merchant_id);

create table public.modifiers (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  group_id uuid not null references public.modifier_groups (id) on delete cascade,
  name text not null,
  price_sen integer not null default 0,
  created_at timestamptz not null default now()
);

create index modifiers_merchant_id_idx on public.modifiers (merchant_id);
create index modifiers_group_id_idx on public.modifiers (group_id);

create table public.item_modifier_groups (
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  item_id uuid not null references public.items (id) on delete cascade,
  group_id uuid not null references public.modifier_groups (id) on delete cascade,
  primary key (item_id, group_id)
);

create index item_modifier_groups_merchant_id_idx on public.item_modifier_groups (merchant_id);
