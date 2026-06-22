-- Between Us Supabase schema
-- Consolidated MVP schema for the private couples mobile web app.
-- It intentionally contains no secrets and relies on Supabase Auth user IDs.

create extension if not exists pgcrypto;

create type public.between_us_pair_role as enum ('member');
create type public.between_us_mood as enum (
  'verbunden',
  'dankbar',
  'ruhig',
  'glücklich',
  'müde',
  'gestresst',
  'unsicher',
  'nachdenklich'
);
create type public.between_us_reaction as enum (
  'Das bedeutet mir viel',
  'Danke',
  'Umarmung',
  'Lass uns darüber sprechen'
);
create type public.between_us_bucket_category as enum (
  'Dates',
  'Reisen',
  'Abenteuer',
  'Alltag',
  'Rituale',
  'Zuhause',
  'Romantik',
  'Wachstum',
  'besondere Anlässe'
);
create type public.between_us_bucket_status as enum ('Wunsch', 'geplant', 'erlebt');

create table public.between_us_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.between_us_pairs (
  id uuid primary key default gen_random_uuid(),
  invite_code text not null unique check (invite_code ~ '^[A-Z]{2}-[0-9]{4}$'),
  created_by uuid not null references public.between_us_profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table public.between_us_pair_members (
  pair_id uuid not null references public.between_us_pairs (id) on delete cascade,
  user_id uuid not null references public.between_us_profiles (id) on delete cascade,
  role public.between_us_pair_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (pair_id, user_id)
);

create unique index between_us_one_active_pair_per_user
  on public.between_us_pair_members (user_id);

create or replace function public.between_us_pair_member_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.between_us_pair_members where pair_id = new.pair_id) >= 2 then
    raise exception 'A Between Us pair can contain at most two people.';
  end if;
  return new;
end;
$$;

create trigger between_us_pair_member_limit_trigger
before insert on public.between_us_pair_members
for each row execute function public.between_us_pair_member_limit();

create table public.between_us_daily_questions (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.between_us_pairs (id) on delete cascade,
  question_date date not null,
  question_text text not null check (char_length(question_text) between 8 and 240),
  created_at timestamptz not null default now(),
  unique (pair_id, question_date)
);

create table public.between_us_checkin_answers (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.between_us_pairs (id) on delete cascade,
  question_id uuid not null references public.between_us_daily_questions (id) on delete cascade,
  user_id uuid not null references public.between_us_profiles (id) on delete cascade,
  answer_date date not null,
  mood public.between_us_mood,
  answer_text text not null check (char_length(answer_text) between 1 and 2000),
  revealed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (question_id, user_id),
  unique (pair_id, answer_date, user_id)
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
  pair_id uuid not null references public.between_us_pairs (id) on delete cascade,
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
  pair_id uuid not null references public.between_us_pairs (id) on delete cascade,
  memory_date date not null,
  title text not null check (char_length(title) between 1 and 140),
  body text not null check (char_length(body) between 1 and 2400),
  mood public.between_us_mood,
  photo_path text check (photo_path is null or char_length(photo_path) <= 500),
  bucket_item_id uuid references public.between_us_bucket_items (id) on delete set null,
  created_by uuid references public.between_us_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pair_id, memory_date)
);

create or replace function public.between_us_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger between_us_profiles_touch_updated_at
before update on public.between_us_profiles
for each row execute function public.between_us_touch_updated_at();

create trigger between_us_pairs_touch_updated_at
before update on public.between_us_pairs
for each row execute function public.between_us_touch_updated_at();

create trigger between_us_checkin_answers_touch_updated_at
before update on public.between_us_checkin_answers
for each row execute function public.between_us_touch_updated_at();

create trigger between_us_bucket_items_touch_updated_at
before update on public.between_us_bucket_items
for each row execute function public.between_us_touch_updated_at();

create trigger between_us_memories_touch_updated_at
before update on public.between_us_memories
for each row execute function public.between_us_touch_updated_at();

create or replace function public.between_us_is_pair_member(target_pair_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.between_us_pair_members member
    where member.pair_id = target_pair_id
      and member.user_id = auth.uid()
  );
$$;

create or replace function public.between_us_both_answered(target_question_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select count(*) = 2
  from public.between_us_checkin_answers answer
  where answer.question_id = target_question_id;
$$;

alter table public.between_us_profiles enable row level security;
alter table public.between_us_pairs enable row level security;
alter table public.between_us_pair_members enable row level security;
alter table public.between_us_daily_questions enable row level security;
alter table public.between_us_checkin_answers enable row level security;
alter table public.between_us_checkin_reactions enable row level security;
alter table public.between_us_bucket_items enable row level security;
alter table public.between_us_memories enable row level security;

create policy "profiles are readable by the owner"
  on public.between_us_profiles for select
  using (id = auth.uid());

create policy "profiles are inserted by the owner"
  on public.between_us_profiles for insert
  with check (id = auth.uid());

create policy "profiles are updated by the owner"
  on public.between_us_profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "pairs are readable by members"
  on public.between_us_pairs for select
  using (public.between_us_is_pair_member(id));

create policy "pairs are created by authenticated users"
  on public.between_us_pairs for insert
  with check (created_by = auth.uid());

create policy "pairs are updated by members"
  on public.between_us_pairs for update
  using (public.between_us_is_pair_member(id))
  with check (public.between_us_is_pair_member(id));

create policy "pair members are readable by members"
  on public.between_us_pair_members for select
  using (public.between_us_is_pair_member(pair_id));

create policy "users can join themselves to a pair"
  on public.between_us_pair_members for insert
  with check (user_id = auth.uid());

create policy "pair members can leave their own membership"
  on public.between_us_pair_members for delete
  using (user_id = auth.uid());

create policy "daily questions are readable by pair members"
  on public.between_us_daily_questions for select
  using (public.between_us_is_pair_member(pair_id));

create policy "daily questions are created by pair members"
  on public.between_us_daily_questions for insert
  with check (public.between_us_is_pair_member(pair_id));

create policy "answers are listed only after reveal or by owner"
  on public.between_us_checkin_answers for select
  using (
    public.between_us_is_pair_member(pair_id)
    and (user_id = auth.uid() or public.between_us_both_answered(question_id))
  );

create policy "answers are created by their owner"
  on public.between_us_checkin_answers for insert
  with check (user_id = auth.uid() and public.between_us_is_pair_member(pair_id));

create policy "answers can be revealed by pair members after both answered"
  on public.between_us_checkin_answers for update
  using (public.between_us_is_pair_member(pair_id) and public.between_us_both_answered(question_id))
  with check (public.between_us_is_pair_member(pair_id) and public.between_us_both_answered(question_id));

create policy "reactions are readable by pair members"
  on public.between_us_checkin_reactions for select
  using (
    exists (
      select 1
      from public.between_us_checkin_answers answer
      where answer.id = answer_id
        and public.between_us_is_pair_member(answer.pair_id)
        and public.between_us_both_answered(answer.question_id)
    )
  );

create policy "reactions are created by their owner after reveal"
  on public.between_us_checkin_reactions for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.between_us_checkin_answers answer
      where answer.id = answer_id
        and public.between_us_is_pair_member(answer.pair_id)
        and public.between_us_both_answered(answer.question_id)
    )
  );

create policy "bucket items are readable by pair members"
  on public.between_us_bucket_items for select
  using (public.between_us_is_pair_member(pair_id));

create policy "bucket items are created by pair members"
  on public.between_us_bucket_items for insert
  with check (public.between_us_is_pair_member(pair_id));

create policy "bucket items are updated by pair members"
  on public.between_us_bucket_items for update
  using (public.between_us_is_pair_member(pair_id))
  with check (public.between_us_is_pair_member(pair_id));

create policy "bucket items are deleted by pair members"
  on public.between_us_bucket_items for delete
  using (public.between_us_is_pair_member(pair_id));

create policy "memories are readable by pair members"
  on public.between_us_memories for select
  using (public.between_us_is_pair_member(pair_id));

create policy "memories are created by pair members"
  on public.between_us_memories for insert
  with check (public.between_us_is_pair_member(pair_id));

create policy "memories are updated by pair members"
  on public.between_us_memories for update
  using (public.between_us_is_pair_member(pair_id))
  with check (public.between_us_is_pair_member(pair_id));

create policy "memories are deleted by pair members"
  on public.between_us_memories for delete
  using (public.between_us_is_pair_member(pair_id));

create index between_us_daily_questions_pair_date_idx
  on public.between_us_daily_questions (pair_id, question_date desc);
create index between_us_checkin_answers_pair_date_idx
  on public.between_us_checkin_answers (pair_id, answer_date desc);
create index between_us_memories_pair_date_idx
  on public.between_us_memories (pair_id, memory_date desc);
create index between_us_bucket_items_pair_status_idx
  on public.between_us_bucket_items (pair_id, status, created_at desc);
