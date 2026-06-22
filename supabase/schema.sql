-- Between Us Supabase schema
-- Complete room/login schema for one private partner room per authenticated user.
-- Authentication is handled by Supabase Auth with email and password.

create extension if not exists pgcrypto;

create type public.between_us_room_role as enum ('host', 'member');
create type public.between_us_mood as enum ('verbunden', 'dankbar', 'ruhig', 'glücklich', 'müde', 'gestresst', 'unsicher', 'nachdenklich');
create type public.between_us_reaction as enum ('Das bedeutet mir viel', 'Danke', 'Umarmung', 'Lass uns darüber sprechen');
create type public.between_us_bucket_category as enum ('Dates', 'Reisen', 'Abenteuer', 'Alltag', 'Rituale', 'Zuhause', 'Romantik', 'Wachstum', 'besondere Anlässe');
create type public.between_us_bucket_status as enum ('Wunsch', 'geplant', 'erlebt');

create table public.between_us_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text not null default 'Du' check (char_length(display_name) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.between_us_rooms (
  id uuid primary key default gen_random_uuid(),
  invite_code text not null unique check (invite_code ~ '^[0-9]{6}$'),
  host_user_id uuid not null references public.between_us_profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.between_us_room_members (
  room_id uuid not null references public.between_us_rooms (id) on delete cascade,
  user_id uuid not null references public.between_us_profiles (id) on delete cascade,
  role public.between_us_room_role not null,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id),
  unique (user_id),
  unique (room_id, role) deferrable initially immediate
);

create table public.between_us_daily_questions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.between_us_rooms (id) on delete cascade,
  question_date date not null,
  question_text text not null check (char_length(question_text) between 8 and 240),
  created_at timestamptz not null default now(),
  unique (room_id, question_date)
);

create table public.between_us_checkin_answers (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.between_us_rooms (id) on delete cascade,
  question_id uuid not null references public.between_us_daily_questions (id) on delete cascade,
  user_id uuid not null references public.between_us_profiles (id) on delete cascade,
  answer_date date not null,
  mood public.between_us_mood,
  answer_text text not null check (char_length(answer_text) between 1 and 2000),
  revealed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (question_id, user_id),
  unique (room_id, answer_date, user_id)
);

create table public.between_us_checkin_reactions (
  id uuid primary key default gen_random_uuid(),
  answer_id uuid not null references public.between_us_checkin_answers (id) on delete cascade,
  user_id uuid not null references public.between_us_profiles (id) on delete cascade,
  reaction public.between_us_reaction not null,
  created_at timestamptz not null default now(),
  unique (answer_id, user_id, reaction)
);

create table public.between_us_bucket_items (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.between_us_rooms (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 140),
  description text not null default '' check (char_length(description) <= 1200),
  category public.between_us_bucket_category not null,
  status public.between_us_bucket_status not null default 'Wunsch',
  target_date date,
  place text not null default '' check (char_length(place) <= 160),
  created_by uuid references public.between_us_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.between_us_memories (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.between_us_rooms (id) on delete cascade,
  memory_date date not null,
  title text not null check (char_length(title) between 1 and 140),
  body text not null check (char_length(body) between 1 and 2400),
  mood public.between_us_mood,
  photo_path text check (photo_path is null or char_length(photo_path) <= 500),
  bucket_item_id uuid references public.between_us_bucket_items (id) on delete set null,
  created_by uuid references public.between_us_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (room_id, memory_date)
);

create or replace function public.between_us_touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger between_us_profiles_touch_updated_at before update on public.between_us_profiles for each row execute function public.between_us_touch_updated_at();
create trigger between_us_rooms_touch_updated_at before update on public.between_us_rooms for each row execute function public.between_us_touch_updated_at();
create trigger between_us_checkin_answers_touch_updated_at before update on public.between_us_checkin_answers for each row execute function public.between_us_touch_updated_at();
create trigger between_us_bucket_items_touch_updated_at before update on public.between_us_bucket_items for each row execute function public.between_us_touch_updated_at();
create trigger between_us_memories_touch_updated_at before update on public.between_us_memories for each row execute function public.between_us_touch_updated_at();

create or replace function public.between_us_current_room_id() returns uuid language sql stable security definer set search_path = public as $$
  select room_id from public.between_us_room_members where user_id = auth.uid() limit 1;
$$;

create or replace function public.between_us_is_room_member(target_room_id uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.between_us_room_members where room_id = target_room_id and user_id = auth.uid());
$$;

create or replace function public.between_us_is_room_host(target_room_id uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.between_us_room_members where room_id = target_room_id and user_id = auth.uid() and role = 'host');
$$;

create or replace function public.between_us_both_answered(target_question_id uuid) returns boolean language sql stable security definer set search_path = public as $$
  select count(*) = 2 from public.between_us_checkin_answers where question_id = target_question_id;
$$;

create or replace function public.between_us_create_profile() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.between_us_profiles (id, email, display_name)
  values (new.id, coalesce(new.email, ''), coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), split_part(coalesce(new.email, 'Du'), '@', 1)))
  on conflict (id) do update set email = excluded.email;
  return new;
end; $$;

create trigger between_us_auth_user_created after insert on auth.users for each row execute function public.between_us_create_profile();

create or replace function public.between_us_generate_invite_code() returns text language plpgsql volatile as $$
declare candidate text;
begin
  loop
    candidate := lpad((floor(random() * 1000000))::int::text, 6, '0');
    exit when not exists (select 1 from public.between_us_rooms where invite_code = candidate);
  end loop;
  return candidate;
end; $$;

create or replace function public.between_us_create_room() returns public.between_us_rooms language plpgsql security definer set search_path = public as $$
declare created_room public.between_us_rooms;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if public.between_us_current_room_id() is not null then raise exception 'user already has a room'; end if;

  insert into public.between_us_profiles (id, email, display_name)
  values (auth.uid(), coalesce((auth.jwt()->>'email'), ''), split_part(coalesce((auth.jwt()->>'email'), 'Du'), '@', 1))
  on conflict (id) do nothing;

  insert into public.between_us_rooms (invite_code, host_user_id)
  values (public.between_us_generate_invite_code(), auth.uid()) returning * into created_room;

  insert into public.between_us_room_members (room_id, user_id, role)
  values (created_room.id, auth.uid(), 'host');

  return created_room;
end; $$;

create or replace function public.between_us_join_room(join_code text) returns public.between_us_rooms language plpgsql security definer set search_path = public as $$
declare target_room public.between_us_rooms;
declare member_count int;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if public.between_us_current_room_id() is not null then raise exception 'user already has a room'; end if;

  select * into target_room from public.between_us_rooms where invite_code = join_code;
  if target_room.id is null then raise exception 'invite code not found'; end if;

  select count(*) into member_count from public.between_us_room_members where room_id = target_room.id;
  if member_count >= 2 then raise exception 'room is already full'; end if;
  if target_room.host_user_id = auth.uid() then raise exception 'host cannot join own room as member'; end if;

  insert into public.between_us_profiles (id, email, display_name)
  values (auth.uid(), coalesce((auth.jwt()->>'email'), ''), split_part(coalesce((auth.jwt()->>'email'), 'Du'), '@', 1))
  on conflict (id) do nothing;

  insert into public.between_us_room_members (room_id, user_id, role) values (target_room.id, auth.uid(), 'member');
  return target_room;
end; $$;

create or replace function public.between_us_leave_room() returns void language plpgsql security definer set search_path = public as $$
declare current_room uuid := public.between_us_current_room_id();
begin
  if current_room is null then return; end if;
  if public.between_us_is_room_host(current_room) then
    delete from public.between_us_rooms where id = current_room;
  else
    delete from public.between_us_room_members where room_id = current_room and user_id = auth.uid();
  end if;
end; $$;

alter table public.between_us_profiles enable row level security;
alter table public.between_us_rooms enable row level security;
alter table public.between_us_room_members enable row level security;
alter table public.between_us_daily_questions enable row level security;
alter table public.between_us_checkin_answers enable row level security;
alter table public.between_us_checkin_reactions enable row level security;
alter table public.between_us_bucket_items enable row level security;
alter table public.between_us_memories enable row level security;

create policy "profiles are readable by room members or owner" on public.between_us_profiles for select using (id = auth.uid() or exists (select 1 from public.between_us_room_members mine join public.between_us_room_members theirs using (room_id) where mine.user_id = auth.uid() and theirs.user_id = id));
create policy "profiles are inserted by owner" on public.between_us_profiles for insert with check (id = auth.uid());
create policy "profiles are updated by owner" on public.between_us_profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy "rooms are readable by members" on public.between_us_rooms for select using (public.between_us_is_room_member(id));
create policy "rooms are created by authenticated host" on public.between_us_rooms for insert with check (host_user_id = auth.uid());
create policy "rooms are deleted by host" on public.between_us_rooms for delete using (public.between_us_is_room_host(id));

create policy "room members are readable by members" on public.between_us_room_members for select using (public.between_us_is_room_member(room_id));
create policy "users can insert own room membership" on public.between_us_room_members for insert with check (user_id = auth.uid());
create policy "members can leave and hosts can remove" on public.between_us_room_members for delete using (user_id = auth.uid() or public.between_us_is_room_host(room_id));

create policy "daily questions readable by room members" on public.between_us_daily_questions for select using (public.between_us_is_room_member(room_id));
create policy "daily questions created by room members" on public.between_us_daily_questions for insert with check (public.between_us_is_room_member(room_id));

create policy "answers readable by owner or after both answered" on public.between_us_checkin_answers for select using (public.between_us_is_room_member(room_id) and (user_id = auth.uid() or public.between_us_both_answered(question_id)));
create policy "answers created by owner" on public.between_us_checkin_answers for insert with check (user_id = auth.uid() and public.between_us_is_room_member(room_id));
create policy "answers revealed by room members after both answered" on public.between_us_checkin_answers for update using (public.between_us_is_room_member(room_id) and public.between_us_both_answered(question_id)) with check (public.between_us_is_room_member(room_id) and public.between_us_both_answered(question_id));

create policy "reactions readable by room members" on public.between_us_checkin_reactions for select using (exists (select 1 from public.between_us_checkin_answers answer where answer.id = answer_id and public.between_us_is_room_member(answer.room_id) and public.between_us_both_answered(answer.question_id)));
create policy "reactions created by owner after reveal" on public.between_us_checkin_reactions for insert with check (user_id = auth.uid() and exists (select 1 from public.between_us_checkin_answers answer where answer.id = answer_id and public.between_us_is_room_member(answer.room_id) and public.between_us_both_answered(answer.question_id)));

create policy "bucket items readable by room members" on public.between_us_bucket_items for select using (public.between_us_is_room_member(room_id));
create policy "bucket items created by room members" on public.between_us_bucket_items for insert with check (public.between_us_is_room_member(room_id));
create policy "bucket items updated by room members" on public.between_us_bucket_items for update using (public.between_us_is_room_member(room_id)) with check (public.between_us_is_room_member(room_id));
create policy "bucket items deleted by room members" on public.between_us_bucket_items for delete using (public.between_us_is_room_member(room_id));

create policy "memories readable by room members" on public.between_us_memories for select using (public.between_us_is_room_member(room_id));
create policy "memories created by room members" on public.between_us_memories for insert with check (public.between_us_is_room_member(room_id));
create policy "memories updated by room members" on public.between_us_memories for update using (public.between_us_is_room_member(room_id)) with check (public.between_us_is_room_member(room_id));
create policy "memories deleted by room members" on public.between_us_memories for delete using (public.between_us_is_room_member(room_id));

create index between_us_rooms_invite_code_idx on public.between_us_rooms (invite_code);
create index between_us_room_members_user_idx on public.between_us_room_members (user_id);
create index between_us_daily_questions_room_date_idx on public.between_us_daily_questions (room_id, question_date desc);
create index between_us_checkin_answers_room_date_idx on public.between_us_checkin_answers (room_id, answer_date desc);
create index between_us_memories_room_date_idx on public.between_us_memories (room_id, memory_date desc);
create index between_us_bucket_items_room_status_idx on public.between_us_bucket_items (room_id, status, created_at desc);
