# iSIKHNAS Vaksinasi

Responsive prototype for coordinating animal vaccination programmes across species, teams and villages.

## Current scope

- Coordinator dashboard with completeness, administrative coverage and timeliness indicators.
- Multi-species filters and mobile field-worker recording interface.
- Separate coverage-survey module for independent assessors.
- Login screen with Supabase email/password authentication and demo entry.
- Supabase database schema with role-based Row Level Security for programmes, targets, vaccination sessions and events, coverage surveys, and logistics.

## Open the mockup

Use the hosted Site preview shared in the project conversation, then choose **Lihat mockup dengan akun demo**. The displayed programme and figures are illustrative. Demo interactions are not saved to the database.

## Backend

Supabase project region: Singapore (Asia Southeast).

The initial schema and security migrations are in `backend/migrations`. The app uses the browser-safe publishable key in `supabase-config.js`; this key is intended to be public, while row-level security is enabled on all application tables. Never commit a service-role key.

User accounts must be created by an administrator. Assign system roles in `user_roles` and programme-specific roles in `program_members`. Disable public sign-up for a government workflow.

## Current limitations

- The dashboard still uses illustrative sample values; authenticated dashboard queries and real vaccine-record writes are the next implementation step.
- Offline synchronization is represented in the data model with client-generated idempotency IDs, but the browser queue is not implemented yet.
- No API connection to iSIKHNAS is configured. Confirm identifiers, data dictionary, validation rules, and credentials with the iSIKHNAS data owner before production exchange.
- Coverage methodology should be agreed before using survey results as programme performance estimates.
