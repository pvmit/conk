import { POINT_IDS } from "../types.js";
import { formatHMS, rankingPercents, statusLabel } from "../time.js";
import { connectionBadge, el } from "../dom.js";
import { watchGame } from "../watch.js";
import { requestWakeLock } from "../wake-lock.js";

export function renderAdmin(root, api) {
  const redTotal = el("div", { class: "total-row red" }, ["🔴 00:00:00"]);
  const blueTotal = el("div", { class: "total-row blue" }, ["🔵 00:00:00"]);
  const redBar = el("span");
  const blueBar = el("span");
  const redRankTime = el("strong", {}, ["00:00:00"]);
  const blueRankTime = el("strong", {}, ["00:00:00"]);
  const error = el("div", { class: "error" }, [""]);
  const cards = el("div", { class: "points" });
  const refs = new Map();

  for (const id of POINT_IDS) {
    const red = el("div", { class: "card-time red" }, ["🔴 00:00:00"]);
    const blue = el("div", { class: "card-time blue" }, ["🔵 00:00:00"]);
    const status = el("div", { class: "status-chip" }, ["○ WOLNY"]);
    refs.set(id, { red, blue, status });
    cards.append(
      el("a", { class: "point-card", href: `#/point/${id}` }, [
        el("h3", {}, [`PUNKT ${id}`]),
        red,
        blue,
        status,
      ]),
    );
  }

  root.append(
    el("section", { class: "screen admin" }, [
      el("div", { class: "topbar" }, [
        el("button", { class: "ghost", "data-go": "#/" }, ["← Menu"]),
        connectionBadge(api.mode),
        el("button", { class: "ghost", "data-go": "#/setup" }, ["Baza"]),
      ]),
      el("h1", { class: "admin-title" }, ["CONQUEST"]),
      el("div", { class: "totals" }, [
        el("h2", {}, ["ŁĄCZNA KONTROLA"]),
        redTotal,
        blueTotal,
      ]),
      el("div", { class: "ranking" }, [
        el("h3", {}, ["WIZUALIZACJA CZASU"]),
        row("🔴 CZERWONI", "red", redBar, redRankTime),
        row("🔵 NIEBIESCY", "blue", blueBar, blueRankTime),
      ]),
      cards,
      el("div", { class: "admin-actions" }, [
        el("button", { class: "danger", "data-reset": "1" }, ["RESET GRY"]),
      ]),
      error,
    ]),
  );

  const stopWatch = watchGame(api, (live) => {
    redTotal.textContent = `🔴 ${formatHMS(live.totals.red)}`;
    blueTotal.textContent = `🔵 ${formatHMS(live.totals.blue)}`;
    redRankTime.textContent = formatHMS(live.totals.red);
    blueRankTime.textContent = formatHMS(live.totals.blue);
    const pct = rankingPercents(live.totals.red, live.totals.blue);
    redBar.style.width = `${pct.red}%`;
    blueBar.style.width = `${pct.blue}%`;
    for (const point of live.points) updateCard(refs.get(point.point_id), point);
  });

  const onClick = async (event) => {
    const target = event.target.closest("a, button");
    if (!target) return;
    if (target.dataset.go) {
      event.preventDefault();
      location.hash = target.dataset.go;
      return;
    }
    if (!target.dataset.reset) return;
    const ok = window.confirm(
      "Zresetować całą grę? Punkty A, B i C wrócą do 00:00:00, suma też będzie zerowa.",
    );
    if (!ok) return;
    try {
      error.textContent = "";
      await api.resetGame();
    } catch (err) {
      error.textContent = err instanceof Error ? err.message : "Reset nie powiódł się.";
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

function updateCard(cardRefs, point) {
  if (!cardRefs) return;
  cardRefs.red.textContent = `🔴 ${formatHMS(point.redLive)}`;
  cardRefs.blue.textContent = `🔵 ${formatHMS(point.blueLive)}`;
  cardRefs.status.textContent = statusLabel(point.status);
  cardRefs.status.className = `status-chip ${point.status}`;
}

function row(label, team, bar, time) {
  return el("div", { class: "bar-block" }, [
    el("div", { class: "bar-label" }, [el("span", {}, [label]), time]),
    el("div", { class: `track ${team}` }, [bar]),
  ]);
}
