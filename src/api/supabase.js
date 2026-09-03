import { emptyPoints, POINT_IDS } from "../types.js";

const SUPABASE_ESM = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/+esm";

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

async function fetchPoints(client) {
  const { data, error } = await client
    .from("points")
    .select("point_id, status, red_total_time, blue_total_time, last_change_timestamp, updated_at")
    .order("point_id");
  if (error) throw error;
  const rows = (data ?? []).map(asPoint);
  return POINT_IDS.map((id) => rows.find((p) => p.point_id === id) ?? emptyPoints().find((p) => p.point_id === id));
}

async function callPointFn(client, fn, args) {
  const { data, error } = await client.rpc(fn, args);
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return asPoint(row);
}

async function loadClient(config) {
  const mod = await import(SUPABASE_ESM);
  return mod.createClient(config.supabaseUrl, config.supabaseAnonKey);
}

export async function testSupabase(config) {
  const client = await loadClient(config);
  const { error } = await client.from("points").select("point_id").limit(1);
  if (error) throw error;
}

export async function createSupabaseApi(config) {
  const client = await loadClient(config);
  return {
    mode: "supabase",
    loadPoints: () => fetchPoints(client),
    async setStatus(id, status) {
      return callPointFn(client, "set_point_status", { p_id: id, new_status: status });
    },
    async resetPoint(id) {
      return callPointFn(client, "reset_point", { p_id: id });
    },
    async resetGame() {
      const { error } = await client.rpc("reset_game");
      if (error) throw error;
    },
    subscribe(onChange) {
      const channel = client
        .channel("points-live")
        .on("postgres_changes", { event: "*", schema: "public", table: "points" }, () => {
          void fetchPoints(client).then(onChange).catch(() => undefined);
        })
        .subscribe();
      return () => {
        void client.removeChannel(channel);
      };
    },
  };
}
