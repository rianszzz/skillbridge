insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('evidence-private', 'evidence-private', false, 4194304, array['application/pdf', 'image/png', 'image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Object access remains server-only. User ownership is enforced by API before service-role operations.
