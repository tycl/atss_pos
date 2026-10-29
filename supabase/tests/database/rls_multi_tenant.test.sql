begin;
select plan(9);

-- Two merchants, each with their own owner, to prove isolation holds.
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at
) values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner-a@test.local', '', now(), now(), now()),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner-b@test.local', '', now(), now(), now());

insert into public.merchants (id, name) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Merchant A'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Merchant B');

insert into public.merchant_users (merchant_id, user_id, role) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'owner'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'owner');

insert into public.outlets (id, merchant_id, name) values
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Outlet A'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Outlet B');

insert into public.categories (id, merchant_id, name) values
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Drinks A'),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Drinks B');

insert into public.items (id, merchant_id, category_id, name, price_sen) values
  ('99999999-9999-9999-9999-999999999999', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Kopi A', 350);

-- Act as merchant A's owner.
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select results_eq(
  $$ select name from public.merchants order by name $$,
  array['Merchant A'],
  'owner A sees only merchant A'
);

select results_eq(
  $$ select name from public.outlets order by name $$,
  array['Outlet A'],
  'owner A sees only outlet A'
);

select results_eq(
  $$ select name from public.categories order by name $$,
  array['Drinks A'],
  'owner A sees only merchant A categories'
);

select results_eq(
  $$ select name from public.items order by name $$,
  array['Kopi A'],
  'owner A sees only merchant A items (joined through category)'
);

select throws_like(
  $$ insert into public.categories (merchant_id, name) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Hack') $$,
  '%row-level security%',
  'owner A cannot insert a category into merchant B'
);

select throws_like(
  $$ update public.categories set name = 'Hacked' where merchant_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' $$,
  '%row-level security%',
  'owner A cannot update merchant B categories'
);

select is(
  (select count(*)::int from public.categories where id = 'ffffffff-ffff-ffff-ffff-ffffffffffff'),
  0,
  'owner A cannot even see merchant B category row by id'
);

-- Switch to merchant B's owner.
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

select results_eq(
  $$ select name from public.categories order by name $$,
  array['Drinks B'],
  'owner B sees only merchant B categories'
);

select throws_like(
  $$ insert into public.merchant_users (merchant_id, user_id, role)
     values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'owner') $$,
  '%row-level security%',
  'owner B cannot grant themself access to merchant A'
);

select * from finish();
rollback;
