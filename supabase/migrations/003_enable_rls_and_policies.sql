-- Migration: Enable RLS + multi-tenant policies (requires Supabase Auth)
--
-- IMPORTANT
-- - After enabling this, your frontend must authenticate with Supabase Auth.
-- - You must link each authenticated user to a row in public.users by setting public.users.auth_user_id = auth.uid().
-- - Until users are linked, they will see "permission denied" (RLS blocks access).
-- Preflight: migration 002 must be applied first
-- (adds public.institutes and institute_id columns needed by the policies below)
do $$
declare
  missing text[] := array[]::text[];
begin
  if to_regclass('public.institutes') is null then
    missing := array_append(missing, 'public.institutes table');
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'users' and column_name = 'institute_id'
  ) then
    missing := array_append(missing, 'public.users.institute_id');
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'teachers' and column_name = 'institute_id'
  ) then
    missing := array_append(missing, 'public.teachers.institute_id');
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'batches' and column_name = 'institute_id'
  ) then
    missing := array_append(missing, 'public.batches.institute_id');
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'students' and column_name = 'institute_id'
  ) then
    missing := array_append(missing, 'public.students.institute_id');
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'attendance' and column_name = 'institute_id'
  ) then
    missing := array_append(missing, 'public.attendance.institute_id');
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'tests' and column_name = 'institute_id'
  ) then
    missing := array_append(missing, 'public.tests.institute_id');
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'test_results' and column_name = 'institute_id'
  ) then
    missing := array_append(missing, 'public.test_results.institute_id');
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'fees' and column_name = 'institute_id'
  ) then
    missing := array_append(missing, 'public.fees.institute_id');
  end if;

  if array_length(missing, 1) is not null then
    raise exception 'Missing prerequisite(s): %. Run supabase/migrations/002_add_institute_id.sql first, then re-run this migration.', array_to_string(missing, ', ');
  end if;
end $$;

-- 1) Link app users to Supabase Auth users
alter table public.users
  add column if not exists auth_user_id uuid;

create unique index if not exists users_auth_user_id_unique
  on public.users(auth_user_id)
  where auth_user_id is not null;

-- 2) Helper functions for RLS (stable, readable)
create or replace function public.current_user_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select u.id
  from public.users u
  where u.auth_user_id = auth.uid()
  limit 1;
$$;

create or replace function public.current_institute_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select u.institute_id
  from public.users u
  where u.auth_user_id = auth.uid()
  limit 1;
$$;

create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select u.role
  from public.users u
  where u.auth_user_id = auth.uid()
  limit 1;
$$;

-- 3) Enable RLS on all tables
alter table public.institutes enable row level security;
alter table public.users enable row level security;
alter table public.teachers enable row level security;
alter table public.batches enable row level security;
alter table public.students enable row level security;
alter table public.attendance enable row level security;
alter table public.tests enable row level security;
alter table public.test_results enable row level security;
alter table public.fees enable row level security;

-- 4) Drop existing policies (idempotent)
drop policy if exists institutes_select on public.institutes;
drop policy if exists institutes_update_admin on public.institutes;

drop policy if exists users_select on public.users;
drop policy if exists users_admin_write on public.users;
drop policy if exists users_admin_insert on public.users;
drop policy if exists users_admin_update on public.users;
drop policy if exists users_admin_delete on public.users;

drop policy if exists teachers_select on public.teachers;
drop policy if exists teachers_admin_write on public.teachers;
drop policy if exists teachers_admin_insert on public.teachers;
drop policy if exists teachers_admin_update on public.teachers;
drop policy if exists teachers_admin_delete on public.teachers;

drop policy if exists batches_select on public.batches;
drop policy if exists batches_admin_write on public.batches;
drop policy if exists batches_admin_insert on public.batches;
drop policy if exists batches_admin_update on public.batches;
drop policy if exists batches_admin_delete on public.batches;

drop policy if exists students_select on public.students;
drop policy if exists students_staff_write on public.students;
drop policy if exists students_staff_insert on public.students;
drop policy if exists students_staff_update on public.students;
drop policy if exists students_staff_delete on public.students;

drop policy if exists attendance_select on public.attendance;
drop policy if exists attendance_staff_write on public.attendance;
drop policy if exists attendance_staff_insert on public.attendance;
drop policy if exists attendance_staff_update on public.attendance;
drop policy if exists attendance_staff_delete on public.attendance;

drop policy if exists tests_select on public.tests;
drop policy if exists tests_staff_write on public.tests;
drop policy if exists tests_staff_insert on public.tests;
drop policy if exists tests_staff_update on public.tests;
drop policy if exists tests_staff_delete on public.tests;

drop policy if exists test_results_select on public.test_results;
drop policy if exists test_results_staff_write on public.test_results;
drop policy if exists test_results_staff_insert on public.test_results;
drop policy if exists test_results_staff_update on public.test_results;
drop policy if exists test_results_staff_delete on public.test_results;

drop policy if exists fees_select on public.fees;
drop policy if exists fees_staff_write on public.fees;
drop policy if exists fees_staff_insert on public.fees;
drop policy if exists fees_staff_update on public.fees;
drop policy if exists fees_staff_delete on public.fees;

-- 5) Institutes
create policy institutes_select
on public.institutes
for select
to authenticated
using (id = public.current_institute_id());

create policy institutes_update_admin
on public.institutes
for update
to authenticated
using (
  id = public.current_institute_id()
  and public.current_role() = 'admin'
)
with check (
  id = public.current_institute_id()
  and public.current_role() = 'admin'
);

-- 6) Users (admin can manage users in institute; everyone can read their institute users)
create policy users_select
on public.users
for select
to authenticated
using (institute_id = public.current_institute_id());

create policy users_admin_insert
on public.users
for insert
to authenticated
with check (institute_id = public.current_institute_id() and public.current_role() = 'admin');

create policy users_admin_update
on public.users
for update
to authenticated
using (institute_id = public.current_institute_id() and public.current_role() = 'admin')
with check (institute_id = public.current_institute_id() and public.current_role() = 'admin');

create policy users_admin_delete
on public.users
for delete
to authenticated
using (institute_id = public.current_institute_id() and public.current_role() = 'admin');

-- 7) Teachers
create policy teachers_select
on public.teachers
for select
to authenticated
using (institute_id = public.current_institute_id());

create policy teachers_admin_insert
on public.teachers
for insert
to authenticated
with check (institute_id = public.current_institute_id() and public.current_role() = 'admin');

create policy teachers_admin_update
on public.teachers
for update
to authenticated
using (institute_id = public.current_institute_id() and public.current_role() = 'admin')
with check (institute_id = public.current_institute_id() and public.current_role() = 'admin');

create policy teachers_admin_delete
on public.teachers
for delete
to authenticated
using (institute_id = public.current_institute_id() and public.current_role() = 'admin');

-- 8) Batches
create policy batches_select
on public.batches
for select
to authenticated
using (institute_id = public.current_institute_id());

create policy batches_admin_insert
on public.batches
for insert
to authenticated
with check (institute_id = public.current_institute_id() and public.current_role() = 'admin');

create policy batches_admin_update
on public.batches
for update
to authenticated
using (institute_id = public.current_institute_id() and public.current_role() = 'admin')
with check (institute_id = public.current_institute_id() and public.current_role() = 'admin');

create policy batches_admin_delete
on public.batches
for delete
to authenticated
using (institute_id = public.current_institute_id() and public.current_role() = 'admin');

-- 9) Students
-- - admin/teacher: all students in institute
-- - parent: only their children (students.parent_id = current_user_id())
create policy students_select
on public.students
for select
to authenticated
using (
  institute_id = public.current_institute_id()
  and (
    public.current_role() in ('admin','teacher')
    or parent_id = public.current_user_id()
  )
);

create policy students_staff_insert
on public.students
for insert
to authenticated
with check (
  institute_id = public.current_institute_id()
  and public.current_role() in ('admin','teacher')
);

create policy students_staff_update
on public.students
for update
to authenticated
using (
  institute_id = public.current_institute_id()
  and public.current_role() in ('admin','teacher')
)
with check (
  institute_id = public.current_institute_id()
  and public.current_role() in ('admin','teacher')
);

create policy students_staff_delete
on public.students
for delete
to authenticated
using (
  institute_id = public.current_institute_id()
  and public.current_role() in ('admin','teacher')
);

-- 10) Attendance
-- - admin/teacher: all attendance in institute
-- - parent: only attendance for their children
create policy attendance_select
on public.attendance
for select
to authenticated
using (
  institute_id = public.current_institute_id()
  and (
    public.current_role() in ('admin','teacher')
    or student_id in (
      select s.id from public.students s
      where s.institute_id = public.current_institute_id()
        and s.parent_id = public.current_user_id()
    )
  )
);

create policy attendance_staff_insert
on public.attendance
for insert
to authenticated
with check (
  institute_id = public.current_institute_id()
  and public.current_role() in ('admin','teacher')
);

create policy attendance_staff_update
on public.attendance
for update
to authenticated
using (
  institute_id = public.current_institute_id()
  and public.current_role() in ('admin','teacher')
)
with check (
  institute_id = public.current_institute_id()
  and public.current_role() in ('admin','teacher')
);

create policy attendance_staff_delete
on public.attendance
for delete
to authenticated
using (
  institute_id = public.current_institute_id()
  and public.current_role() in ('admin','teacher')
);

-- 11) Tests
-- - admin/teacher: all tests in institute
-- - parent: tests for their child's batches
create policy tests_select
on public.tests
for select
to authenticated
using (
  institute_id = public.current_institute_id()
  and (
    public.current_role() in ('admin','teacher')
    or batch_id in (
      select s.batch_id from public.students s
      where s.institute_id = public.current_institute_id()
        and s.parent_id = public.current_user_id()
    )
  )
);

create policy tests_staff_insert
on public.tests
for insert
to authenticated
with check (
  institute_id = public.current_institute_id()
  and public.current_role() in ('admin','teacher')
);

create policy tests_staff_update
on public.tests
for update
to authenticated
using (
  institute_id = public.current_institute_id()
  and public.current_role() in ('admin','teacher')
)
with check (
  institute_id = public.current_institute_id()
  and public.current_role() in ('admin','teacher')
);

create policy tests_staff_delete
on public.tests
for delete
to authenticated
using (
  institute_id = public.current_institute_id()
  and public.current_role() in ('admin','teacher')
);

-- 12) Test results
-- - admin/teacher: all in institute
-- - parent: only their children's results
create policy test_results_select
on public.test_results
for select
to authenticated
using (
  institute_id = public.current_institute_id()
  and (
    public.current_role() in ('admin','teacher')
    or student_id in (
      select s.id from public.students s
      where s.institute_id = public.current_institute_id()
        and s.parent_id = public.current_user_id()
    )
  )
);

create policy test_results_staff_insert
on public.test_results
for insert
to authenticated
with check (
  institute_id = public.current_institute_id()
  and public.current_role() in ('admin','teacher')
);

create policy test_results_staff_update
on public.test_results
for update
to authenticated
using (
  institute_id = public.current_institute_id()
  and public.current_role() in ('admin','teacher')
)
with check (
  institute_id = public.current_institute_id()
  and public.current_role() in ('admin','teacher')
);

create policy test_results_staff_delete
on public.test_results
for delete
to authenticated
using (
  institute_id = public.current_institute_id()
  and public.current_role() in ('admin','teacher')
);

-- 13) Fees
-- - admin/teacher: all in institute
-- - parent: only for their children
create policy fees_select
on public.fees
for select
to authenticated
using (
  institute_id = public.current_institute_id()
  and (
    public.current_role() in ('admin','teacher')
    or student_id in (
      select s.id from public.students s
      where s.institute_id = public.current_institute_id()
        and s.parent_id = public.current_user_id()
    )
  )
);

create policy fees_staff_insert
on public.fees
for insert
to authenticated
with check (
  institute_id = public.current_institute_id()
  and public.current_role() in ('admin','teacher')
);

create policy fees_staff_update
on public.fees
for update
to authenticated
using (
  institute_id = public.current_institute_id()
  and public.current_role() in ('admin','teacher')
)
with check (
  institute_id = public.current_institute_id()
  and public.current_role() in ('admin','teacher')
);

create policy fees_staff_delete
on public.fees
for delete
to authenticated
using (
  institute_id = public.current_institute_id()
  and public.current_role() in ('admin','teacher')
);

-- 14) Tighten grants (remove anon table access)
revoke all on all tables in schema public from anon;
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- Optional: keep future tables restricted as well
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;

-- PostgREST schema cache reload (helps avoid PGRST204 after migrations)
notify pgrst, 'reload schema';

