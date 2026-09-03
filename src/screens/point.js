import { applyStatusChange, formatHMS, statusLabel, toLivePoint } from "../time.js";
import { connectionBadge, el } from "../dom.js";
import { watchGame } from "../watch.js";
import { requestWakeLock } from "../wake-lock.js";

export function renderPoint(root, api, id) {
  const title = el("h1", {}, [`PUNKT ${id}`]);
  const statusChip = el("div", { class: "status-chip", role: "status" }, ["○ WOLNY"]);
  const redClock = el("div", { class: "clock" }, ["00:00:00"]);
  const blueClock = el("div", { class: "clock" }, ["00:00:00"]);
  const redRun = el("div", { class: "run-flag" }, ["▶ CZAS LECI"]);
  const blueRun = el("div", { class: "run-flag" }, ["▶ CZAS LECI"]);
  const redBtn = el("button", { class: "team-panel red", "data-status": "red" }, [
    el("div", { class: "who" }, ["🔴 CZERWONI"]),
    redClock,
    redRun,
  ]);
  const blueBtn = el("button", { class: "team-panel blue", "data-status": "blue" }, [
    el("div", { class: "who" }, ["🔵 NIEBIESCY"]),
    blueClock,
    blueRun,
  ]);
  const error = el("div", { class: "error" }, [""]);

  root.append(
    el("section", { class: "screen point-screen" }, [
      el("div", { class: "point-head" }, [
        el("button", { class: "ghost", "data-go": "#/" }, ["←"]),
        title,
        connectionBadge(api.mode),
      ]),
      statusChip,
      redBtn,
      blueBtn,
      el("div", { class: "point-actions" }, [
        el("button", { class: "action contested", "data-status": "contested" }, ["⚔ SPORNY"]),
        el("button", { class: "action reset", "data-reset": "1" }, ["RESET PUNKTU"]),
      ]),
      error,
    ]),
  );

  let snapshot = null;
  let pending = null;
  let busy = false;

  const paint = (point) => {
    if (!point) return;
    const live = toLivePoint(point);
    snapshot = live;
    redClock.textContent = formatHMS(live.redLive);
    blueClock.textContent = formatHMS(live.blueLive);
    redClock.classList.toggle("running", live.status === "red");
    blueClock.classList.toggle("running", live.status === "blue");
    redBtn.classList.toggle("active", live.status === "red");
    blueBtn.classList.toggle("active", live.status === "blue");
    redRun.hidden = live.status !== "red";
    blueRun.hidden = live.status !== "blue";
    statusChip.textContent = statusLabel(live.status);
    statusChip.className = `status-chip ${live.status}`;
  };

  const stopWatch = watchGame(api, (game) => {
    const point = game.points.find((p) => p.point_id === id);
    if (
      pending &&
      point &&
      point.status !== pending.status &&
      Date.now() - pending.at < 5000
    ) {
      paint(snapshot);
      return;
    }
    pending = null;
    paint(point);
  });

  const onClick = async (event) => {
    const target = event.target.closest("button");
    if (!target) return;
    if (target.dataset.go) {
      location.hash = target.dataset.go;
      return;
    }
    if (busy) return;
    try {
      busy = true;
      error.textContent = "";
      if (target.dataset.reset) {
        const ok = window.confirm(`Zresetować PUNKT ${id}? Czas tego punktu wróci do 00:00:00.`);
        if (ok) await api.resetPoint(id);
        return;
      }
      const status = target.dataset.status;
      if (!status) return;
      if (snapshot) {
        pending = { status, at: Date.now() };
        paint(applyStatusChange(snapshot, status));
      }
      await api.setStatus(id, status);
    } catch (err) {
      error.textContent = err instanceof Error ? err.message : "Nie udało się zapisać zmiany.";
    } finally {
      busy = false;
    }
  };

  root.addEventListener("click", onClick);
  let releaseWake = () => undefined;
  void requestWakeLock().then((release) => {
    releaseWake = release;
  });

  return () => {
    stopWatch();
    root.removeEventListener("click", onClick);
    releaseWake();
  };
}
