-- Returns the merchant_id(s) the currently authenticated user belongs to.
-- security definer + owned by postgres so it can read merchant_users without
-- being blocked by merchant_users' own RLS policy (avoids recursive policy
-- evaluation); callers only ever get back their own memberships.
create or replace function public.current_merchant_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select merchant_id
  from public.merchant_users
  where user_id = auth.uid()
$$;

revoke all on function public.current_merchant_ids() from public;
grant execute on function public.current_merchant_ids() to authenticated;

-- Every tenant table is gated by the same rule: a row is visible/writable
-- only if its merchant_id is one of the caller's merchants. authenticated
-- gets table-level privileges below; RLS policies then filter by row.
grant select, insert, update, delete on
  public.merchants,
  public.merchant_users,
  public.outlets,
  public.devices,
  public.staff,
  public.settings,
  public.categories,
  public.items,
  public.modifier_groups,
  public.modifiers,
  public.item_modifier_groups,
  public.tables,
  public.orders,
  public.order_lines,
  public.payments,
  public.shifts,
  public.audit_log
to authenticated;

alter table public.merchants enable row level security;
alter table public.merchant_users enable row level security;
alter table public.outlets enable row level security;
alter table public.devices enable row level security;
alter table public.staff enable row level security;
alter table public.settings enable row level security;
alter table public.categories enable row level security;
alter table public.items enable row level security;
alter table public.modifier_groups enable row level security;
alter table public.modifiers enable row level security;
alter table public.item_modifier_groups enable row level security;
alter table public.tables enable row level security;
alter table public.orders enable row level security;
alter table public.order_lines enable row level security;
alter table public.payments enable row level security;
alter table public.shifts enable row level security;
alter table public.audit_log enable row level security;

-- merchants: no merchant_id column on itself, so gate by membership directly.
-- Insert is open to any authenticated user -- that's how merchant signup
-- creates the tenant row before any membership exists yet (see
-- merchant_users policy below for how ownership is then claimed).
create policy "merchants_select" on public.merchants
  for select using (id in (select public.current_merchant_ids()));

create policy "merchants_insert" on public.merchants
  for insert to authenticated with check (true);

create policy "merchants_update" on public.merchants
  for update using (id in (select public.current_merchant_ids()))
  with check (id in (select public.current_merchant_ids()));

create policy "merchants_delete" on public.merchants
  for delete using (id in (select public.current_merchant_ids()));

-- merchant_users: a user can see their merchant's full membership list.
-- Insert is allowed either to bootstrap ownership of a brand-new merchant
-- (no members yet) or by an existing owner adding another member.
create policy "merchant_users_select" on public.merchant_users
  for select using (merchant_id in (select public.current_merchant_ids()));

create policy "merchant_users_insert" on public.merchant_users
  for insert to authenticated with check (
    (
      role = 'owner'
      and user_id = auth.uid()
      and not exists (
        select 1 from public.merchant_users existing
        where existing.merchant_id = merchant_users.merchant_id
      )
    )
    or exists (
      select 1 from public.merchant_users owner_row
      where owner_row.merchant_id = merchant_users.merchant_id
        and owner_row.user_id = auth.uid()
        and owner_row.role = 'owner'
    )
  );

create policy "merchant_users_update" on public.merchant_users
  for update using (
    exists (
      select 1 from public.merchant_users owner_row
      where owner_row.merchant_id = merchant_users.merchant_id
        and owner_row.user_id = auth.uid()
        and owner_row.role = 'owner'
    )
  );

create policy "merchant_users_delete" on public.merchant_users
  for delete using (
    exists (
      select 1 from public.merchant_users owner_row
      where owner_row.merchant_id = merchant_users.merchant_id
        and owner_row.user_id = auth.uid()
        and owner_row.role = 'owner'
    )
  );

-- All remaining tables share one shape: merchant_id must be one of the
-- caller's merchants, for every command.
do $$
declare
  tenant_table text;
begin
  foreach tenant_table in array array[
    'outlets', 'devices', 'staff', 'settings',
    'categories', 'items', 'modifier_groups', 'modifiers', 'item_modifier_groups',
    'tables', 'orders', 'order_lines', 'payments', 'shifts', 'audit_log'
  ]
  loop
    execute format(
      'create policy "%1$s_tenant_isolation" on public.%1$s
         for all using (merchant_id in (select public.current_merchant_ids()))
         with check (merchant_id in (select public.current_merchant_ids()))',
      tenant_table
    );
  end loop;
end;
$$;
