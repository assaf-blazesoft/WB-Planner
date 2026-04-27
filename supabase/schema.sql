-- ============================================================
-- Winbonanza Planner — Supabase Schema
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE
-- ============================================================

-- ── Profiles ─────────────────────────────────────────────────
create table if not exists public.profiles (
  id         uuid primary key references auth.users on delete cascade,
  email      text not null,
  full_name  text,
  role       text not null default 'user'
               check (role in ('owner', 'admin', 'user')),
  created_at timestamptz default now()
);

-- Auto-create a profile on every new Supabase Auth signup.
-- Grants 'owner' role to the designated owner email.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    (new.raw_user_meta_data->>'full_name'),
    case when new.email = 'assafc@blazesoft.ca' then 'owner' else 'user' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Invites ──────────────────────────────────────────────────
create table if not exists public.invites (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  invited_by uuid references public.profiles(id) on delete set null,
  token      text not null unique,
  accepted   boolean not null default false,
  created_at timestamptz default now(),
  expires_at timestamptz default now() + interval '7 days'
);

-- ── Tasks ────────────────────────────────────────────────────
create table if not exists public.tasks (
  id               text primary key,
  title            text not null default '',
  description      text default '',
  track            text not null default 'feature',
  status           text not null default 'not_started',
  priority         text not null default 'medium',
  weeks            integer[] default '{1}',
  progress_percent integer not null default 0
                     check (progress_percent >= 0 and progress_percent <= 100),
  owner            text default '',
  due_date         date,
  notes            text default '',
  tags             text[] default '{}',
  dependencies     text[] default '{}',
  created_by       uuid references public.profiles(id) on delete set null,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- Add due_date if the table already existed without it (migration safety)
alter table public.tasks add column if not exists due_date date;

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tasks_updated_at on public.tasks;
create trigger tasks_updated_at
  before update on public.tasks
  for each row execute procedure public.set_updated_at();

-- ── Task Assignments ──────────────────────────────────────────
create table if not exists public.task_assignments (
  id          uuid primary key default gen_random_uuid(),
  task_id     text not null references public.tasks(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid references public.profiles(id) on delete set null,
  created_at  timestamptz default now(),
  unique (task_id, user_id)
);

-- ── Comments ─────────────────────────────────────────────────
create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  task_id    text not null references public.tasks(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  content    text not null,
  created_at timestamptz default now()
);

-- ── Notification Log ─────────────────────────────────────────
create table if not exists public.notification_log (
  id              uuid primary key default gen_random_uuid(),
  type            text not null,
  recipient_email text not null,
  task_id         text references public.tasks(id) on delete set null,
  payload         jsonb,
  sent_at         timestamptz default now(),
  status          text default 'sent'
);

-- ============================================================
-- Row-Level Security
-- ============================================================

alter table public.profiles         enable row level security;
alter table public.invites          enable row level security;
alter table public.tasks            enable row level security;
alter table public.task_assignments enable row level security;
alter table public.comments         enable row level security;
alter table public.notification_log enable row level security;

-- Helper: is the current user an owner or admin?
create or replace function public.is_admin()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('owner', 'admin')
  );
$$;

-- ── Profiles RLS ─────────────────────────────────────────────
drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
  on public.profiles for select
  using (auth.uid() is not null);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid());

-- ── Invites RLS ──────────────────────────────────────────────
drop policy if exists "invites_all_admin" on public.invites;
create policy "invites_all_admin"
  on public.invites for all
  using (public.is_admin());

drop policy if exists "invites_select_by_token" on public.invites;
create policy "invites_select_by_token"
  on public.invites for select
  using (true);

-- ── Tasks RLS ────────────────────────────────────────────────
-- Admin/owner: full access
drop policy if exists "tasks_all_admin" on public.tasks;
create policy "tasks_all_admin"
  on public.tasks for all
  using (public.is_admin())
  with check (public.is_admin());

-- All authenticated users: SELECT every task (full roadmap visibility)
drop policy if exists "tasks_select_assigned" on public.tasks;
drop policy if exists "tasks_select_all_authenticated" on public.tasks;
create policy "tasks_select_all_authenticated"
  on public.tasks for select
  using (auth.uid() is not null);

-- Assigned users: UPDATE only tasks they're assigned to
drop policy if exists "tasks_update_assigned" on public.tasks;
create policy "tasks_update_assigned"
  on public.tasks for update
  using (
    exists (
      select 1 from public.task_assignments
      where task_id = tasks.id and user_id = auth.uid()
    )
  );

-- ── Task Assignments RLS ─────────────────────────────────────
drop policy if exists "assignments_select_authenticated" on public.task_assignments;
create policy "assignments_select_authenticated"
  on public.task_assignments for select
  using (auth.uid() is not null);

drop policy if exists "assignments_write_admin" on public.task_assignments;
create policy "assignments_write_admin"
  on public.task_assignments for insert
  with check (public.is_admin());

drop policy if exists "assignments_delete_admin" on public.task_assignments;
create policy "assignments_delete_admin"
  on public.task_assignments for delete
  using (public.is_admin());

-- ── Comments RLS ─────────────────────────────────────────────
drop policy if exists "comments_select_authenticated" on public.comments;
create policy "comments_select_authenticated"
  on public.comments for select
  using (auth.uid() is not null);

drop policy if exists "comments_insert_authenticated" on public.comments;
create policy "comments_insert_authenticated"
  on public.comments for insert
  with check (auth.uid() is not null);

-- ── Notification Log RLS ─────────────────────────────────────
drop policy if exists "notif_log_admin" on public.notification_log;
create policy "notif_log_admin"
  on public.notification_log for all
  using (public.is_admin());

-- ============================================================
-- Verify
-- ============================================================
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'tasks'
order by ordinal_position;