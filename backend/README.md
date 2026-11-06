# iSIKHNAS Vaksinasi — preview + backend

## Live preview deployment
The public entry page is a prototype. Choose **Lihat mockup dengan akun demo** to explore; demo figures are illustrative and do not persist to the server.

## Backend configuration
The app uses Supabase Auth (email + password) and Postgres with Row Level Security. Set these Vercel project environment variables after provisioning Supabase:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`

The public publishable key is safe for browser use only because all tables have RLS. Never expose a secret/service-role key.

Apply `backend/migrations/202611060001_initial_schema.sql` to the new Supabase project. Create users through Supabase Auth, then have a national administrator assign rows in `user_roles` and `program_members`. Disable public sign-up in Supabase Auth for an invitation-only government workflow.

## Role model
- National admin: user administration and cross-program oversight.
- Program coordinator: creates and manages program, targets, membership and indicators.
- Team lead / vaccinator: field sessions and vaccination records.
- Coverage assessor: independent coverage survey records.
- Logistics officer: stock and movement records.
- Viewer: read-only program access.

Coverage survey and vaccination records are separate tables and separate write permissions. Offline submissions use a client-generated `client_event_id` as an idempotency key, so a retry does not duplicate the same event. Village targets are species-specific.

## iSIKHNAS data exchange
This prototype does not connect to iSIKHNAS. Before enabling production exchange, agree the authoritative identifiers, data dictionary, consent/privacy rules, validation, and API credentials with the iSIKHNAS data owner.
