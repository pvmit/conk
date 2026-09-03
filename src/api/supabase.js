import { emptyPoints, POINT_IDS } from "../types.js";

function asNumber(value) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function asPoint(row) {
  const id = String(row.point_id);
  const status = String(row.status);
  const ok =
    status === "neutral" || status === "red" || status === "blue" || status === "contested";
  return {
    point_id: id,
    status: ok ? status : "neutral",
    red_total_time: asNumber(row.red_total_time),
    blue_total_time: asNumber(row.blue_total_time),
    last_change_timestamp: String(row.last_change_timestamp),
    updated_at: String(row.updated_at),
  };
}

export function normalizeConfig(raw) {
  const supabaseUrl = String(raw.supabaseUrl ?? "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\/+$/, "");
  const supabaseAnonKey = String(raw.supabaseAnonKey ?? "").replace(/\s+/g, "");
  return { supabaseUrl, supabaseAnonKey };
}

export function explainConfig(config) {
  const { supabaseUrl, supabaseAnonKey } = config;
  if (!supabaseUrl || !supabaseAnonKey) {
    return "Wklej URL projektu i klucz anon / publishable.";
  }
  if (/github\.com|github\.io/i.test(supabaseUrl)) {
    return "To jest adres GitHuba. Potrzebny jest Project URL z Supabase, np. https://xxxx.supabase.co";
  }
  if (/^postgres(ql)?:\/\//i.test(supabaseUrl)) {
    return "Wkleiłeś connection string do Postgresa. Potrzebny jest Project URL: https://xxxx.supabase.co";
  }
  let parsed;
  try {
    parsed = new URL(supabaseUrl);
  } catch {
    return "URL wygląda niepoprawnie. Ma być: https://xxxx.supabase.co";
  }
  if (parsed.protocol !== "https:") {
    return "URL musi zaczynać się od https://";
  }
  if (parsed.hostname === "supabase.com" || parsed.hostname.endsWith(".supabase.com")) {
    return "To adres panelu, nie projektu. W Settings → API skopiuj Project URL (kończy się na .supabase.co).";
  }
  if (supabaseAnonKey.startsWith("http")) {
    return "W pole klucza wkleiłeś link. Wklej klucz anon / publishable (eyJ... albo sb_publishable_...).";
  }
  return null;
}

function headers(config, extra = {}) {
  return {
    apikey: config.supabaseAnonKey,
    Authorization: `Bearer ${config.supabaseAnonKey}`,
    Accept: "application/json",
    "Content-Type": "application/json",
    ...extra,
  };
}

async function rest(config, path, options = {}) {
  let res;
  try {
    res = await fetch(`${config.supabaseUrl}${path}`, {
      ...options,
      headers: headers(config, options.headers),
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "brak sieci";
    throw new Error(
      `Nie da się dostać do ${config.supabaseUrl} (${reason}). Sprawdź Project URL i czy projekt w Supabase nie jest pauzowany.`,
    );
  }

  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const msg =
      (data && (data.message || data.error_description || data.error || data.hint)) ||
      text ||
      res.statusText;
    if (res.status === 401 || res.status === 403) {
      throw new Error("Klucz odrzucony. Skopiuj ponownie anon public / publishable z Settings → API.");
    }
    if (res.status === 404) {
      throw new Error(
        "Nie znaleziono tabeli points. W SQL Editorze musi przejść cały skrypt (Success), nie sam link.",
      );
    }
    throw new Error(`${res.status}: ${msg}`);
  }

  return data;
}

async function fetchPoints(config) {
  const data = await rest(
    config,
    "/rest/v1/points?select=point_id,status,red_total_time,blue_total_time,last_change_timestamp,updated_at&order=point_id",
  );
  const rows = Array.isArray(data) ? data.map(asPoint) : [];
  return POINT_IDS.map(
    (id) => rows.find((p) => p.point_id === id) ?? emptyPoints().find((p) => p.point_id === id),
  );
}

async function callRpc(config, fn, args = {}) {
  const data = await rest(config, `/rest/v1/rpc/${fn}`, {
    method: "POST",
    body: JSON.stringify(args),
  });
  if (data == null) return data;
  const row = Array.isArray(data) ? data[0] : data;
  return row && row.point_id ? asPoint(row) : row;
}

function resetPayload() {
  const iso = new Date().toISOString();
  return {
    status: "neutral",
    red_total_time: 0,
    blue_total_time: 0,
    last_change_timestamp: iso,
    updated_at: iso,
  };
}

async function patchPoint(config, id, payload) {
  const data = await rest(
    config,
    `/rest/v1/points?point_id=eq.${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(payload),
    },
  );
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error(`Punkt ${id} nie istnieje w bazie.`);
  return asPoint(row);
}

async function resetPointRow(config, id) {
  try {
    return await callRpc(config, "reset_point", { p_id: id });
  } catch {
    return patchPoint(config, id, resetPayload());
  }
}

export async function testSupabase(raw) {
  const config = normalizeConfig(raw);
  const problem = explainConfig(config);
  if (problem) throw new Error(problem);
  const rows = await rest(config, "/rest/v1/points?select=point_id&limit=3");
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("Połączono, ale tabela points jest pusta. Uruchom jeszcze raz cały skrypt SQL.");
  }
}

export async function createSupabaseApi(raw) {
  const config = normalizeConfig(raw);
  return {
    mode: "supabase",
    loadPoints: () => fetchPoints(config),
    async setStatus(id, status) {
      return callRpc(config, "set_point_status", { p_id: id, new_status: status });
    },
    async resetPoint(id) {
      return resetPointRow(config, id);
    },
    async resetGame() {
      await Promise.all(POINT_IDS.map((id) => resetPointRow(config, id)));
    },
    subscribe(onChange) {
      const tick = () => {
        void fetchPoints(config).then(onChange).catch(() => undefined);
      };
      const timer = window.setInterval(tick, 1000);
      return () => window.clearInterval(timer);
    },
  };
}
