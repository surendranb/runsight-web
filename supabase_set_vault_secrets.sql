-- supabase_set_vault_secrets.sql

-- Function to set/update the Strava Client ID in Vault
CREATE OR REPLACE FUNCTION set_strava_client_id(new_value TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete existing secret with this name, if any
  DELETE FROM vault.secrets WHERE name = 'strava_client_id';

  -- Create the new secret
  PERFORM vault.create_secret(new_value, 'strava_client_id', 'Strava Application Client ID');
END;
$$;

-- Grant execute permission to service_role (used by Netlify functions)
GRANT EXECUTE ON FUNCTION set_strava_client_id(TEXT) TO service_role;


-- Function to set/update the Strava Client Secret in Vault
CREATE OR REPLACE FUNCTION set_strava_client_secret(new_value TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete existing secret with this name, if any
  DELETE FROM vault.secrets WHERE name = 'strava_client_secret';

  -- Create the new secret
  PERFORM vault.create_secret(new_value, 'strava_client_secret', 'Strava Application Client Secret');
END;
$$;

-- Grant execute permission to service_role (used by Netlify functions)
GRANT EXECUTE ON FUNCTION set_strava_client_secret(TEXT) TO service_role;
