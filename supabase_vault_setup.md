```sql
-- Supabase Vault Setup for Strava Secrets

-- 1. Enable Vault Extension (Run once by a superuser if not already enabled)
-- Supabase typically handles this, but if manual action is needed:
CREATE EXTENSION IF NOT EXISTS supabase_vault CASCADE;

-- 2. Define Secrets
-- These commands will store the actual secret values.
-- Replace 'YOUR_STRAVA_CLIENT_ID' and 'YOUR_STRAVA_CLIENT_SECRET' with the actual values.
-- It's recommended to add these via the Supabase Dashboard for better security hygiene
-- if you are uncomfortable placing actual secrets in SQL scripts.
-- However, using the SQL functions is also a valid method.

-- Adding Strava Client ID
SELECT vault.create_secret('YOUR_STRAVA_CLIENT_ID', 'strava_client_id', 'Strava Application Client ID');

-- Adding Strava Client Secret
SELECT vault.create_secret('YOUR_STRAVA_CLIENT_SECRET', 'strava_client_secret', 'Strava Application Client Secret');

-- Note: The vault.create_secret function returns the UUID of the secret,
-- which can be useful for direct lookups if needed, but using the unique name is often easier.

-- 3. Access Control for Netlify Functions (using service_role)

-- By default, the `service_role` has broad permissions.
-- To allow services using the `service_role` (like Netlify functions)
-- to read these secrets, they need SELECT access on the `vault.decrypted_secrets` view.

-- Grant USAGE on the vault schema to service_role (usually already granted)
GRANT USAGE ON SCHEMA vault TO service_role;

-- Grant SELECT on the decrypted_secrets view to service_role
GRANT SELECT ON TABLE vault.decrypted_secrets TO service_role;

-- 4. Recommended: Create Security Definer Functions for Safer Access by Netlify Functions
-- This is a more secure method than granting direct SELECT on vault.decrypted_secrets to service_role,
-- as it limits exposure to only the specific secrets needed.

CREATE OR REPLACE FUNCTION get_strava_client_id()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'strava_client_id' LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION get_strava_client_secret()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'strava_client_secret' LIMIT 1;
$$;

-- Grant execute permission on these functions to the service_role
GRANT EXECUTE ON FUNCTION get_strava_client_id() TO service_role;
GRANT EXECUTE ON FUNCTION get_strava_client_secret() TO service_role;

-- Now, Netlify functions (or other services using the service_role) can call these functions
-- to get the secrets without having direct access to the entire vault.decrypted_secrets view.
-- Example usage in a Supabase client (JavaScript):
-- const { data: clientId, error: clientIdError } = await supabase.rpc('get_strava_client_id');
-- const { data: clientSecret, error: clientSecretError } = await supabase.rpc('get_strava_client_secret');

-- 5. Confirm Setup
-- - Check the Supabase Dashboard under Database > Vault to see the newly added secrets.
-- - Test accessing the secrets using the defined functions or direct view access
--   (depending on the chosen access control method) from a context that uses the `service_role`.
--   For example, using the Supabase SQL Editor, set the role to `service_role` and run:
--   SELECT * FROM vault.decrypted_secrets WHERE name = 'strava_client_id';
--   SELECT get_strava_client_id();

```

## Procedural Steps for a Supabase Admin:

1.  **Enable Vault:**
    *   Navigate to your Supabase project dashboard.
    *   Go to Database > Extensions.
    *   Search for "Vault" and enable it if it's not already active. (Alternatively, run `CREATE EXTENSION IF NOT EXISTS supabase_vault CASCADE;` via the SQL Editor as a superuser).

2.  **Add Secrets:**
    *   **Option A (Recommended - Via Dashboard):**
        *   Go to Database > Vault.
        *   Click "Add new secret".
        *   Enter the name (e.g., `strava_client_id`).
        *   Enter the secret value itself.
        *   Optionally, add a description.
        *   Save the secret.
        *   Repeat for `strava_client_secret`.
    *   **Option B (Via SQL):**
        *   Open the SQL Editor in the Supabase dashboard.
        *   Execute the `vault.create_secret` commands provided in the SQL script above, replacing placeholders with actual values.

3.  **Set Up Access Control (Recommended - Security Definer Functions):**
    *   Open the SQL Editor.
    *   Execute the `CREATE OR REPLACE FUNCTION` statements for `get_strava_client_id` and `get_strava_client_secret` provided in the SQL script.
    *   Execute the `GRANT EXECUTE` statements for these functions to the `service_role`.

4.  **Inform Development Team:**
    *   Provide the names of the accessor functions (`get_strava_client_id`, `get_strava_client_secret`) to the developers. They will use these functions via RPC calls in their Netlify functions using the Supabase client library with the `service_role` key.

## Accessing Secrets from Netlify Functions (using Supabase Client):

Netlify functions will use the Supabase JavaScript client library, configured with the project URL and the `service_role` key (which should be stored as a secure environment variable in Netlify).

```javascript
// Example in a Netlify function
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
// IMPORTANT: Use the service_role key for backend operations like accessing Vault secrets.
// Store this key securely in Netlify environment variables.
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function handler(event, context) {
  try {
    const { data: clientId, error: clientIdError } = await supabase.rpc('get_strava_client_id');
    if (clientIdError) throw clientIdError;

    const { data: clientSecret, error: clientSecretError } = await supabase.rpc('get_strava_client_secret');
    if (clientSecretError) throw clientSecretError;

    if (!clientId || !clientSecret) {
      console.error('Strava credentials not found in Vault.');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Strava credentials configuration error.' }),
      };
    }

    // Now use clientId and clientSecret for Strava API calls
    // ...

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Successfully fetched Strava secrets.' }),
    };

  } catch (error) {
    console.error('Error accessing Strava secrets:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to access Strava secrets.', details: error.message }),
    };
  }
}
```

This provides a comprehensive guide for setting up and accessing the Strava secrets in Supabase Vault for use by Netlify functions.
