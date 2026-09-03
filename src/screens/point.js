import { formatHMS, statusLabel } from "../time.js";
import { connectionBadge, el } from "../dom.js";
import { watchGame } from "../watch.js";
import { requestWakeLock } from "../wake-lock.js";

export function renderPoint(root, api, id) {
  const title = el("h1", {}, [`PUNKT ${id}`]);
  const statusChip = el("div", { class: "status-chip", role: "status" }, ["○ WOLNY"]);
  const redClock = el("div", { class: "clock" }, ["00:00:00"]);
  const blueClock = el("div", { class: "clock" }, ["00:00:00"]);
  const redBtn = el("button", { class: "team-panel red", "data-status": "red" }, [
    el("div", { class: "who" }, ["🔴 CZERWONI"]),
    redClock,
  ]);
  const blueBtn = el("button", { class: "team-panel blue", "data-status": "blue" }, [
    el("div", { class: "who" }, ["🔵 NIEBIESCY"]),
    blueClock,
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

  let busy = false;
  const stopWatch = watchGame(api, (live) => {
    const point = live.points.find((p) => p.point_id === id);
    if (!point) return;
    redClock.textContent = formatHMS(point.redLive);
    blueClock.textContent = formatHMS(point.blueLive);
    statusChip.textContent = statusLabel(point.status);
    statusChip.className = `status-chip ${point.status}`;
    redBtn.classList.toggle("active", point.status === "red");
    blueBtn.classList.toggle("active", point.status === "blue");
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
      if (status) await api.setStatus(id, status);
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
