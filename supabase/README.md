# Database Migrations

SQL migration files for the Supabase project backing this app. Run them
**in order** in the Supabase SQL Editor (or via the Supabase CLI) on a
fresh project.

| File | What it does |
|---|---|
| `0001_initial_schema.sql` | Full schema: tables, enums, RLS policies, storage buckets, helper functions |
| `0002_training_plan_pdf_delete_policy.sql` | Adds a storage policy so admins can delete training plan PDFs |
| `0003_sync_profile_to_applications.sql` | Triggers that keep `applications` in sync with `profiles` (name/phone/email), and keep `profiles.email` in sync with the confirmed `auth.users` email |
| `0004_cleanup_delete_triggers_and_fk.sql` | Safer admin-account deletion: `created_by`/`assigned_by` go NULL instead of blocking delete; see in-file note about the `delete_auth_user_on_profile_delete` trigger |

After running these, create your first admin account:

```sql
update public.profiles set role = 'admin' where email = 'your-email@example.com';
```
