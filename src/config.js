const KEY = "conquest-config";

export function getConfig() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.supabaseUrl && parsed.supabaseAnonKey) {
      return {
        supabaseUrl: parsed.supabaseUrl.trim(),
        supabaseAnonKey: parsed.supabaseAnonKey.trim(),
      };
    }
  } catch {
    return null;
  }
  return null;
}

export function saveConfig(config) {
  localStorage.setItem(KEY, JSON.stringify(config));
}

export function clearConfig() {
  localStorage.removeItem(KEY);
}

export function hasSupabaseConfig() {
  return getConfig() !== null;
}
