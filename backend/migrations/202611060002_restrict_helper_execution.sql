-- Restrict authorization helpers to signed-in users; trigger helper is trigger-only.
revoke execute on function public.add_program_creator_as_member() from public, anon, authenticated;
revoke execute on function public.has_global_role(public.app_role[]) from public, anon;
revoke execute on function public.is_program_member(uuid) from public, anon;
revoke execute on function public.has_program_role(uuid, public.app_role[]) from public, anon;

grant execute on function public.has_global_role(public.app_role[]) to authenticated;
grant execute on function public.is_program_member(uuid) to authenticated;
grant execute on function public.has_program_role(uuid, public.app_role[]) to authenticated;
