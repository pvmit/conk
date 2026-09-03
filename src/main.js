import { createGameApi } from "./api/index.js";
import { consumeJoinLink, loadBundledConfig } from "./config.js";
import { clear } from "./dom.js";
import { isPointId } from "./types.js";
import { renderHome } from "./screens/home.js";
import { renderPoint } from "./screens/point.js";
import { renderAdmin } from "./screens/admin.js";
import { renderSetup } from "./screens/setup.js";

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

  if (parts[0] === "join") {
    location.hash = "#/";
    return;
  }
  if (parts[0] === "setup") {
    stop = renderSetup(app, api);
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
