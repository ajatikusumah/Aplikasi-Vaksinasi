# iSIKHNAS Vaksinasi

Responsive web prototype for animal vaccination programmes across species, teams and villages.

## GitHub Pages

The app is published at [https://ajatikusumah.github.io/Aplikasi-Vaksinasi/](https://ajatikusumah.github.io/Aplikasi-Vaksinasi/). The smartphone installation guide is available at [https://ajatikusumah.github.io/Aplikasi-Vaksinasi/install.html](https://ajatikusumah.github.io/Aplikasi-Vaksinasi/install.html). Choose **Lihat mockup dengan akun demo** to explore sample screens. Demo entries do not reach the database.

## Live backend features

The app uses Supabase email/password authentication and Postgres Row Level Security. After signing in with an account assigned to a programme, the interface can:

- Create programmes with programme codes, dates, species and completeness, coverage and timeliness targets.
- Set village-level target populations for each programme and species.
- Record GPS-tagged vaccination counts and vaccine batch information.
- Queue vaccination events locally while offline and retry synchronisation with a stable client event ID.
- Record separate GPS-tagged coverage-survey observations.
- Assign programme members by Supabase user UUID and programme-specific role.
- Register logistics items and stock movement transactions.
- Display programme data in the dashboard, subject to the user's role and programme membership.

## Backend setup

Supabase project region: Singapore (Asia Southeast). Database migrations are in `backend/migrations`.

Roles include national administrator, programme coordinator, team lead, vaccinator, independent coverage assessor, logistics officer and viewer. System roles are maintained in `user_roles`; programme-specific roles are maintained in `program_members`. Public sign-up should remain disabled for an invitation-based government workflow. Create user accounts in Supabase Auth, then assign roles and programme membership.

The browser uses the Supabase publishable key in `supabase-config.js`. It is intended for public browser use; table access is enforced by RLS. Never commit a service-role key.

## Current boundaries

- Timeliness is not calculated yet because village-level planned dates are not modelled.
- Survey results are shown as a crude sample proportion and are not design-weighted prevalence estimates.
- The map graphic remains illustrative; record coordinates are stored but not yet rendered as a geographic map.
- The offline queue currently covers vaccination events only.
- No API exchange with iSIKHNAS is configured. Agree identifiers, data definitions, validation and credentials with the iSIKHNAS data owner before production exchange.
