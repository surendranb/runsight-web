-- === Section 1: public.users Table Definition ===

-- Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.users (
    id UUID NOT NULL PRIMARY KEY, -- This will be the foreign key to auth.users.id
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Profile information (some might be initially populated from auth.users or later by the app)
    email TEXT UNIQUE, -- Copied from auth.users.email, kept in sync by trigger/app logic
    strava_id INTEGER UNIQUE, -- Strava athlete ID, populated after Strava OAuth
    first_name TEXT,
    last_name TEXT,
    profile_picture_url TEXT, -- URL to the user's profile picture (e.g., from Strava)

    is_active BOOLEAN NOT NULL DEFAULT true, -- Application-specific active status

    -- Strava OAuth related fields (consider encrypting these in a real application)
    strava_access_token TEXT,
    strava_refresh_token TEXT,
    strava_token_expires_at TIMESTAMPTZ,
    strava_scope TEXT, -- e.g., "activity:read_all,profile:read_all"

    -- Store raw app_metadata from auth.users if needed for additional claims/profile info
    -- This can be useful for data not fitting neatly into columns or for quick reference
    raw_app_meta_data JSONB
);

-- Add comments to columns for clarity
COMMENT ON COLUMN public.users.id IS 'References auth.users.id. Primary key for user profile data.';
COMMENT ON COLUMN public.users.email IS 'User''s email, synced from auth.users.';
COMMENT ON COLUMN public.users.strava_id IS 'User''s Strava athlete ID.';
COMMENT ON COLUMN public.users.profile_picture_url IS 'URL for the user''s profile image.';
COMMENT ON COLUMN public.users.is_active IS 'Whether the user account is active within the application.';
COMMENT ON COLUMN public.users.strava_access_token IS 'Encrypted Strava access token.';
COMMENT ON COLUMN public.users.strava_refresh_token IS 'Encrypted Strava refresh token.';
COMMENT ON COLUMN public.users.strava_token_expires_at IS 'Timestamp when the Strava access token expires.';
COMMENT ON COLUMN public.users.strava_scope IS 'Scopes granted by the user during Strava OAuth.';
COMMENT ON COLUMN public.users.raw_app_meta_data IS 'Raw app_metadata from auth.users, can store custom claims or less structured profile info.';

-- Ensure Foreign Key constraint to auth.users.id
-- This needs to be run after the table is created, or if it might be missing.
-- Using a DO block to attempt adding constraint if it doesn't exist.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM   pg_constraint
        WHERE  conrelid = 'public.users'::regclass
        AND    conname = 'fk_users_auth_users_id'
    ) THEN
        ALTER TABLE public.users
        ADD CONSTRAINT fk_users_auth_users_id
        FOREIGN KEY (id)
        REFERENCES auth.users (id)
        ON DELETE CASCADE; -- Or ON DELETE SET NULL / RESTRICT depending on desired behavior

        RAISE NOTICE 'Foreign key fk_users_auth_users_id created on public.users.';
    ELSE
        RAISE NOTICE 'Foreign key fk_users_auth_users_id already exists on public.users.';
    END IF;
END;
$$;

-- Create an index on strava_id for faster lookups if your app frequently queries by it
CREATE INDEX IF NOT EXISTS idx_users_strava_id ON public.users (strava_id);

-- Create an index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (email);


-- === Section 2: updated_at Trigger for public.users ===

-- Function to update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it already exists, then recreate it
DROP TRIGGER IF EXISTS on_users_update_set_timestamp ON public.users;
CREATE TRIGGER on_users_update_set_timestamp
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

RAISE NOTICE 'Updated_at trigger setup for public.users completed.';


-- === Section 3: Trigger Function to Sync from auth.users to public.users ===

-- Function to copy new user data from auth.users to public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert a new row into public.users, linking it to the new auth.users record
    -- It's crucial that `NEW.id` from `auth.users` is used for `public.users.id`
    INSERT INTO public.users (id, email, raw_app_meta_data, created_at, updated_at)
    VALUES (
        NEW.id,                         -- The id from auth.users
        NEW.email,                      -- The email from auth.users
        NEW.raw_app_meta_data,          -- Copy app_metadata if available and needed
        NOW(),                          -- Set current timestamp for created_at
        NOW()                           -- Set current timestamp for updated_at
    );

    -- You might want to perform other actions here, like:
    -- - Populating other fields in public.users if data is available in NEW.raw_user_meta_data or NEW.raw_app_meta_data
    -- - Sending a welcome email (though this is often better handled by application logic or Supabase Hooks)

    RAISE NOTICE 'New user copied from auth.users to public.users. User ID: %, Email: %', NEW.id, NEW.email;
    RETURN NEW; -- The result of a trigger function is ignored for AFTER triggers, but it's good practice.
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; -- SECURITY DEFINER allows the function to run with the permissions of the user who defined it (owner)
                                  -- This is often necessary for triggers on auth.users to write to public schema tables.
                                  -- Ensure the function owner has necessary permissions on public.users.

-- Grant usage on the schema and necessary permissions if the function owner is not a superuser
-- Example: If your function is owned by 'postgres' and you want it to operate on 'public.users'
-- GRANT USAGE ON SCHEMA public TO postgres; -- Or the specific role owning the function
-- GRANT INSERT ON public.users TO postgres; -- Or the specific role owning the function


-- === Section 4: Trigger on auth.users ===

-- Drop the trigger if it already exists to prevent duplication errors on re-run
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger to execute 'handle_new_user' after a new user is inserted into auth.users
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

RAISE NOTICE 'Trigger on_auth_user_created on auth.users to sync to public.users has been set up.';

-- === End of SQL Script ===
-- Review and test thoroughly in a development environment before applying to production.
-- Consider security implications, especially for SECURITY DEFINER functions.
-- Ensure the role executing these commands has the necessary privileges.
