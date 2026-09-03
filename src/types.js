export const POINT_IDS = ["A", "B", "C"];

export function emptyPoint(id, now = new Date().toISOString()) {
  return {
    point_id: id,
    status: "neutral",
    red_total_time: 0,
    blue_total_time: 0,
    last_change_timestamp: now,
    updated_at: now,
  };
}

export function emptyPoints(now = new Date().toISOString()) {
  return POINT_IDS.map((id) => emptyPoint(id, now));
}

export function isPointId(value) {
  return value === "A" || value === "B" || value === "C";
}
