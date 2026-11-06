-- Allow any coordinator on the programme to maintain targets, while attributing the latest edit.
alter policy targets_write_coordinator on public.village_targets
using(private.has_program_role(program_id,array['program_coordinator']::public.app_role[]))
with check(private.has_program_role(program_id,array['program_coordinator']::public.app_role[]) and updated_by=auth.uid());
