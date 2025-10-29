import { createClient } from '@supabase/supabase-js';

// Substitua estes valores pelos do seu projeto Supabase
const SUPABASE_URL = "https://qdscirbsypclxzlojgug.supabase.co"; // Ex: https://abc123def456.supabase.co
const SUPABASE_PUBLISHABLE_KEY = "YOUR_SUPABASE_ANON_KEY"; // Ex: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);