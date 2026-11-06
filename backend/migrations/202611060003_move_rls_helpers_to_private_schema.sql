-- Keep SECURITY DEFINER helpers outside PostgREST's exposed public schema.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

alter function public.add_program_creator_as_member() set schema private;
alter function public.has_global_role(public.app_role[]) set schema private;
alter function public.is_program_member(uuid) set schema private;
alter function public.has_program_role(uuid, public.app_role[]) set schema private;

grant execute on function private.has_global_role(public.app_role[]) to authenticated;
grant execute on function private.is_program_member(uuid) to authenticated;
grant execute on function private.has_program_role(uuid, public.app_role[]) to authenticated;
