ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name='users' AND column_name='password_hash';
