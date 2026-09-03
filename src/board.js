import { consumeJoinLink, loadBundledConfig } from "./config.js";
import { createGameApi } from "./api/index.js";
import { renderResults } from "./screens/results.js";

const app = document.querySelector("#app");
if (!app) throw new Error("Brak #app");

consumeJoinLink();
await loadBundledConfig();
const api = await createGameApi();
renderResults(app, api);
