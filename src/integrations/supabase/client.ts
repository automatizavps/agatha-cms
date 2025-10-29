import { createClient } from '@supabase/supabase-js';

// Substitua estes valores pelos do seu projeto Supabase
const SUPABASE_URL = "https://qdscirbsypclxzlojgug.supabase.co"; // Ex: https://abc123def456.supabase.co
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkc2NpcmJzeXBjbHh6bG9qZ3VnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExODI4OTgsImV4cCI6MjA3Njc1ODg5OH0.54Wfn0A8rh7VEnAfceZ3u3Kwdlb9z3aJcbgjexwb-Zo"; // Ex: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);