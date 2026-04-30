-- Migration: batch edit test_result feedback + time sorting helpers
-- Adds:
-- - index to efficiently sort/paginate results by created_at
-- - RPC to list results for a test ordered by time (supports batching)
-- - RPC to batch update feedback fields (improvement_area, remark)

create index if not exists test_results_test_created_at_idx
  on public.test_results(institute_id, test_id, created_at, id);

create or replace function public.list_test_results_for_test_time_ordered(
  p_test_id text,
  p_limit integer default 50,
  p_offset integer default 0,
  p_ascending boolean default false
)
returns setof public.test_results
language sql
stable
set search_path = public
as $$
  select tr.*
  from public.test_results tr
  where tr.institute_id = public.current_institute_id()
    and tr.test_id = p_test_id
  order by
    case when p_ascending then tr.created_at end asc,
    case when p_ascending then tr.id end asc,
    case when not p_ascending then tr.created_at end desc,
    case when not p_ascending then tr.id end desc
  limit greatest(p_limit, 0)
  offset greatest(p_offset, 0);
$$;

create or replace function public.batch_update_test_results_feedback(
  p_updates jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer := 0;
begin
  if public.current_role() not in ('admin', 'teacher') then
    raise exception 'not allowed';
  end if;

  with u as (
    select *
    from jsonb_to_recordset(coalesce(p_updates, '[]'::jsonb)) as x(
      id text,
      improvement_area text,
      remark text
    )
  )
  update public.test_results tr
  set
    improvement_area = coalesce(u.improvement_area, tr.improvement_area),
    remark = coalesce(u.remark, tr.remark)
  from u
  where tr.id = u.id
    and tr.institute_id = public.current_institute_id();

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

