-- Migration: add rank + teacher feedback to test_results
-- Adds:
-- - rank (per test, derived from marks_obtained; 1 = highest)
-- - improvement_area (optional)
-- - remark (optional)

alter table public.test_results
  add column if not exists rank integer;

alter table public.test_results
  add column if not exists improvement_area text;

alter table public.test_results
  add column if not exists remark text;

create index if not exists test_results_test_rank_idx
  on public.test_results(institute_id, test_id, rank);

create or replace function public.recompute_test_ranks(p_institute_id text, p_test_id text)
returns void
language sql
security definer
set search_path = public
as $$
  with ranked as (
    select
      tr.id,
      dense_rank() over (
        partition by tr.institute_id, tr.test_id
        order by tr.marks_obtained desc, tr.student_id asc
      ) as rnk
    from public.test_results tr
    where tr.institute_id = p_institute_id
      and tr.test_id = p_test_id
  )
  update public.test_results tr
  set rank = ranked.rnk
  from ranked
  where tr.id = ranked.id;
$$;

create or replace function public.test_results_after_change_recompute_rank()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Recompute for the affected test(s)
  if (tg_op = 'INSERT') then
    perform public.recompute_test_ranks(new.institute_id, new.test_id);
    return new;
  end if;

  if (tg_op = 'UPDATE') then
    -- if moved between tests, recompute both
    if old.test_id is distinct from new.test_id then
      perform public.recompute_test_ranks(old.institute_id, old.test_id);
    end if;
    perform public.recompute_test_ranks(new.institute_id, new.test_id);
    return new;
  end if;

  if (tg_op = 'DELETE') then
    perform public.recompute_test_ranks(old.institute_id, old.test_id);
    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists test_results_recompute_rank on public.test_results;
create trigger test_results_recompute_rank
after insert or update of marks_obtained, test_id, student_id or delete
on public.test_results
for each row
execute function public.test_results_after_change_recompute_rank();

-- Backfill ranks for existing rows
do $$
declare
  r record;
begin
  for r in (
    select distinct institute_id, test_id
    from public.test_results
  ) loop
    perform public.recompute_test_ranks(r.institute_id, r.test_id);
  end loop;
end $$;

