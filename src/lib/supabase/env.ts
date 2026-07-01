const supabaseUrlEnv = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKeyEnv = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrlEnv || !supabaseAnonKeyEnv) {
  throw new Error(
    "Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
  );
}

const supabaseUrl: string = supabaseUrlEnv;
const supabaseAnonKey: string = supabaseAnonKeyEnv;

export { supabaseUrl, supabaseAnonKey };
