-- SnapDraft Supabase schema
-- Run this in the Supabase SQL editor after creating a new project.

-- Floor plans table
create table if not exists floor_plans (
  id          text        primary key,
  owner_id    uuid        not null references auth.users (id) on delete cascade,
  version     integer     not null default 1,
  name        text        not null,
  elements    jsonb       not null default '[]'::jsonb,
  -- When true any authenticated user who knows the plan ID can read and edit it.
  is_public   boolean     not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Row Level Security
alter table floor_plans enable row level security;

-- Owner has full access to their own plans.
create policy "owner_all" on floor_plans
  for all
  using  (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Any authenticated user can read a public plan.
create policy "public_read" on floor_plans
  for select
  using (is_public = true);

-- Any authenticated user can update elements of a public plan
-- (used for real-time collaboration on shared plans).
create policy "public_update" on floor_plans
  for update
  using  (is_public = true and auth.uid() is not null)
  with check (is_public = true);

-- Enable Realtime for the floor_plans table so clients receive UPDATE events.
alter publication supabase_realtime add table floor_plans;
