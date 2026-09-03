import { emptyPoints, POINT_IDS } from "../types.js";
import { applyReset, applyStatusChange } from "../time.js";

const STORAGE = "conquest-demo-points";
const CHANNEL = "conquest-demo-sync";

function fallback(id) {
  return emptyPoints().find((p) => p.point_id === id);
}

function read() {
  try {
    const raw = localStorage.getItem(STORAGE);
    if (!raw) return emptyPoints();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length !== 3) return emptyPoints();
    return POINT_IDS.map((id) => parsed.find((p) => p.point_id === id) ?? fallback(id));
  } catch {
    return emptyPoints();
  }
}

function write(points) {
  localStorage.setItem(STORAGE, JSON.stringify(points));
}

export function createDemoApi() {
  const listeners = new Set();
  const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(CHANNEL) : null;

  const notify = (points) => {
    write(points);
    for (const listener of listeners) listener(points);
    channel?.postMessage(points);
  };

  if (channel) {
    channel.onmessage = (event) => {
      if (!Array.isArray(event.data)) return;
      write(event.data);
      for (const listener of listeners) listener(event.data);
    };
  }

  const updateOne = (id, fn) => {
    const points = read().map((p) => (p.point_id === id ? fn(p) : p));
    const next = points.find((p) => p.point_id === id);
    notify(points);
    return next;
  };

  return {
    mode: "demo",
    async loadPoints() {
      const points = read();
      write(points);
      return points;
    },
    async setStatus(id, status) {
      return updateOne(id, (point) =>
        point.status === status ? point : applyStatusChange(point, status),
      );
    },
    async resetPoint(id) {
      return updateOne(id, (point) => applyReset(point));
    },
    async resetGame() {
      notify(emptyPoints());
    },
    subscribe(onChange) {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
  };
}
