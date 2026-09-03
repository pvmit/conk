import { createGameApi } from "./api/index.js";
import { consumeJoinLink, loadBundledConfig } from "./config.js";
import { clear } from "./dom.js";
import { isPointId } from "./types.js";
import { renderHome } from "./screens/home.js?v=wyniki3";
import { renderPoint } from "./screens/point.js?v=wyniki3";
import { renderAdmin } from "./screens/admin.js?v=wyniki3";
import { renderSetup } from "./screens/setup.js?v=wyniki3";
import { renderResults } from "./screens/results.js?v=wyniki3";

const app = document.querySelector("#app");
if (!app) throw new Error("Brak #app");

let api;
let stop;

async function boot() {
  consumeJoinLink();
  await loadBundledConfig();
  window.addEventListener("hashchange", () => {
    void route();
  });
  await route();
}

async function route() {
  stop?.();
  clear(app);
  if (!api) api = await createGameApi();

  const hash = location.hash.replace(/^#/, "") || "/";
  const parts = hash.split("/").filter(Boolean);

  const routeName = (parts[0] || "").toLowerCase();

  if (routeName === "join") {
    location.hash = "#/";
    return;
  }
  if (routeName === "setup") {
    stop = renderSetup(app, api);
    return;
  }
  if (routeName === "wyniki" || routeName === "score" || routeName === "wynik") {
    stop = renderResults(app, api);
    return;
  }
  if (parts[0] === "admin") {
    stop = renderAdmin(app, api);
    return;
  }
  if (parts[0] === "point" && parts[1] && isPointId(parts[1])) {
    stop = renderPoint(app, api, parts[1]);
    return;
  }
  stop = renderHome(app, api);
}

void boot();
