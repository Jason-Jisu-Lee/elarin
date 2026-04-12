import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

// ─── SecureStore adapter for Supabase session persistence ───
const SecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

const supabaseUrl: string = Constants.expoConfig?.extra?.supabaseUrl ?? "";
const supabaseAnonKey: string =
  Constants.expoConfig?.extra?.supabaseAnonKey ?? "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "[supabase] Missing SUPABASE_URL or SUPABASE_ANON_KEY in app.config.js extra",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
