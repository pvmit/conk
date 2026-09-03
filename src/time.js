import { emptyPoint, POINT_IDS } from "./types.js";

export function liveMs(point, team, now) {
  const stored = team === "red" ? point.red_total_time : point.blue_total_time;
  if (point.status !== team) return Math.max(0, stored);
  const started = Date.parse(point.last_change_timestamp);
  if (Number.isNaN(started)) return Math.max(0, stored);
  return Math.max(0, stored) + Math.max(0, now - started);
}

export function toLivePoint(point, now = Date.now()) {
  return {
    ...point,
    redLive: liveMs(point, "red", now),
    blueLive: liveMs(point, "blue", now),
  };
}

export function toLiveGame(points, now = Date.now()) {
  const byId = new Map(points.map((p) => [p.point_id, p]));
  const live = POINT_IDS.map((id) => toLivePoint(byId.get(id) ?? emptyPoint(id), now));
  return {
    points: live,
    totals: {
      red: live.reduce((sum, p) => sum + p.redLive, 0),
      blue: live.reduce((sum, p) => sum + p.blueLive, 0),
    },
  };
}

export function applyStatusChange(point, next, now = new Date()) {
  const iso = now.toISOString();
  return {
    ...point,
    status: next,
    red_total_time: liveMs(point, "red", now.getTime()),
    blue_total_time: liveMs(point, "blue", now.getTime()),
    last_change_timestamp: iso,
    updated_at: iso,
  };
}

export function applyReset(point, now = new Date()) {
  const iso = now.toISOString();
  return {
    ...point,
    status: "neutral",
    red_total_time: 0,
    blue_total_time: 0,
    last_change_timestamp: iso,
    updated_at: iso,
  };
}

export function formatHMS(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

export function rankingPercents(red, blue) {
  const total = red + blue;
  if (total <= 0) return { red: 0, blue: 0 };
  return {
    red: (red / total) * 100,
    blue: (blue / total) * 100,
  };
}

export function statusLabel(status) {
  switch (status) {
    case "red":
      return "🔴 KONTROLA";
    case "blue":
      return "🔵 KONTROLA";
    case "contested":
      return "⚔ SPORNY";
    default:
      return "○ WOLNY";
  }
}
