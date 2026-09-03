import { POINT_IDS } from "../types.js";
import { formatHMS, rankingPercents, statusLabel } from "../time.js";
import { connectionBadge, el } from "../dom.js";
import { watchGame } from "../watch.js";
import { requestWakeLock } from "../wake-lock.js";

export function renderResults(root, api) {
  const redTotal = el("div", { class: "total-row red" }, ["🔴 00:00:00"]);
  const blueTotal = el("div", { class: "total-row blue" }, ["🔵 00:00:00"]);
  const lead = el("p", { class: "lead-line muted" }, ["Czas kontroli na żywo"]);
  const redBar = el("span");
  const blueBar = el("span");
  const redRankTime = el("strong", {}, ["00:00:00"]);
  const blueRankTime = el("strong", {}, ["00:00:00"]);
  const cards = el("div", { class: "points" });
  const refs = new Map();

  for (const id of POINT_IDS) {
    const red = el("div", { class: "card-time red" }, ["🔴 00:00:00"]);
    const blue = el("div", { class: "card-time blue" }, ["🔵 00:00:00"]);
    const status = el("div", { class: "status-chip" }, ["○ WOLNY"]);
    refs.set(id, { red, blue, status });
    cards.append(
      el("div", { class: "point-card" }, [
        el("h3", {}, [`PUNKT ${id}`]),
        red,
        blue,
        status,
      ]),
    );
  }

  root.append(
    el("section", { class: "screen admin board" }, [
      el("div", { class: "topbar board-top" }, [connectionBadge(api.mode)]),
      el("h1", { class: "admin-title" }, ["CONQUEST"]),
      el("div", { class: "totals" }, [
        el("h2", {}, ["WYNIK NA ŻYWO"]),
        redTotal,
        blueTotal,
        lead,
      ]),
      el("div", { class: "ranking" }, [
        el("h3", {}, ["ŁĄCZNY CZAS KONTROLI"]),
        row("🔴 CZERWONI", "red", redBar, redRankTime),
        row("🔵 NIEBIESCY", "blue", blueBar, blueRankTime),
      ]),
      cards,
    ]),
  );

  const stopWatch = watchGame(api, (live) => {
    redTotal.textContent = `🔴 ${formatHMS(live.totals.red)}`;
    blueTotal.textContent = `🔵 ${formatHMS(live.totals.blue)}`;
    redTotal.classList.toggle("running", live.points.some((p) => p.status === "red"));
    blueTotal.classList.toggle("running", live.points.some((p) => p.status === "blue"));
    redTotal.classList.toggle("ahead", live.totals.red > live.totals.blue);
    blueTotal.classList.toggle("ahead", live.totals.blue > live.totals.red);
    redRankTime.textContent = formatHMS(live.totals.red);
    blueRankTime.textContent = formatHMS(live.totals.blue);
    const pct = rankingPercents(live.totals.red, live.totals.blue);
    redBar.style.width = `${pct.red}%`;
    blueBar.style.width = `${pct.blue}%`;
    if (live.totals.red === 0 && live.totals.blue === 0) {
      lead.textContent = "Czas kontroli na żywo";
    } else if (live.totals.red === live.totals.blue) {
      lead.textContent = "Remis w czasie kontroli";
    } else if (live.totals.red > live.totals.blue) {
      lead.textContent = "Więcej czasu kontroli: Czerwoni";
    } else {
      lead.textContent = "Więcej czasu kontroli: Niebiescy";
    }
    for (const point of live.points) {
      const card = refs.get(point.point_id);
      if (!card) continue;
      card.red.textContent = `🔴 ${formatHMS(point.redLive)}`;
      card.blue.textContent = `🔵 ${formatHMS(point.blueLive)}`;
      card.red.classList.toggle("running", point.status === "red");
      card.blue.classList.toggle("running", point.status === "blue");
      card.status.textContent = statusLabel(point.status);
      card.status.className = `status-chip ${point.status}`;
    }
  });

  let releaseWake = () => undefined;
  void requestWakeLock().then((release) => {
    releaseWake = release;
  });

  return () => {
    stopWatch();
    releaseWake();
  };
}

function row(label, team, bar, time) {
  return el("div", { class: "bar-block" }, [
    el("div", { class: "bar-label" }, [el("span", {}, [label]), time]),
    el("div", { class: `track ${team}` }, [bar]),
  ]);
}
