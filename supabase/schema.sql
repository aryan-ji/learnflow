-- EduFlow (prototype) schema
-- This schema matches the app's current ID shapes (e.g. "s1", "b1") and does not require Supabase Auth.
-- Recommended next step: enable RLS + Supabase Auth once the frontend login is migrated.

-- Extensions (safe no-op if already enabled)
create extension if not exists pgcrypto;

-- Sequences for human-friendly IDs
create sequence if not exists public.batch_id_seq;
create sequence if not exists public.student_id_seq;

-- INSTITUTES (multi-tenant discriminator)
create table if not exists public.institutes (
  id text primary key,
  name text not null,
  created_at timestamptz not null default now()
);

-- USERS (app-level users; not Supabase Auth)
create table if not exists public.users (
  id text primary key,
  institute_id text not null references public.institutes(id) on update cascade on delete restrict,
  name text not null,
  email text not null,
  role text not null check (role in ('admin', 'teacher', 'parent')),
  avatar text
);

create unique index if not exists users_institute_email_unique
  on public.users(institute_id, email);

-- TEACHERS
create table if not exists public.teachers (
  id text primary key,
  institute_id text not null references public.institutes(id) on update cascade on delete restrict,
  name text not null,
  email text not null,
  phone text not null,
  subjects text[] not null default '{}'::text[],
  batch_ids text[] not null default '{}'::text[]
);

create index if not exists teachers_institute_id_idx on public.teachers(institute_id);

-- BATCHES
create table if not exists public.batches (
  id text primary key default ('b' || nextval('public.batch_id_seq')),
  institute_id text not null references public.institutes(id) on update cascade on delete restrict,
  name text not null,
  subject text not null,
  teacher_id text not null references public.teachers(id) on update cascade on delete restrict,
  schedule text not null,
  student_count integer not null default 0 check (student_count >= 0)
);

create index if not exists batches_institute_id_idx on public.batches(institute_id);
create index if not exists batches_teacher_id_idx on public.batches(teacher_id);

-- STUDENTS
create table if not exists public.students (
  id text primary key default ('s' || nextval('public.student_id_seq')),
  institute_id text not null references public.institutes(id) on update cascade on delete restrict,
  batch_id text not null references public.batches(id) on update cascade on delete restrict,
  roll_number integer not null,
  name text not null,
  email text not null,
  phone text not null,
  mother_name text,
  father_name text,
  parent_phone text,
  parent_email text,
  address text,
  school text,
  parent_id text not null references public.users(id) on update cascade on delete restrict,
  enrollment_date date not null,
  status text not null check (status in ('active', 'inactive'))
);

create index if not exists students_institute_id_idx on public.students(institute_id);
create index if not exists students_batch_id_idx on public.students(batch_id);
create index if not exists students_parent_id_idx on public.students(parent_id);
create unique index if not exists students_roll_unique
  on public.students(institute_id, batch_id, roll_number);

-- Roll-number counters (per batch, per institute)
create table if not exists public.batch_roll_counters (
  institute_id text not null references public.institutes(id) on update cascade on delete restrict,
  batch_id text not null references public.batches(id) on update cascade on delete cascade,
  last_roll integer not null default 0,
  primary key (institute_id, batch_id)
);

create or replace function public.assign_student_roll_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_roll integer;
begin
  if new.roll_number is not null then
    return new;
  end if;

  insert into public.batch_roll_counters(institute_id, batch_id, last_roll)
  values (new.institute_id, new.batch_id, 0)
  on conflict (institute_id, batch_id) do nothing;

  update public.batch_roll_counters
  set last_roll = last_roll + 1
  where institute_id = new.institute_id and batch_id = new.batch_id
  returning last_roll into next_roll;

  new.roll_number := next_roll;
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'students_assign_roll_number'
  ) then
    create trigger students_assign_roll_number
    before insert on public.students
    for each row
    execute function public.assign_student_roll_number();
  end if;
end $$;

-- ATTENDANCE
create table if not exists public.attendance (
  id text primary key,
  institute_id text not null references public.institutes(id) on update cascade on delete restrict,
  student_id text not null references public.students(id) on update cascade on delete cascade,
  batch_id text not null references public.batches(id) on update cascade on delete cascade,
  date date not null,
  status text not null check (status in ('present', 'absent', 'late')),
  created_at timestamptz not null default now()
);

create unique index if not exists attendance_unique_idx
  on public.attendance(institute_id, student_id, batch_id, date);
create index if not exists attendance_institute_id_idx on public.attendance(institute_id);
create index if not exists attendance_student_id_idx on public.attendance(student_id);
create index if not exists attendance_batch_id_idx on public.attendance(batch_id);
create index if not exists attendance_date_idx on public.attendance(date);

-- TESTS
create table if not exists public.tests (
  id text primary key,
  institute_id text not null references public.institutes(id) on update cascade on delete restrict,
  name text not null,
  batch_id text not null references public.batches(id) on update cascade on delete cascade,
  subject text not null,
  date date not null,
  total_marks integer not null check (total_marks >= 0),
  created_at timestamptz not null default now()
);

create index if not exists tests_institute_id_idx on public.tests(institute_id);
create index if not exists tests_batch_id_idx on public.tests(batch_id);

-- TEST RESULTS
create table if not exists public.test_results (
  id text primary key,
  institute_id text not null references public.institutes(id) on update cascade on delete restrict,
  test_id text not null references public.tests(id) on update cascade on delete cascade,
  student_id text not null references public.students(id) on update cascade on delete cascade,
  marks_obtained integer not null check (marks_obtained >= 0),
  grade text,
  created_at timestamptz not null default now()
);

create unique index if not exists test_results_unique_idx
  on public.test_results(institute_id, test_id, student_id);
create index if not exists test_results_institute_id_idx on public.test_results(institute_id);
create index if not exists test_results_student_id_idx on public.test_results(student_id);

-- FEES
create table if not exists public.fees (
  id text primary key,
  institute_id text not null references public.institutes(id) on update cascade on delete restrict,
  student_id text not null references public.students(id) on update cascade on delete cascade,
  month text not null,
  amount integer not null check (amount >= 0),
  status text not null check (status in ('paid', 'pending', 'overdue')),
  due_date date not null,
  paid_date date
);

create index if not exists fees_institute_id_idx on public.fees(institute_id);
create index if not exists fees_student_id_idx on public.fees(student_id);
create index if not exists fees_due_date_idx on public.fees(due_date);
create index if not exists fees_status_idx on public.fees(status);

-- Prototype-open access
-- RLS stays disabled and anon/authenticated are granted full CRUD on these tables.
-- DO NOT use this configuration for production.
alter table public.institutes disable row level security;
alter table public.users disable row level security;
alter table public.teachers disable row level security;
alter table public.batches disable row level security;
alter table public.students disable row level security;
alter table public.batch_roll_counters disable row level security;
alter table public.attendance disable row level security;
alter table public.tests disable row level security;
alter table public.test_results disable row level security;
alter table public.fees disable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
alter default privileges in schema public grant select, insert, update, delete on tables to anon, authenticated;

-- Prevent duplicate monthly fees for the same student within an institute
-- Note: this will fail if duplicates already exist; remove duplicates first if needed.
create unique index if not exists fees_unique_student_month_idx
  on public.fees(institute_id, student_id, month);

-- Institute-wide setting: hide all fee amounts (only show paid/not paid)
alter table public.institutes add column if not exists hide_fee_amounts boolean not null default false;