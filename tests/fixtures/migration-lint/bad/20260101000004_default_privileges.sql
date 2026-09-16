-- Deliberately BAD fixture: future functions auto-exposed to anon.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated;
