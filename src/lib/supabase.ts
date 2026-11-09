import { createClient } from "@supabase/supabase-js";
import { publicSupabaseKey, publicSupabaseUrl } from "./public-config";

const url = import.meta.env["VITE_SUPABASE_URL"] || publicSupabaseUrl;
const key = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] || publicSupabaseKey;
export const supabase = url && key ? createClient(url, key) : null;
