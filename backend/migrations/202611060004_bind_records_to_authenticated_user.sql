-- Bind each authored record to the authenticated user to prevent actor spoofing.
alter policy targets_write_coordinator on public.village_targets
using(public.has_program_role(program_id,array['program_coordinator']::public.app_role[]) and updated_by=auth.uid())
with check(public.has_program_role(program_id,array['program_coordinator']::public.app_role[]) and updated_by=auth.uid());

alter policy sessions_write_field_team on public.field_sessions
using(public.has_program_role(program_id,array['team_lead','vaccinator']::public.app_role[]) and created_by=auth.uid())
with check(public.has_program_role(program_id,array['team_lead','vaccinator']::public.app_role[]) and created_by=auth.uid());

alter policy vaccine_write_field_team on public.vaccination_events
using(public.has_program_role(program_id,array['team_lead','vaccinator']::public.app_role[]) and created_by=auth.uid())
with check(public.has_program_role(program_id,array['team_lead','vaccinator']::public.app_role[]) and created_by=auth.uid());

alter policy survey_write_assessor on public.coverage_surveys
using(public.has_program_role(program_id,array['coverage_assessor']::public.app_role[]) and assessor_id=auth.uid())
with check(public.has_program_role(program_id,array['coverage_assessor']::public.app_role[]) and assessor_id=auth.uid());

alter policy inventory_write_officer on public.inventory_transactions
using(public.has_program_role(program_id,array['logistics_officer']::public.app_role[]) and recorded_by=auth.uid())
with check(public.has_program_role(program_id,array['logistics_officer']::public.app_role[]) and recorded_by=auth.uid());
