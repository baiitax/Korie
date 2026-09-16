-- Deliberately BAD fixture: blanket grant of every function to anon.
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
