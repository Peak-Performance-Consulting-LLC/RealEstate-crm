const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables.");
}

export const env = {
  appName: import.meta.env.VITE_APP_NAME ?? "RealEstate CRM",
  supabaseUrl,
  supabaseAnonKey,
};
