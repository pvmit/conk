import { emptyPoint, POINT_IDS } from "./types.js";
import { liveMs } from "./time.js";

function freeze(run) {
  const extra = performance.now() - run.t0;
  return {
    red: run.status === "red" ? run.red + extra : run.red,
    blue: run.status === "blue" ? run.blue + extra : run.blue,
  };
}

function liveOf(point, team) {
  if (team === "red" && point.red_live != null) return point.red_live;
  if (team === "blue" && point.blue_live != null) return point.blue_live;
  return liveMs(point, team, point.server_now || Date.now());
}

function livePoints(runs) {
  return POINT_IDS.map((id) => {
    const run = runs.get(id);
    const raw = run?.raw ?? emptyPoint(id);
    if (!run) return { ...raw, redLive: 0, blueLive: 0 };
    const extra = performance.now() - run.t0;
    return {
      ...raw,
      status: run.status,
      redLive: run.status === "red" ? run.red + extra : run.red,
      blueLive: run.status === "blue" ? run.blue + extra : run.blue,
    };
  });
}

function toGame(runs) {
  const points = livePoints(runs);
  return {
    points,
    totals: {
      red: points.reduce((sum, p) => sum + p.redLive, 0),
      blue: points.reduce((sum, p) => sum + p.blueLive, 0),
    },
  };
}

export function watchGame(api, onUpdate) {
  const runs = new Map();
  let pending = null;

  const emit = () => onUpdate(toGame(runs));

  const adopt = (points) => {
    const now = Date.now();
    for (const id of POINT_IDS) {
      const point = points.find((p) => p.point_id === id) ?? emptyPoint(id);
      if (
        pending &&
        pending.id === id &&
        point.status !== pending.status &&
        now - pending.at < 1200
      ) {
        continue;
      }
      if (pending && pending.id === id && point.status === pending.status) {
        pending = null;
      }
      runs.set(id, {
        status: point.status,
        red: liveOf(point, "red"),
        blue: liveOf(point, "blue"),
        t0: performance.now(),
        raw: point,
      });
    }
    emit();
  };

  const nudge = (id, status) => {
    pending = { id, status, at: Date.now() };
    const prev = runs.get(id);
    const frozen = prev ? freeze(prev) : { red: 0, blue: 0 };
    const iso = new Date().toISOString();
    runs.set(id, {
      status,
      red: frozen.red,
      blue: frozen.blue,
      t0: performance.now(),
      raw: {
        ...(prev?.raw ?? emptyPoint(id)),
        status,
        red_total_time: frozen.red,
        blue_total_time: frozen.blue,
        red_live: frozen.red,
        blue_live: frozen.blue,
        last_change_timestamp: iso,
        updated_at: iso,
      },
    });
    emit();
  };

  const reset = (id) => {
    pending = { id, status: "neutral", at: Date.now() };
    runs.set(id, {
      status: "neutral",
      red: 0,
      blue: 0,
      t0: performance.now(),
      raw: emptyPoint(id),
    });
    emit();
  };

  const unsub = api.subscribe(adopt);
  void api.loadPoints().then(adopt);

  const timer = window.setInterval(emit, 100);
  const stop = () => {
    window.clearInterval(timer);
    unsub();
  };
  stop.nudge = nudge;
  stop.reset = reset;
  return stop;
}
