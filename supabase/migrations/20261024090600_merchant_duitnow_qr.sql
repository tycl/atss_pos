-- Static DuitNow QR image the owner sets up once in back-office settings;
-- shown to customers at checkout for QR payments (no money passes through
-- this system -- the cashier just confirms receipt and records a reference).
alter table public.merchants add column duitnow_qr_url text;
