-- Migration: sequences for batch/student IDs + per-batch roll numbers
--
-- Run after migration 002 (and optionally 003).

-- 1) Sequences for sequential IDs
create sequence if not exists public.batch_id_seq;
create sequence if not exists public.student_id_seq;

-- Move sequences forward if you already have ids like b12 / s99
select setval(
  'public.batch_id_seq',
  coalesce(
    (
      select max((substring(id from '^b([0-9]+)$'))::bigint)
      from public.batches
      where id ~ '^b[0-9]+$'
    ),
    0
  ),
  true
);

select setval(
  'public.student_id_seq',
  coalesce(
    (
      select max((substring(id from '^s([0-9]+)$'))::bigint)
      from public.students
      where id ~ '^s[0-9]+$'
    ),
    0
  ),
  true
);

alter table public.batches
  alter column id set default ('b' || nextval('public.batch_id_seq'));

alter table public.students
  alter column id set default ('s' || nextval('public.student_id_seq'));

-- 2) Roll number per batch (starts from 1 in every batch)
alter table public.students
  add column if not exists roll_number integer;

-- Backfill existing students (ordered by enrollment)
with ordered as (
  select
    id,
    row_number() over (
      partition by institute_id, batch_id
      order by enrollment_date asc, id asc
    ) as rn
  from public.students
)
update public.students s
set roll_number = o.rn
from ordered o
where s.id = o.id
  and s.roll_number is null;

alter table public.students
  alter column roll_number set not null;

create unique index if not exists students_roll_unique
  on public.students(institute_id, batch_id, roll_number);

-- 3) Counter table + trigger for concurrency-safe roll assignment
create table if not exists public.batch_roll_counters (
  institute_id text not null references public.institutes(id) on update cascade on delete restrict,
  batch_id text not null references public.batches(id) on update cascade on delete cascade,
  last_roll integer not null default 0,
  primary key (institute_id, batch_id)
);

insert into public.batch_roll_counters (institute_id, batch_id, last_roll)
select institute_id, batch_id, max(roll_number)
from public.students
group by institute_id, batch_id
on conflict (institute_id, batch_id)
do update set last_roll = greatest(public.batch_roll_counters.last_roll, excluded.last_roll);

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