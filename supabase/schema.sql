create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text not null unique,
  room_id uuid,
  room_role text check (room_role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text default 'Euer Raum',
  invite_code text not null unique,
  owner_id uuid not null references public.profiles(id),
  status text not null default 'active' check (status in ('active', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add constraint profiles_room_fk foreign key (room_id) references public.rooms(id);
create unique index if not exists one_active_room_per_user on public.profiles(id) where room_id is not null;
create index if not exists rooms_invite_code_active_idx on public.rooms(invite_code) where status = 'active';

create table if not exists public.room_memberships (
  room_id uuid not null references public.rooms(id),
  user_id uuid not null references public.profiles(id),
  role text not null check (role in ('owner', 'member')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (room_id, user_id)
);
create unique index if not exists one_active_membership_per_user on public.room_memberships(user_id) where active;
create unique index if not exists max_one_member_role_per_room on public.room_memberships(room_id, role) where active and role = 'member';
