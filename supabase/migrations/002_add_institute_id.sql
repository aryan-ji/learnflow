-- Migration: add institute_id multi-tenant discriminator (prototype-open)
-- Run this once in Supabase SQL editor for an existing project created with the previous schema.

create table if not exists public.institutes (
  id text primary key,
  name text not null,
  created_at timestamptz not null default now()
);

insert into public.institutes (id, name)
values ('inst_1', 'Default Institute')
on conflict (id) do nothing;

-- USERS
alter table public.users add column if not exists institute_id text;
update public.users set institute_id = 'inst_1' where institute_id is null;
alter table public.users alter column institute_id set not null;
alter table public.users
  add constraint users_institute_id_fkey
  foreign key (institute_id) references public.institutes(id)
  on update cascade on delete restrict;

drop index if exists public.users_email_key;
drop index if exists public.users_institute_email_unique;
create unique index if not exists users_institute_email_unique
  on public.users(institute_id, email);

-- TEACHERS
alter table public.teachers add column if not exists institute_id text;
update public.teachers set institute_id = 'inst_1' where institute_id is null;
alter table public.teachers alter column institute_id set not null;
alter table public.teachers
  add constraint teachers_institute_id_fkey
  foreign key (institute_id) references public.institutes(id)
  on update cascade on delete restrict;
create index if not exists teachers_institute_id_idx on public.teachers(institute_id);

-- BATCHES
alter table public.batches add column if not exists institute_id text;
update public.batches set institute_id = 'inst_1' where institute_id is null;
alter table public.batches alter column institute_id set not null;
alter table public.batches
  add constraint batches_institute_id_fkey
  foreign key (institute_id) references public.institutes(id)
  on update cascade on delete restrict;
create index if not exists batches_institute_id_idx on public.batches(institute_id);

-- STUDENTS
alter table public.students add column if not exists institute_id text;
update public.students set institute_id = 'inst_1' where institute_id is null;
alter table public.students alter column institute_id set not null;
alter table public.students
  add constraint students_institute_id_fkey
  foreign key (institute_id) references public.institutes(id)
  on update cascade on delete restrict;
create index if not exists students_institute_id_idx on public.students(institute_id);

-- ATTENDANCE
alter table public.attendance add column if not exists institute_id text;
update public.attendance set institute_id = 'inst_1' where institute_id is null;
alter table public.attendance alter column institute_id set not null;
alter table public.attendance
  add constraint attendance_institute_id_fkey
  foreign key (institute_id) references public.institutes(id)
  on update cascade on delete restrict;

drop index if exists public.attendance_unique_idx;
create unique index if not exists attendance_unique_idx
  on public.attendance(institute_id, student_id, batch_id, date);
create index if not exists attendance_institute_id_idx on public.attendance(institute_id);

-- TESTS
alter table public.tests add column if not exists institute_id text;
update public.tests set institute_id = 'inst_1' where institute_id is null;
alter table public.tests alter column institute_id set not null;
alter table public.tests
  add constraint tests_institute_id_fkey
  foreign key (institute_id) references public.institutes(id)
  on update cascade on delete restrict;
create index if not exists tests_institute_id_idx on public.tests(institute_id);

-- TEST RESULTS
alter table public.test_results add column if not exists institute_id text;
update public.test_results set institute_id = 'inst_1' where institute_id is null;
alter table public.test_results alter column institute_id set not null;
alter table public.test_results
  add constraint test_results_institute_id_fkey
  foreign key (institute_id) references public.institutes(id)
  on update cascade on delete restrict;

drop index if exists public.test_results_unique_idx;
create unique index if not exists test_results_unique_idx
  on public.test_results(institute_id, test_id, student_id);
create index if not exists test_results_institute_id_idx on public.test_results(institute_id);

-- FEES
alter table public.fees add column if not exists institute_id text;
update public.fees set institute_id = 'inst_1' where institute_id is null;
alter table public.fees alter column institute_id set not null;
alter table public.fees
  add constraint fees_institute_id_fkey
  foreign key (institute_id) references public.institutes(id)
  on update cascade on delete restrict;
create index if not exists fees_institute_id_idx on public.fees(institute_id);

-- Prototype-open access grants
alter table public.institutes disable row level security;
alter table public.users disable row level security;
alter table public.teachers disable row level security;
alter table public.batches disable row level security;
alter table public.students disable row level security;
alter table public.attendance disable row level security;
alter table public.tests disable row level security;
alter table public.test_results disable row level security;
alter table public.fees disable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
alter default privileges in schema public grant select, insert, update, delete on tables to anon, authenticated;