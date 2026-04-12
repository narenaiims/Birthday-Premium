-- ═══════════════════════════════════════════════════════════════════
-- BirthDay Premium — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New query → Run
-- ═══════════════════════════════════════════════════════════════════

-- 1. USER PROFILES (extends Supabase auth.users)
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  name        text,
  photo_url   text,
  push_subscription text,        -- stores Web Push subscription JSON
  remind_on_day        boolean default true,
  remind_1_day_before  boolean default false,
  remind_3_days_before boolean default false,
  updated_at  timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "Users manage own profile"
  on public.profiles for all using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, name, photo_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. GROUPS
create table if not exists public.groups (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  owner_id   uuid references auth.users(id) on delete cascade,
  gift_planner jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);
alter table public.groups enable row level security;

-- 3. GROUP MEMBERS
create table if not exists public.group_members (
  group_id  uuid references public.groups(id) on delete cascade,
  user_id   uuid references auth.users(id) on delete cascade,
  role      text not null default 'viewer' check (role in ('admin','viewer')),
  name      text,
  email     text,
  joined_at timestamptz default now(),
  primary key (group_id, user_id)
);
alter table public.group_members enable row level security;

-- Policies for Groups
create policy "Group members can read"
  on public.groups for select
  using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = groups.id
        and group_members.user_id = auth.uid()
    )
  );
create policy "Owners manage group"
  on public.groups for all
  using (owner_id = auth.uid());

-- Policies for Group Members
create policy "Members see their groups"
  on public.group_members for select
  using (user_id = auth.uid() or exists (
    select 1 from public.group_members gm2
    where gm2.group_id = group_members.group_id and gm2.user_id = auth.uid()
  ));
create policy "Admins manage members"
  on public.group_members for all
  using (exists (
    select 1 from public.group_members gm2
    where gm2.group_id = group_members.group_id
      and gm2.user_id = auth.uid()
      and gm2.role = 'admin'
  ));

-- 4. BIRTHDAYS
create table if not exists public.birthdays (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid references public.groups(id) on delete cascade,
  name         text not null,
  dob          text not null,   -- stored as "YYYY-MM-DD"
  phone        text,
  relationship text default 'Friend',
  interests    text[] default '{}',
  notes        text,
  is_favorite  boolean default false,
  avatar       text,
  created_at   timestamptz default now(),
  created_by   uuid references auth.users(id)
);
alter table public.birthdays enable row level security;
create policy "Group members read birthdays"
  on public.birthdays for select
  using (exists (
    select 1 from public.group_members
    where group_members.group_id = birthdays.group_id
      and group_members.user_id = auth.uid()
  ));
create policy "Admins manage birthdays"
  on public.birthdays for all
  using (exists (
    select 1 from public.group_members
    where group_members.group_id = birthdays.group_id
      and group_members.user_id = auth.uid()
      and group_members.role = 'admin'
  ));

-- 5. INVITES
create table if not exists public.invites (
  token      text primary key,
  group_id   uuid references public.groups(id) on delete cascade,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);
alter table public.invites enable row level security;
-- Anyone can read an invite (to join via link)
create policy "Anyone reads invites" on public.invites for select using (true);
create policy "Admins create invites"
  on public.invites for insert
  with check (exists (
    select 1 from public.group_members
    where group_members.group_id = invites.group_id
      and group_members.user_id = auth.uid()
      and group_members.role = 'admin'
  ));
create policy "Admins delete invites"
  on public.invites for delete
  using (exists (
    select 1 from public.group_members
    where group_members.group_id = invites.group_id
      and group_members.user_id = auth.uid()
      and group_members.role = 'admin'
  ));

-- 6. WISH TEMPLATES
create table if not exists public.wish_templates (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade,
  title      text not null,
  content    text not null,
  created_at timestamptz default now()
);
alter table public.wish_templates enable row level security;
create policy "Users manage own templates"
  on public.wish_templates for all using (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════
-- Done! Go back to README_SETUP.md for next steps.
-- ═══════════════════════════════════════════════════════════════════
