-- QuantumMine AI — full schema for a new database.
--
-- Paste this whole file into the Supabase SQL editor on an empty project.
-- It creates the tables, row-level security, and every money movement.
-- Do not run the old CoffeeUG migrations. This file replaces them.
--
-- Money model:
--   * The wallet balance is always the sum of public.ledger_entries.
--   * Every credit has a unique idempotency key, so a retry cannot pay twice.
--   * Amounts are whole shillings (UGX).
--   * Members never write money tables. Writes go through the functions below.
--
-- Business rules:
--   * Trading products pay their own listed daily income for their own term.
--   * Daily income is credited at 20:00 Africa/Kampala ("8PM daily").
--   * Referral commission is 10% on level 1 and 1% on level 2, paid when a
--     downline member activates a product. Deposits do not pay commission.
--   * Registration bonus is UGX 1,000.
--   * Deposits start at UGX 5,000. Withdrawals start at UGX 3,000, carry a
--     15% fee, and stay UNASSIGNED until an admin sends them.
--   * On Saturday and Sunday (Africa/Kampala), a product priced strictly above
--     UGX 100,000 credits 5% of that price back to the buyer.

create extension if not exists pgcrypto;

do $$ begin
  create type public.app_role as enum ('admin', 'user');
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  full_name      text,
  username       text unique,
  phone          text,
  referral_code  text unique not null,
  referred_by    uuid references public.profiles(id),
  is_banned      boolean not null default false,
  created_at     timestamptz not null default now()
);

create table if not exists public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role    public.app_role not null,
  primary key (user_id, role)
);

-- Admin-readable credential mirror. No policies: only the service role can read it.
create table if not exists public.user_secrets (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  password   text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  price        numeric(14,2) not null,
  daily_income numeric(14,2) not null,
  days         integer not null,
  category     text not null default 'product' check (category in ('product', 'bonus')),
  image_url    text,
  sort_order   integer not null default 0,
  active       boolean not null default true
);

create table if not exists public.orders (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  product_id       uuid references public.products(id),
  product_name     text not null,
  product_category text not null default 'product',
  price            numeric(14,2) not null,
  daily_income     numeric(14,2) not null,
  days             integer not null,
  days_claimed     integer not null default 0,
  first_payout_at  timestamptz,
  next_payout_at   timestamptz,
  status           text not null default 'active' check (status in ('active', 'completed')),
  note             text,
  admin_note       text,
  created_at       timestamptz not null default now()
);

create table if not exists public.ledger_entries (
  id              bigserial primary key,
  key             text not null unique,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  type            text not null check (type in (
                    'signup_bonus', 'deposit', 'purchase', 'daily_income',
                    'commission', 'withdrawal', 'withdrawal_fee', 'adjustment', 'cashback',
                    'gift', 'checkin', 'transfer'
                  )),
  -- recharge: deposits and money moved in, spent on products.
  -- income: earnings. Withdraw from here, or transfer into recharge.
  wallet          text not null default 'income' check (wallet in ('recharge', 'income')),
  amount          numeric(14,2) not null,
  note            text,
  source_order_id uuid references public.orders(id) on delete set null,
  source_user_id  uuid references public.profiles(id) on delete set null,
  referral_level  integer,
  created_at      timestamptz not null default now()
);

create table if not exists public.payments (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles(id) on delete cascade,
  type               text not null check (type in ('DEPOSIT', 'WITHDRAWAL')),
  mode               text not null default 'MARZPAY'
                     check (mode in ('MARZPAY', 'MANUAL', 'UNASSIGNED')),
  status             text not null default 'PENDING'
                     check (status in ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'CANCELLED')),
  provider           text check (provider in ('MTN', 'AIRTEL')),
  amount             numeric(14,2) not null,
  fee                numeric(14,2) not null default 0,
  net_amount         numeric(14,2) not null default 0,
  phone_number       text not null,
  external_reference text not null unique,
  provider_tx_uuid   text,
  provider_reference text,
  failure_reason     text,
  admin_note         text,
  reviewed_by        uuid references public.profiles(id),
  reviewed_at        timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table if not exists public.referrals (
  referrer_id   uuid not null references public.profiles(id) on delete cascade,
  referee_id    uuid primary key references public.profiles(id) on delete cascade,
  referral_code text not null default '',
  created_at    timestamptz not null default now()
);

create table if not exists public.app_settings (
  id                   int primary key default 1 check (id = 1),
  welcome_message      text not null default '',
  telegram_channel_url text not null default 'https://t.me/+x70pBloGZDNmYjg0',
  telegram_support_url text not null default 'https://t.me/+x70pBloGZDNmYjg0',
  about_text           text not null default '',
  -- 20 == 8PM Africa/Kampala. Daily income lands at this hour.
  payout_hour          integer not null default 20 check (payout_hour between 0 and 23),
  daily_rate_percent   numeric(6,2) not null default 10,
  term_days            integer not null default 20,
  signup_bonus         numeric(14,2) not null default 1000,
  deposit_min          numeric(14,2) not null default 5000,
  deposit_max          numeric(14,2) not null default 10000000,
  withdraw_min         numeric(14,2) not null default 3000,
  withdraw_max         numeric(14,2) not null default 5000000,
  withdraw_fee_rate    numeric(6,4) not null default 0.15,
  withdraw_start       text not null default '08:00',
  withdraw_end         text not null default '20:00',
  withdraw_auto        boolean not null default false,
  frozen               boolean not null default false,
  checkin_weekday      numeric(14,2) not null default 200,
  checkin_weekend      numeric(14,2) not null default 500
);

insert into public.app_settings (id) values (1) on conflict (id) do nothing;

-- Upgrade a database created before the two wallets, gift codes, and check-in.
alter table public.ledger_entries
  add column if not exists wallet text not null default 'income';

alter table public.app_settings
  add column if not exists checkin_weekday numeric(14,2) not null default 200;
alter table public.app_settings
  add column if not exists checkin_weekend numeric(14,2) not null default 500;

do $$
declare
  cname text;
begin
  for cname in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'ledger_entries'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%signup_bonus%'
  loop
    execute format('alter table public.ledger_entries drop constraint %I', cname);
  end loop;
end $$;

alter table public.ledger_entries
  drop constraint if exists ledger_entries_type_check;
alter table public.ledger_entries
  add constraint ledger_entries_type_check
  check (type in (
    'signup_bonus', 'deposit', 'purchase', 'daily_income',
    'commission', 'withdrawal', 'withdrawal_fee', 'adjustment', 'cashback',
    'gift', 'checkin', 'transfer'
  ));

alter table public.ledger_entries
  drop constraint if exists ledger_entries_wallet_check;
alter table public.ledger_entries
  add constraint ledger_entries_wallet_check
  check (wallet in ('recharge', 'income'));

update public.ledger_entries
set wallet = 'recharge'
where type in ('deposit', 'purchase');

create index if not exists ledger_user_idx         on public.ledger_entries (user_id, created_at desc);
create index if not exists ledger_type_idx         on public.ledger_entries (type);
create index if not exists orders_user_status_idx  on public.orders (user_id, status);
create index if not exists payments_user_idx       on public.payments (user_id, created_at desc);
create index if not exists payments_type_status    on public.payments (type, status);
create index if not exists profiles_referred_idx   on public.profiles (referred_by);
create index if not exists profiles_code_upper_idx on public.profiles (upper(btrim(referral_code)));
create index if not exists profiles_username_idx   on public.profiles (lower(btrim(username)));

create unique index if not exists ledger_commission_order_level_uidx
  on public.ledger_entries (source_order_id, referral_level)
  where type = 'commission' and source_order_id is not null;

-- ---------------------------------------------------------------------------
-- 2. Settings, roles, and the 8PM payout clock
-- ---------------------------------------------------------------------------

create or replace function public.settings()
returns public.app_settings
language sql
stable
as $$
  select * from public.app_settings where id = 1;
$$;

create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles where user_id = uid and role = 'admin'
  );
$$;

create or replace function public.generate_referral_code()
returns text
language plpgsql
as $$
declare
  code text;
begin
  loop
    code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    exit when not exists (select 1 from public.profiles where referral_code = code);
  end loop;
  return code;
end;
$$;

create or replace function public.referral_rate(_level integer)
returns numeric
language sql
stable
as $$
  select case _level when 1 then 10.0 when 2 then 1.0 else 0 end;
$$;

-- The first daily return lands at the next 8PM Kampala strictly after purchase.
create or replace function public.first_payout_at(_created_at timestamptz)
returns timestamptz
language sql
stable
as $$
  with s as (select payout_hour from public.app_settings where id = 1),
  local as (
    select
      (_created_at at time zone 'Africa/Kampala')::date as d,
      (_created_at at time zone 'Africa/Kampala')::time as t,
      (select payout_hour from s) as h
  )
  select case
    when local.t < make_time(local.h, 0, 0)
      then ((local.d + make_time(local.h, 0, 0)) at time zone 'Africa/Kampala')
    else ((local.d + 1 + make_time(local.h, 0, 0)) at time zone 'Africa/Kampala')
  end
  from local;
$$;

create or replace function public.program_elapsed_days(_created_at timestamptz, _days integer)
returns integer
language sql
stable
as $$
  select greatest(0, least(
    _days,
    case
      when now() < public.first_payout_at(_created_at) then 0
      else 1 + floor(
        extract(epoch from (now() - public.first_payout_at(_created_at))) / 86400
      )::integer
    end
  ));
$$;

create or replace function public.payout_at(_created_at timestamptz, _index integer)
returns timestamptz
language sql
stable
as $$
  select public.first_payout_at(_created_at) + make_interval(days => greatest(0, _index - 1));
$$;

create or replace function public.withdraw_window_open(_start text default null, _end text default null)
returns boolean
language plpgsql
stable
as $$
declare
  s public.app_settings;
  now_m integer;
  start_m integer;
  end_m integer;
  start_raw text;
  end_raw text;
begin
  select * into s from public.app_settings where id = 1;
  start_raw := coalesce(nullif(btrim(coalesce(_start, s.withdraw_start)), ''), '08:00');
  end_raw   := coalesce(nullif(btrim(coalesce(_end, s.withdraw_end)), ''), '20:00');

  now_m := extract(hour from timezone('Africa/Kampala', now()))::integer * 60
         + extract(minute from timezone('Africa/Kampala', now()))::integer;
  start_m := split_part(start_raw, ':', 1)::integer * 60 + split_part(start_raw, ':', 2)::integer;
  end_m   := split_part(end_raw, ':', 1)::integer * 60 + split_part(end_raw, ':', 2)::integer;

  if start_m = end_m then return true; end if;
  if start_m < end_m then return now_m >= start_m and now_m < end_m; end if;
  return now_m >= start_m or now_m < end_m;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Wallet
-- ---------------------------------------------------------------------------

drop function if exists public.ledger_append(uuid, text, numeric, text, text, uuid, uuid, integer);

create or replace function public.ledger_append(
  _user uuid,
  _type text,
  _amount numeric,
  _key text,
  _note text default null,
  _order uuid default null,
  _source_user uuid default null,
  _level integer default null,
  _wallet text default 'income'
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  bucket text := case when _wallet = 'recharge' then 'recharge' else 'income' end;
begin
  if _user is null or _amount is null or _amount = 0 then
    return false;
  end if;

  insert into public.ledger_entries (
    key, user_id, type, amount, note, source_order_id, source_user_id, referral_level, wallet
  ) values (
    _key, _user, _type, round(_amount, 2), _note, _order, _source_user, _level, bucket
  );
  return true;
exception when unique_violation then
  return false;
end;
$$;

create or replace function public.wallet_balance(_user uuid default auth.uid())
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(amount), 0)
  from public.ledger_entries
  where user_id = _user;
$$;

create or replace function public.reserved_balance(_user uuid default auth.uid())
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(amount), 0)
  from public.payments
  where user_id = _user
    and type = 'WITHDRAWAL'
    and status in ('PENDING', 'PROCESSING');
$$;

-- Earnings that can be withdrawn or moved into the recharge wallet.
create or replace function public.income_balance(_user uuid default auth.uid())
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(amount), 0)
  from public.ledger_entries
  where user_id = _user and wallet = 'income';
$$;

-- Money that can activate a product: deposits plus transfers in, minus purchases.
create or replace function public.recharge_balance(_user uuid default auth.uid())
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(amount), 0)
  from public.ledger_entries
  where user_id = _user and wallet = 'recharge';
$$;

create or replace function public.available_balance(_user uuid default auth.uid())
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select public.income_balance(_user) - public.reserved_balance(_user);
$$;

-- ---------------------------------------------------------------------------
-- 4. Signup, invite codes, and the referral graph
-- ---------------------------------------------------------------------------

create or replace function public.invite_code_from_meta(_meta jsonb)
returns text
language sql
immutable
as $$
  select upper(btrim(coalesce(
    nullif(_meta->>'invite_code', ''),
    nullif(_meta->>'invite', ''),
    nullif(_meta->>'ref', ''),
    ''
  )));
$$;

create or replace function public.find_referrer(_code text, _self uuid default null)
returns uuid
language plpgsql
stable
security definer
set search_path = public
set row_security = off
as $$
declare
  invite text := upper(btrim(coalesce(_code, '')));
  referrer uuid;
begin
  if invite = '' then return null; end if;
  select id into referrer
  from public.profiles
  where upper(btrim(referral_code)) = invite
    and (_self is null or id <> _self)
  limit 1;
  return referrer;
end;
$$;

create or replace function public.pay_referral_commissions(
  _buyer uuid,
  _order_id uuid,
  _amount numeric,
  _buyer_name text
)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  chain record;
  rate numeric;
  commission_amt numeric;
begin
  if _buyer is null or _order_id is null or coalesce(_amount, 0) <= 0 then
    return;
  end if;

  for chain in
    with recursive walk as (
      select coalesce(p.referred_by, r.referrer_id) as id, 1 as lvl, array[_buyer] as seen
      from public.profiles p
      left join public.referrals r on r.referee_id = p.id
      where p.id = _buyer
        and coalesce(p.referred_by, r.referrer_id) is not null
      union all
      select coalesce(p.referred_by, r.referrer_id), w.lvl + 1, w.seen || w.id
      from walk w
      join public.profiles p on p.id = w.id
      left join public.referrals r on r.referee_id = p.id
      where w.lvl < 2
        and coalesce(p.referred_by, r.referrer_id) is not null
        and not (coalesce(p.referred_by, r.referrer_id) = any (w.seen))
    )
    select w.id, w.lvl from walk w
    where w.id is not null and w.id <> _buyer
    order by w.lvl
  loop
    rate := public.referral_rate(chain.lvl);
    commission_amt := round(_amount * rate / 100.0, 2);
    if commission_amt <= 0 then continue; end if;

    perform public.ledger_append(
      chain.id,
      'commission',
      commission_amt,
      format('com:%s:L%s', _order_id, chain.lvl),
      format(
        'Level %s (%s%%) — %s',
        chain.lvl,
        trim(trailing '.' from trim(trailing '0' from rate::text)),
        coalesce(_buyer_name, 'Member')
      ),
      _order_id,
      _buyer,
      chain.lvl
    );
  end loop;
end;
$$;

-- A product bought before the invite is attached still pays commission once.
create or replace function public.settle_referral_commissions(_referee uuid)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  rec record;
begin
  if _referee is null then
    return;
  end if;

  for rec in
    select
      o.id,
      o.price,
      coalesce(nullif(btrim(p.full_name), ''), 'Member') as buyer_name
    from public.orders o
    join public.profiles p on p.id = o.user_id
    where o.user_id = _referee
      and o.product_category = 'product'
      and o.status in ('active', 'completed')
      and o.price > 0
  loop
    perform public.pay_referral_commissions(_referee, rec.id, rec.price, rec.buyer_name);
  end loop;
end;
$$;

create or replace function public.log_referral(_referrer uuid, _referee uuid, _code text)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  code text;
begin
  if _referrer is null or _referee is null or _referrer = _referee then
    return;
  end if;

  select upper(btrim(coalesce(nullif(_code, ''), referral_code, '')))
  into code from public.profiles where id = _referrer;

  insert into public.referrals (referrer_id, referee_id, referral_code)
  values (_referrer, _referee, coalesce(code, ''))
  on conflict (referee_id) do nothing;

  update public.profiles
  set referred_by = _referrer
  where id = _referee and referred_by is null;

  perform public.settle_referral_commissions(_referee);
end;
$$;

create or replace function public.grant_signup_bonus(_user uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  bonus numeric;
begin
  select signup_bonus into bonus from public.app_settings where id = 1;
  if coalesce(bonus, 0) <= 0 then return false; end if;

  return public.ledger_append(
    _user, 'signup_bonus', bonus, 'signup:' || _user::text, 'Registration bonus'
  );
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  invite text;
  referrer uuid;
  uname text;
begin
  invite := public.invite_code_from_meta(new.raw_user_meta_data);
  referrer := public.find_referrer(invite, new.id);
  uname := nullif(btrim(lower(coalesce(new.raw_user_meta_data->>'username', ''))), '');

  insert into public.profiles (id, full_name, username, phone, referral_code, referred_by)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data->>'full_name'), ''), 'Member'),
    uname,
    nullif(coalesce(new.raw_user_meta_data->>'phone', ''), ''),
    public.generate_referral_code(),
    referrer
  )
  on conflict (id) do update
    set referred_by = coalesce(public.profiles.referred_by, excluded.referred_by),
        username    = coalesce(public.profiles.username, excluded.username),
        full_name   = coalesce(nullif(btrim(public.profiles.full_name), ''), excluded.full_name);

  if referrer is not null then
    perform public.log_referral(referrer, new.id, invite);
  end if;

  perform public.grant_signup_bonus(new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.ensure_profile()
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  uid uuid := auth.uid();
  meta jsonb;
  invite text;
  referrer uuid;
  prof public.profiles%rowtype;
begin
  if uid is null then raise exception 'Not authenticated'; end if;

  select * into prof from public.profiles where id = uid;
  if not found then
    select raw_user_meta_data into meta from auth.users where id = uid;
    invite := public.invite_code_from_meta(meta);
    referrer := public.find_referrer(invite, uid);

    insert into public.profiles (id, full_name, username, phone, referral_code, referred_by)
    values (
      uid,
      coalesce(nullif(btrim(coalesce(meta->>'full_name', '')), ''), 'Member'),
      nullif(btrim(lower(coalesce(meta->>'username', ''))), ''),
      nullif(coalesce(meta->>'phone', ''), ''),
      public.generate_referral_code(),
      referrer
    )
    on conflict (id) do nothing;

    if referrer is not null then
      perform public.log_referral(referrer, uid, invite);
    end if;
    select * into prof from public.profiles where id = uid;
  end if;

  if prof.referral_code is null or btrim(prof.referral_code) = '' then
    update public.profiles set referral_code = public.generate_referral_code() where id = uid;
    select * into prof from public.profiles where id = uid;
  end if;

  if prof.referred_by is null then
    select raw_user_meta_data into meta from auth.users where id = uid;
    invite := public.invite_code_from_meta(meta);
    referrer := public.find_referrer(invite, uid);
    if referrer is not null then
      perform public.log_referral(referrer, uid, invite);
      select * into prof from public.profiles where id = uid;
    end if;
  elsif not exists (select 1 from public.referrals where referee_id = uid) then
    perform public.log_referral(
      prof.referred_by, uid,
      (select referral_code from public.profiles where id = prof.referred_by)
    );
  end if;

  perform public.grant_signup_bonus(uid);
  return to_jsonb(prof);
end;
$$;

create or replace function public.apply_invite(_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  uid uuid := auth.uid();
  referrer uuid;
  prof public.profiles%rowtype;
  in_downline boolean;
begin
  if uid is null then raise exception 'Not authenticated'; end if;

  select * into prof from public.profiles where id = uid;
  if not found then
    perform public.ensure_profile();
    select * into prof from public.profiles where id = uid;
  end if;
  if not found then
    return jsonb_build_object('ok', false, 'linked', false, 'reason', 'no_profile');
  end if;

  if prof.referred_by is not null then
    if not exists (select 1 from public.referrals where referee_id = uid) then
      perform public.log_referral(
        prof.referred_by, uid,
        (select referral_code from public.profiles where id = prof.referred_by)
      );
    end if;
    return jsonb_build_object('ok', true, 'linked', false, 'reason', 'already_linked');
  end if;

  referrer := public.find_referrer(_code, uid);
  if referrer is null then
    return jsonb_build_object('ok', false, 'linked', false, 'reason', 'invalid_code');
  end if;
  if referrer = uid
     or upper(btrim(coalesce(prof.referral_code, ''))) = upper(btrim(coalesce(_code, ''))) then
    return jsonb_build_object('ok', false, 'linked', false, 'reason', 'own_code');
  end if;

  select exists (
    with recursive down as (
      select id from public.profiles where referred_by = uid
      union
      select p.id from public.profiles p join down d on p.referred_by = d.id
    )
    select 1 from down where id = referrer
  ) into in_downline;
  if in_downline then
    return jsonb_build_object('ok', false, 'linked', false, 'reason', 'cycle');
  end if;

  perform public.log_referral(referrer, uid, _code);
  return jsonb_build_object('ok', true, 'linked', true, 'reason', 'linked');
end;
$$;

create or replace function public.invite_preview(_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
set row_security = off
as $$
declare
  rec public.profiles%rowtype;
  invite text := upper(btrim(coalesce(_code, '')));
begin
  if invite = '' then return jsonb_build_object('ok', false); end if;
  select * into rec from public.profiles
  where upper(btrim(referral_code)) = invite limit 1;
  if not found then return jsonb_build_object('ok', false); end if;
  return jsonb_build_object(
    'ok', true,
    'name', coalesce(nullif(btrim(rec.full_name), ''), 'QuantumMine AI member'),
    'code', rec.referral_code
  );
end;
$$;

create or replace function public.username_available(_username text)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select not exists (
    select 1 from public.profiles
    where lower(btrim(username)) = lower(btrim(coalesce(_username, '')))
  );
$$;

-- ---------------------------------------------------------------------------
-- 5. Activating a trading product
-- ---------------------------------------------------------------------------

create or replace function public.purchase_product(_product_id uuid, _note text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  prod public.products%rowtype;
  buyer public.profiles%rowtype;
  s public.app_settings;
  order_id uuid;
  avail numeric;
  has_product boolean;
  created timestamptz := now();
  cashback numeric := 0;
  kampala_dow integer;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  select * into s from public.app_settings where id = 1;
  if s.frozen then raise exception 'Activations are paused. Please try again later'; end if;

  select * into buyer from public.profiles where id = uid for update;
  if not found then raise exception 'Profile not found'; end if;
  if buyer.is_banned then raise exception 'Account is suspended'; end if;

  select * into prod from public.products where id = _product_id and active = true;
  if not found then raise exception 'That product is not available'; end if;

  if prod.category = 'bonus' then
    select exists (
      select 1 from public.orders o where o.user_id = uid and o.product_category = 'product'
    ) into has_product;
    if not has_product then
      raise exception 'Activate a trading product first to unlock this bonus';
    end if;
  end if;

  avail := public.recharge_balance(uid);
  if avail < prod.price then
    raise exception 'Not enough recharge balance. Deposit or transfer first';
  end if;

  insert into public.orders (
    user_id, product_id, product_name, product_category, price, daily_income,
    days, days_claimed, status, note, created_at, first_payout_at, next_payout_at
  ) values (
    uid, prod.id, prod.name, prod.category, prod.price, prod.daily_income,
    prod.days, 0, 'active', nullif(btrim(coalesce(_note, '')), ''), created,
    public.first_payout_at(created), public.first_payout_at(created)
  )
  returning id into order_id;

  perform public.ledger_append(
    uid, 'purchase', -prod.price, format('buy:%s', order_id), prod.name, order_id,
    null, null, 'recharge'
  );

  perform public.pay_referral_commissions(
    uid, order_id, prod.price, coalesce(buyer.full_name, 'Member')
  );

  -- Saturday = 6, Sunday = 0. Strictly above 100,000, so QM100 does not qualify.
  kampala_dow := extract(dow from (created at time zone 'Africa/Kampala'))::integer;
  if prod.price > 100000 and kampala_dow in (0, 6) then
    cashback := round(prod.price * 0.05, 0);
    if cashback > 0 then
      perform public.ledger_append(
        uid,
        'cashback',
        cashback,
        format('cashback:%s', order_id),
        format('Weekend cashback (5%%) — %s', prod.name),
        order_id
      );
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'order_id', order_id,
    'first_payout_at', public.first_payout_at(created),
    'cashback', cashback,
    'balance', public.wallet_balance(uid)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Daily income, credited at 8PM Africa/Kampala
-- ---------------------------------------------------------------------------

create or replace function public.claim_daily_income()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  rec public.orders%rowtype;
  elapsed integer;
  payable integer;
  credited numeric := 0;
  paid_days integer := 0;
  products integer := 0;
  d integer;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  if exists (select 1 from public.profiles where id = uid and is_banned) then
    raise exception 'Account is suspended';
  end if;

  for rec in
    select * from public.orders
    where user_id = uid and status = 'active'
    order by created_at
    for update
  loop
    elapsed := public.program_elapsed_days(rec.created_at, rec.days);
    payable := greatest(0, elapsed - rec.days_claimed);
    if payable <= 0 then continue; end if;

    for d in (rec.days_claimed + 1)..elapsed loop
      if public.ledger_append(
        uid,
        'daily_income',
        rec.daily_income,
        format('inc:%s:%s', rec.id, d),
        format('%s — day %s of %s', rec.product_name, d, rec.days),
        rec.id
      ) then
        credited := credited + rec.daily_income;
        paid_days := paid_days + 1;
      end if;
    end loop;

    update public.orders
    set days_claimed = elapsed,
        next_payout_at = case
          when elapsed >= rec.days then null
          else public.payout_at(rec.created_at, elapsed + 1)
        end,
        status = case when elapsed >= rec.days then 'completed' else 'active' end
    where id = rec.id;

    products := products + 1;
  end loop;

  if credited <= 0 then
    return jsonb_build_object('ok', false, 'amount', 0, 'days', 0, 'products', 0, 'reason', 'nothing_due');
  end if;

  return jsonb_build_object(
    'ok', true, 'amount', credited, 'days', paid_days, 'products', products,
    'reason', 'credited', 'balance', public.wallet_balance(uid)
  );
end;
$$;

create or replace function public.earnings_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  s public.app_settings;
  ready numeric := 0;
  ready_days integer := 0;
  daily numeric := 0;
  active_count integer := 0;
  next_at timestamptz;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  select * into s from public.app_settings where id = 1;

  select
    coalesce(sum(o.daily_income * greatest(0, public.program_elapsed_days(o.created_at, o.days) - o.days_claimed)), 0),
    coalesce(sum(greatest(0, public.program_elapsed_days(o.created_at, o.days) - o.days_claimed)), 0),
    coalesce(sum(o.daily_income), 0),
    count(*),
    min(public.payout_at(o.created_at, o.days_claimed + 1))
  into ready, ready_days, daily, active_count, next_at
  from public.orders o
  where o.user_id = uid and o.status = 'active';

  return jsonb_build_object(
    'ok', true,
    'balance', public.wallet_balance(uid),
    'recharge', public.recharge_balance(uid),
    'available', public.available_balance(uid),
    'reserved', public.reserved_balance(uid),
    'ready', ready,
    'ready_days', ready_days,
    'daily_rate', daily,
    'active_plants', active_count,
    'next_payout_at', next_at,
    'payout_hour', s.payout_hour,
    'total_deposited', (
      select coalesce(sum(amount), 0) from public.ledger_entries
      where user_id = uid and type = 'deposit'
    ),
    'plant_earned', (
      select coalesce(sum(amount), 0) from public.ledger_entries
      where user_id = uid and type = 'daily_income'
    ),
    'referral_earned', (
      select coalesce(sum(amount), 0) from public.ledger_entries
      where user_id = uid and type = 'commission'
    ),
    'total_withdrawn', (
      select coalesce(-sum(amount), 0) from public.ledger_entries
      where user_id = uid and type in ('withdrawal', 'withdrawal_fee')
    )
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. Team stats for levels 1 and 2
-- ---------------------------------------------------------------------------

create or replace function public.team_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
set row_security = off
as $$
declare
  uid uuid := auth.uid();
  result jsonb;
begin
  if uid is null then raise exception 'Not authenticated'; end if;

  with recursive walk as (
    select
      p.id,
      p.username,
      p.full_name,
      p.created_at,
      1 as lvl,
      coalesce(nullif(btrim(ref.referral_code), ''), nullif(btrim(up.referral_code), ''), '') as code,
      null::text as via_username
    from public.profiles p
    join public.profiles up on up.id = uid
    left join public.referrals ref
      on ref.referee_id = p.id
     and ref.referrer_id = uid
    where p.id <> uid
      and (p.referred_by = uid or ref.referrer_id = uid)

    union all

    select
      p.id,
      p.username,
      p.full_name,
      p.created_at,
      w.lvl + 1,
      coalesce(nullif(btrim(ref.referral_code), ''), nullif(btrim(parent.referral_code), ''), ''),
      w.username
    from walk w
    join public.profiles parent on parent.id = w.id
    join public.profiles p
      on p.id <> uid
     and p.id <> w.id
     and (
       p.referred_by = w.id
       or exists (
         select 1 from public.referrals r
         where r.referrer_id = w.id and r.referee_id = p.id
       )
     )
    left join public.referrals ref
      on ref.referee_id = p.id
     and ref.referrer_id = w.id
    where w.lvl < 2
  ),
  tree as (
    select distinct on (id)
      id, username, full_name, created_at, lvl, code, via_username
    from walk
    order by id, lvl
  ),
  invested as (
    select o.user_id, coalesce(sum(o.price), 0) as vol
    from public.orders o
    where o.product_category = 'product'
      and o.status in ('active', 'completed')
    group by o.user_id
  ),
  deposited as (
    select user_id, coalesce(sum(amount), 0) as dep
    from public.ledger_entries
    where type = 'deposit'
    group by user_id
  ),
  earned_from as (
    select source_user_id, referral_level, coalesce(sum(amount), 0) as earned
    from public.ledger_entries
    where user_id = uid
      and type = 'commission'
      and referral_level is not null
      and source_user_id is not null
    group by source_user_id, referral_level
  ),
  leveled as (
    select
      t.lvl as level,
      t.id,
      t.username,
      t.full_name,
      t.created_at,
      t.code,
      t.via_username,
      coalesce(v.vol, 0) as volume,
      coalesce(d.dep, 0) as deposited,
      coalesce(e.earned, 0) as earned
    from tree t
    left join invested v on v.user_id = t.id
    left join deposited d on d.user_id = t.id
    left join earned_from e
      on e.source_user_id = t.id
     and e.referral_level = t.lvl
  )
  select jsonb_build_object(
    'total_members', (select count(*) from tree),
    'total_volume', (select coalesce(sum(volume), 0) from leveled),
    'total_deposits', (select coalesce(sum(deposited), 0) from leveled),
    'total_earned', (select coalesce(sum(earned), 0) from leveled),
    'levels', (
      select coalesce(jsonb_agg(level_obj order by level), '[]'::jsonb)
      from (
        select g.level,
          jsonb_build_object(
            'level', g.level,
            'rate', public.referral_rate(g.level),
            'earned', coalesce(sum(l.earned), 0),
            'members', count(l.id),
            'deposits', coalesce(sum(l.deposited), 0),
            'volume', coalesce(sum(l.volume), 0),
            'members_list', coalesce(
              jsonb_agg(
                jsonb_build_object(
                  'name', l.full_name,
                  'username', l.username,
                  'joined_at', l.created_at,
                  'earned', l.earned,
                  'deposited', l.deposited,
                  'volume', l.volume,
                  'referral_code', nullif(l.code, ''),
                  'rate', public.referral_rate(g.level),
                  'via_username', l.via_username
                ) order by l.earned desc, l.volume desc, l.created_at
              ) filter (where l.id is not null),
              '[]'::jsonb
            )
          ) as level_obj
        from (select 1 as level union all select 2) g
        left join leveled l on l.level = g.level
        group by g.level
      ) s
    )
  ) into result;

  return result;
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. Withdrawals: reserve on request, settle on confirmation
-- ---------------------------------------------------------------------------

create or replace function public.request_withdrawal(
  _amount numeric,
  _phone text,
  _provider text default null,
  _reference text default null,
  _mode text default 'UNASSIGNED'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  s public.app_settings;
  avail numeric;
  fee numeric;
  net numeric;
  pay_id uuid;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  select * into s from public.app_settings where id = 1;

  if s.frozen then raise exception 'Withdrawals are temporarily paused'; end if;
  if exists (select 1 from public.profiles where id = uid and is_banned) then
    raise exception 'Account is suspended';
  end if;
  if not public.withdraw_window_open(s.withdraw_start, s.withdraw_end) then
    raise exception 'Withdrawals are open % - % (Africa/Kampala)', s.withdraw_start, s.withdraw_end;
  end if;
  if _amount is null or _amount < s.withdraw_min then
    raise exception 'Minimum withdrawal is UGX %', trunc(s.withdraw_min);
  end if;
  if _amount > s.withdraw_max then
    raise exception 'Maximum withdrawal is UGX %', trunc(s.withdraw_max);
  end if;

  avail := public.available_balance(uid);
  if _amount > avail then
    raise exception 'Amount is more than your available balance (UGX %)', trunc(avail);
  end if;

  fee := round(_amount * s.withdraw_fee_rate, 2);
  net := _amount - fee;

  -- _mode is ignored. Only an admin sets MARZPAY or MANUAL.
  insert into public.payments (
    user_id, type, mode, status, provider, amount, fee, net_amount,
    phone_number, external_reference
  ) values (
    uid, 'WITHDRAWAL', 'UNASSIGNED', 'PENDING', nullif(_provider, ''), _amount, fee, net,
    _phone, coalesce(nullif(btrim(coalesce(_reference, '')), ''), gen_random_uuid()::text)
  )
  returning id into pay_id;

  return jsonb_build_object(
    'ok', true, 'payment_id', pay_id, 'mode', 'UNASSIGNED',
    'amount', _amount, 'fee', fee, 'net', net,
    'available', public.available_balance(uid)
  );
end;
$$;

create or replace function public.settle_payment(
  _payment_id uuid,
  _ok boolean,
  _reason text default null,
  _provider_tx text default null,
  _reviewer uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.payments%rowtype;
begin
  select * into p from public.payments where id = _payment_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  if p.status in ('SUCCESS', 'FAILED', 'CANCELLED') then
    return jsonb_build_object('ok', true, 'reason', 'already_final', 'status', p.status);
  end if;

  if _ok then
    update public.payments
    set status = 'SUCCESS',
        provider_tx_uuid = coalesce(_provider_tx, provider_tx_uuid),
        reviewed_by = coalesce(_reviewer, reviewed_by),
        reviewed_at = case when _reviewer is not null then now() else reviewed_at end,
        updated_at = now()
    where id = p.id;

    if p.type = 'DEPOSIT' then
      perform public.ledger_append(
        p.user_id, 'deposit', p.amount,
        format('dep:%s', p.id),
        format('Deposit %s', coalesce(p.provider, 'mobile money')),
        null, null, null, 'recharge'
      );
    else
      perform public.ledger_append(
        p.user_id, 'withdrawal', -p.net_amount,
        format('wd:%s', p.id),
        format('Withdrawal to %s', p.phone_number)
      );
      if p.fee > 0 then
        perform public.ledger_append(
          p.user_id, 'withdrawal_fee', -p.fee,
          format('wdfee:%s', p.id), 'Withdrawal fee'
        );
      end if;
    end if;
  else
    update public.payments
    set status = 'FAILED',
        failure_reason = coalesce(_reason, 'Payment was not completed'),
        reviewed_by = coalesce(_reviewer, reviewed_by),
        reviewed_at = case when _reviewer is not null then now() else reviewed_at end,
        updated_at = now()
    where id = p.id;
  end if;

  return jsonb_build_object(
    'ok', true, 'status', case when _ok then 'SUCCESS' else 'FAILED' end,
    'balance', public.wallet_balance(p.user_id)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 9. Admin
-- ---------------------------------------------------------------------------

create or replace function public.admin_update_product(
  _product_id uuid,
  _name text default null,
  _price numeric default null,
  _daily_income numeric default null,
  _days integer default null,
  _category text default null,
  _active boolean default null,
  _apply_to_running boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  prod public.products%rowtype;
  touched integer := 0;
begin
  if uid is not null and not public.is_admin(uid) then
    raise exception 'Admin access required';
  end if;

  select * into prod from public.products where id = _product_id;
  if not found then raise exception 'Product not found'; end if;
  if _days is not null and _days < 1 then raise exception 'Days must be at least 1'; end if;
  if _price is not null and _price < 0 then raise exception 'Price cannot be negative'; end if;
  if _daily_income is not null and _daily_income < 0 then
    raise exception 'Daily return cannot be negative';
  end if;
  if _category is not null and _category not in ('product', 'bonus') then
    raise exception 'Category must be product or bonus';
  end if;

  update public.products
  set name = coalesce(nullif(btrim(_name), ''), name),
      price = coalesce(_price, price),
      daily_income = coalesce(_daily_income, daily_income),
      days = coalesce(_days, days),
      category = coalesce(_category, category),
      active = coalesce(_active, active)
  where id = _product_id
  returning * into prod;

  if _apply_to_running then
    update public.orders o
    set product_name = prod.name,
        daily_income = prod.daily_income,
        days = greatest(prod.days, o.days_claimed),
        product_category = prod.category,
        status = case when o.days_claimed >= greatest(prod.days, o.days_claimed)
                 then 'completed' else 'active' end
    where o.product_id = _product_id and o.status = 'active';
    get diagnostics touched = row_count;
  end if;

  return jsonb_build_object('ok', true, 'product', to_jsonb(prod), 'orders_updated', touched);
end;
$$;

create or replace function public.admin_adjust_wallet(
  _user uuid,
  _amount numeric,
  _note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is not null and not public.is_admin(uid) then
    raise exception 'Admin access required';
  end if;
  if _amount is null or _amount = 0 then raise exception 'Enter an amount'; end if;

  perform public.ledger_append(
    _user, 'adjustment', _amount,
    format('adj:%s:%s', _user, gen_random_uuid()),
    coalesce(nullif(btrim(_note), ''), 'Admin adjustment')
  );

  return jsonb_build_object('ok', true, 'balance', public.wallet_balance(_user));
end;
$$;

-- ---------------------------------------------------------------------------
-- 10. Row level security
-- ---------------------------------------------------------------------------

alter table public.profiles       enable row level security;
alter table public.user_roles     enable row level security;
alter table public.user_secrets   enable row level security;
alter table public.products       enable row level security;
alter table public.orders         enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.payments       enable row level security;
alter table public.referrals      enable row level security;
alter table public.app_settings   enable row level security;

drop policy if exists profiles_self_select on public.profiles;
create policy profiles_self_select on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

drop policy if exists roles_self_select on public.user_roles;
create policy roles_self_select on public.user_roles
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

drop policy if exists products_read on public.products;
create policy products_read on public.products
  for select to anon, authenticated using (active or public.is_admin());

drop policy if exists orders_self_select on public.orders;
create policy orders_self_select on public.orders
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

drop policy if exists ledger_self_select on public.ledger_entries;
create policy ledger_self_select on public.ledger_entries
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

drop policy if exists payments_self_select on public.payments;
create policy payments_self_select on public.payments
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

drop policy if exists referrals_self_select on public.referrals;
create policy referrals_self_select on public.referrals
  for select to authenticated
  using (referrer_id = auth.uid() or referee_id = auth.uid() or public.is_admin());

drop policy if exists settings_read on public.app_settings;
create policy settings_read on public.app_settings
  for select to anon, authenticated using (true);

drop policy if exists settings_admin_write on public.app_settings;
create policy settings_admin_write on public.app_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 11. Transfer, gift codes, and check-in
-- ---------------------------------------------------------------------------

create table if not exists public.gift_codes (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  amount      numeric(14,2) not null check (amount > 0),
  max_uses    integer not null default 1 check (max_uses > 0),
  uses        integer not null default 0 check (uses >= 0),
  note        text,
  active      boolean not null default true,
  created_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now()
);

create table if not exists public.gift_redemptions (
  id           uuid primary key default gen_random_uuid(),
  gift_code_id uuid not null references public.gift_codes(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  amount       numeric(14,2) not null,
  created_at   timestamptz not null default now(),
  unique (gift_code_id, user_id)
);

create table if not exists public.checkins (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  claimed_on date not null,
  amount     numeric(14,2) not null,
  created_at timestamptz not null default now(),
  primary key (user_id, claimed_on)
);

create index if not exists gift_codes_code_idx on public.gift_codes (upper(btrim(code)));

-- Move available earnings into the recharge wallet. Products are bought from recharge.
create or replace function public.transfer_to_recharge(_amount numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  avail numeric;
  moved numeric;
  xfer uuid := gen_random_uuid();
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  if exists (select 1 from public.profiles where id = uid and is_banned) then
    raise exception 'Account is suspended';
  end if;
  if exists (select 1 from public.app_settings where id = 1 and frozen) then
    raise exception 'Transfers are paused. Please try again later';
  end if;

  moved := round(coalesce(_amount, 0), 0);
  if moved <= 0 then raise exception 'Enter an amount to transfer'; end if;

  perform 1 from public.profiles where id = uid for update;
  avail := public.available_balance(uid);
  if moved > avail then
    raise exception 'Amount is more than your available balance (UGX %)', trunc(avail);
  end if;

  perform public.ledger_append(
    uid, 'transfer', -moved, format('xfer-out:%s', xfer),
    'Transfer to recharge wallet', null, null, null, 'income'
  );
  perform public.ledger_append(
    uid, 'transfer', moved, format('xfer-in:%s', xfer),
    'Transfer from available balance', null, null, null, 'recharge'
  );

  return jsonb_build_object(
    'ok', true,
    'amount', moved,
    'recharge', public.recharge_balance(uid),
    'available', public.available_balance(uid)
  );
end;
$$;

create or replace function public.admin_create_gift_code(
  _amount numeric,
  _code text default null,
  _max_uses integer default 1,
  _note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  gift text;
  rec public.gift_codes%rowtype;
begin
  if uid is not null and not public.is_admin(uid) then
    raise exception 'Admin access required';
  end if;
  if _amount is null or _amount <= 0 then raise exception 'Enter a gift amount'; end if;
  if coalesce(_max_uses, 1) < 1 then raise exception 'Uses must be at least 1'; end if;

  gift := upper(btrim(coalesce(_code, '')));
  if gift = '' then
    gift := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  end if;
  if gift !~ '^[A-Z0-9]{4,16}$' then
    raise exception 'Use 4–16 letters or numbers';
  end if;

  insert into public.gift_codes (code, amount, max_uses, note, created_by)
  values (gift, round(_amount, 0), coalesce(_max_uses, 1), nullif(btrim(coalesce(_note, '')), ''), uid)
  returning * into rec;

  return jsonb_build_object('ok', true, 'code', rec.code, 'id', rec.id, 'amount', rec.amount);
end;
$$;

create or replace function public.redeem_gift_code(_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  gift public.gift_codes%rowtype;
  entered text := upper(btrim(coalesce(_code, '')));
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  if entered = '' then raise exception 'Enter a gift code'; end if;
  if exists (select 1 from public.profiles where id = uid and is_banned) then
    raise exception 'Account is suspended';
  end if;
  if exists (select 1 from public.app_settings where id = 1 and frozen) then
    raise exception 'Gift codes are paused. Please try again later';
  end if;

  select * into gift from public.gift_codes where upper(btrim(code)) = entered for update;
  if not found or not gift.active then raise exception 'That gift code is not valid'; end if;
  if gift.uses >= gift.max_uses then raise exception 'That gift code has already been used'; end if;
  if exists (
    select 1 from public.gift_redemptions where gift_code_id = gift.id and user_id = uid
  ) then
    raise exception 'You have already used this gift code';
  end if;

  update public.gift_codes set uses = uses + 1 where id = gift.id;

  insert into public.gift_redemptions (gift_code_id, user_id, amount)
  values (gift.id, uid, gift.amount);

  perform public.ledger_append(
    uid, 'gift', gift.amount, format('gift:%s:%s', gift.id, uid),
    format('Gift code %s', gift.code), null, null, null, 'income'
  );

  return jsonb_build_object(
    'ok', true,
    'amount', gift.amount,
    'code', gift.code,
    'available', public.available_balance(uid)
  );
end;
$$;

create or replace function public.checkin_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  s public.app_settings;
  today date := (now() at time zone 'Africa/Kampala')::date;
  dow integer;
  weekend boolean;
  reward numeric;
  claimed boolean;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  select * into s from public.app_settings where id = 1;
  dow := extract(dow from today)::integer;
  weekend := dow in (0, 6);
  reward := case when weekend then s.checkin_weekend else s.checkin_weekday end;
  select exists (
    select 1 from public.checkins where user_id = uid and claimed_on = today
  ) into claimed;

  return jsonb_build_object(
    'ok', true,
    'claimed', claimed,
    'weekend', weekend,
    'reward', reward,
    'weekday', s.checkin_weekday,
    'weekend_reward', s.checkin_weekend,
    'date', today
  );
end;
$$;

create or replace function public.claim_checkin()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  s public.app_settings;
  today date := (now() at time zone 'Africa/Kampala')::date;
  dow integer;
  weekend boolean;
  reward numeric;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  if exists (select 1 from public.profiles where id = uid and is_banned) then
    raise exception 'Account is suspended';
  end if;

  select * into s from public.app_settings where id = 1;
  if s.frozen then raise exception 'Check-in is paused. Please try again later'; end if;

  perform 1 from public.profiles where id = uid for update;
  if exists (select 1 from public.checkins where user_id = uid and claimed_on = today) then
    return jsonb_build_object('ok', false, 'reason', 'already', 'amount', 0);
  end if;

  dow := extract(dow from today)::integer;
  weekend := dow in (0, 6);
  reward := round(case when weekend then s.checkin_weekend else s.checkin_weekday end, 0);
  if reward <= 0 then raise exception 'Check-in rewards are not available right now'; end if;

  insert into public.checkins (user_id, claimed_on, amount)
  values (uid, today, reward)
  on conflict (user_id, claimed_on) do nothing;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'already', 'amount', 0);
  end if;

  perform public.ledger_append(
    uid, 'checkin', reward, format('checkin:%s:%s', uid, today),
    case when weekend then 'Weekend check-in' else 'Daily check-in' end,
    null, null, null, 'income'
  );

  return jsonb_build_object(
    'ok', true,
    'amount', reward,
    'weekend', weekend,
    'available', public.available_balance(uid)
  );
end;
$$;

alter table public.gift_codes       enable row level security;
alter table public.gift_redemptions enable row level security;
alter table public.checkins         enable row level security;

drop policy if exists gift_codes_admin_select on public.gift_codes;
create policy gift_codes_admin_select on public.gift_codes
  for select to authenticated using (public.is_admin());

drop policy if exists gift_redemptions_self_select on public.gift_redemptions;
create policy gift_redemptions_self_select on public.gift_redemptions
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

drop policy if exists checkins_self_select on public.checkins;
create policy checkins_self_select on public.checkins
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- 12. Grants
-- ---------------------------------------------------------------------------

grant execute on function public.settings() to anon, authenticated;
grant execute on function public.referral_rate(integer) to anon, authenticated;
grant execute on function public.first_payout_at(timestamptz) to anon, authenticated;
grant execute on function public.payout_at(timestamptz, integer) to anon, authenticated;
grant execute on function public.program_elapsed_days(timestamptz, integer) to anon, authenticated;
grant execute on function public.withdraw_window_open(text, text) to anon, authenticated;
grant execute on function public.invite_preview(text) to anon, authenticated;
grant execute on function public.username_available(text) to anon, authenticated;
grant execute on function public.is_admin(uuid) to authenticated;
grant execute on function public.wallet_balance(uuid) to authenticated;
grant execute on function public.available_balance(uuid) to authenticated;
grant execute on function public.income_balance(uuid) to authenticated;
grant execute on function public.recharge_balance(uuid) to authenticated;
grant execute on function public.reserved_balance(uuid) to authenticated;
grant execute on function public.ensure_profile() to authenticated;
grant execute on function public.apply_invite(text) to authenticated;
grant execute on function public.purchase_product(uuid, text) to authenticated;
grant execute on function public.claim_daily_income() to authenticated;
grant execute on function public.earnings_summary() to authenticated;
grant execute on function public.team_stats() to authenticated;
grant execute on function public.request_withdrawal(numeric, text, text, text, text) to authenticated;
grant execute on function public.transfer_to_recharge(numeric) to authenticated;
grant execute on function public.redeem_gift_code(text) to authenticated;
grant execute on function public.checkin_status() to authenticated;
grant execute on function public.claim_checkin() to authenticated;

revoke all on function public.ledger_append(uuid, text, numeric, text, text, uuid, uuid, integer, text)
  from public, anon, authenticated;
revoke all on function public.admin_create_gift_code(numeric, text, integer, text)
  from public, anon;
grant execute on function public.admin_create_gift_code(numeric, text, integer, text) to service_role;
revoke all on function public.settle_payment(uuid, boolean, text, text, uuid)
  from public, anon, authenticated;
revoke all on function public.settle_referral_commissions(uuid) from public, anon, authenticated;
revoke all on function public.grant_signup_bonus(uuid) from public, anon, authenticated;
revoke all on function public.pay_referral_commissions(uuid, uuid, numeric, text)
  from public, anon, authenticated;
revoke execute on function public.admin_adjust_wallet(uuid, numeric, text) from anon;
revoke execute on function public.admin_update_product(uuid, text, numeric, numeric, integer, text, boolean, boolean) from anon;

-- ---------------------------------------------------------------------------
-- 12. Seed: QuantumMine trading products, settings, and 8PM copy
-- ---------------------------------------------------------------------------

insert into public.products (name, price, daily_income, days, category, image_url, sort_order, active)
select v.name, v.price, v.daily_income, v.days, 'product', '/brand/trading_products.jpg', v.sort_order, true
from (
  values
    ('QM5',    5000::numeric,      500::numeric, 20, 1),
    ('QM10',   10000::numeric,    1000::numeric, 20, 2),
    ('QM50',   50000::numeric,    4200::numeric, 21, 3),
    ('QM100',  100000::numeric,   8400::numeric, 22, 4),
    ('QM150',  150000::numeric,  10500::numeric, 25, 5),
    ('QM250',  250000::numeric,  21400::numeric, 26, 6),
    ('QM350',  350000::numeric,  31070::numeric, 27, 7),
    ('QM500',  500000::numeric,  40400::numeric, 30, 8),
    ('QM1000', 1000000::numeric, 80800::numeric, 40, 9)
) as v(name, price, daily_income, days, sort_order)
where not exists (
  select 1 from public.products p where p.name = v.name
);

update public.products as p
set
  price = v.price,
  daily_income = v.daily_income,
  days = v.days,
  category = 'product',
  image_url = '/brand/trading_products.jpg',
  sort_order = v.sort_order,
  active = true
from (
  values
    ('QM5',    5000::numeric,      500::numeric, 20, 1),
    ('QM10',   10000::numeric,    1000::numeric, 20, 2),
    ('QM50',   50000::numeric,    4200::numeric, 21, 3),
    ('QM100',  100000::numeric,   8400::numeric, 22, 4),
    ('QM150',  150000::numeric,  10500::numeric, 25, 5),
    ('QM250',  250000::numeric,  21400::numeric, 26, 6),
    ('QM350',  350000::numeric,  31070::numeric, 27, 7),
    ('QM500',  500000::numeric,  40400::numeric, 30, 8),
    ('QM1000', 1000000::numeric, 80800::numeric, 40, 9)
) as v(name, price, daily_income, days, sort_order)
where p.name = v.name;

update public.app_settings
set
  payout_hour = 20,
  daily_rate_percent = 10,
  term_days = 20,
  signup_bonus = 1000,
  deposit_min = 5000,
  deposit_max = 10000000,
  withdraw_min = 3000,
  withdraw_max = 5000000,
  withdraw_fee_rate = 0.15,
  withdraw_start = '08:00',
  withdraw_end = '20:00',
  withdraw_auto = false,
  telegram_channel_url = 'https://t.me/+x70pBloGZDNmYjg0',
  telegram_support_url = 'https://t.me/+x70pBloGZDNmYjg0',
  about_text =
    'QuantumMine AI is presented as an AI-powered trading platform that uses automated trading robots to analyze market information and identify potential trading opportunities. '
    || 'Our trading robots are designed to use algorithmic analysis, market trends, and sentiment signals to support automated trading decisions. The goal is to make trading more systematic and reduce the need for users to monitor markets manually.',
  welcome_message =
    'Welcome to QuantumMine AI!' || chr(10) || chr(10) ||
    'Deposit to your wallet, activate a trading product, and your returns arrive at 8PM every day for that product''s term.' || chr(10) || chr(10) ||
    'On weekends, each investment above UGX 100,000 receives 5% cashback.' || chr(10) || chr(10) ||
    'Tap Channel for updates and Support if you need help.'
where id = 1;
