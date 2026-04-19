import { createClient } from '@supabase/supabase-js';

/**
 * Validates a required env var. Throws a developer-friendly Error with a
 * pointer to .env / Vercel project settings if missing or malformed.
 *
 * Exported for unit tests; module-load also calls it for the two Supabase
 * variables so a misconfigured deploy fails LOUD on first import instead
 * of producing cryptic auth errors later.
 */
export function requireEnv(name, value, { prefix } = {}) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(
      `[supabase config] Missing required env variable: ${name}. ` +
      `Set it in your local .env file (dev) or in your Vercel project settings (production).`
    );
  }
  if (prefix && !value.startsWith(prefix)) {
    throw new Error(
      `[supabase config] ${name} must start with "${prefix}". ` +
      `Got: "${value.slice(0, 30)}${value.length > 30 ? '...' : ''}". ` +
      `Check your .env or Vercel project settings.`
    );
  }
  return value;
}

const SUPABASE_URL = requireEnv(
  'VITE_SUPABASE_URL',
  import.meta.env.VITE_SUPABASE_URL,
  { prefix: 'https://' }
);
const SUPABASE_ANON_KEY = requireEnv(
  'VITE_SUPABASE_ANON_KEY',
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
