-- Bind each authored record to the authenticated user to prevent actor spoofing.
drop policy if exists targets_write_coordinator on public.village_targets;
create policy targets_write_coordinator on public.village_targets for all
using(public.has_program_role(program_id,array['program_coordinator']::public.app_role[]) and updated_by=auth.uid())
with check(public.has_program_role(program_id,array['program_coordinator']::public.app_role[]) and updated_by=auth.uid());

drop policy if exists sessions_write_field_team on public.field_sessions;
create policy sessions_write_field_team on public.field_sessions for all
using(public.has_program_role(program_id,array['team_lead','vaccinator']::public.app_role[]) and created_by=auth.uid())
with check(public.has_program_role(program_id,array['team_lead','vaccinator']::public.app_role[]) and created_by=auth.uid());

drop policy if exists vaccine_write_field_team on public.vaccination_events;
create policy vaccine_write_field_team on public.vaccination_events for all
using(public.has_program_role(program_id,array['team_lead','vaccinator']::public.app_role[]) and created_by=auth.uid())
with check(public.has_program_role(program_id,array['team_lead','vaccinator']::public.app_role[]) and created_by=auth.uid());

drop policy if exists survey_write_assessor on public.coverage_surveys;
create policy survey_write_assessor on public.coverage_surveys for all
using(public.has_program_role(program_id,array['coverage_assessor']::public.app_role[]) and assessor_id=auth.uid())
with check(public.has_program_role(program_id,array['coverage_assessor']::public.app_role[]) and assessor_id=auth.uid());

drop policy if exists inventory_write_officer on public.inventory_transactions;
create policy inventory_write_officer on public.inventory_transactions for all
using(public.has_program_role(program_id,array['logistics_officer']::public.app_role[]) and recorded_by=auth.uid())
with check(public.has_program_role(program_id,array['logistics_officer']::public.app_role[]) and recorded_by=auth.uid());
