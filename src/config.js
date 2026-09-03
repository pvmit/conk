const KEY = "conquest-config";

let bundled = null;

function normalize(parsed) {
  const supabaseUrl = String(parsed?.supabaseUrl ?? "")
    .trim()
    .replace(/\/+$/, "");
  const supabaseAnonKey = String(parsed?.supabaseAnonKey ?? "").replace(/\s+/g, "");
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return { supabaseUrl, supabaseAnonKey };
}

export function readStoredConfig() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return normalize(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function getConfig() {
  return readStoredConfig() ?? bundled;
}

export function saveConfig(config) {
  const normalized = normalize(config);
  if (normalized) localStorage.setItem(KEY, JSON.stringify(normalized));
}

export function clearConfig() {
  localStorage.removeItem(KEY);
}

export function hasSupabaseConfig() {
  return getConfig() !== null;
}

export function usesBundledConfig() {
  return !readStoredConfig() && bundled !== null;
}

export async function loadBundledConfig() {
  try {
    const res = await fetch(`./config.json?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return null;
    bundled = normalize(await res.json());
    return bundled;
  } catch {
    bundled = null;
    return null;
  }
}

export function joinUrl(config) {
  const normalized = normalize(config);
  if (!normalized) return "";
  const json = JSON.stringify(normalized);
  const token = btoa(unescape(encodeURIComponent(json)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
  const url = new URL(location.href);
  url.hash = `#/join/${token}`;
  return url.toString();
}

export function consumeJoinLink() {
  const raw = location.hash.replace(/^#/, "");
  const match = raw.match(/^\/join\/([^/]+)$/);
  if (!match) return false;
  try {
    let token = match[1].replace(/-/g, "+").replace(/_/g, "/");
    while (token.length % 4) token += "=";
    const parsed = JSON.parse(decodeURIComponent(escape(atob(token))));
    const normalized = normalize(parsed);
    if (!normalized) return false;
    saveConfig(normalized);
    location.hash = "#/";
    return true;
  } catch {
    return false;
  }
}
