import { getConfig } from "../config.js";
import { createDemoApi } from "./demo.js";
import { createSupabaseApi } from "./supabase.js";

export async function createGameApi() {
  const config = getConfig();
  if (config) return createSupabaseApi(config);
  return createDemoApi();
}

export { testSupabase, normalizeConfig } from "./supabase.js";
