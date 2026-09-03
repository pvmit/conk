import { clearConfig, getConfig, saveConfig } from "../config.js";
import { testSupabase } from "../api/index.js";
import { connectionBadge, el } from "../dom.js";

export function renderSetup(root, api) {
  const current = getConfig();
  const url = el("input", {
    id: "url",
    placeholder: "https://xxxx.supabase.co",
    autocomplete: "off",
    spellcheck: "false",
  });
  url.value = current?.supabaseUrl ?? "";
  const key = el("textarea", {
    id: "key",
    placeholder: "eyJhbGciOi...",
  });
  key.value = current?.supabaseAnonKey ?? "";
  const status = el("p", { class: "muted" }, [""]);

  root.append(
    el("section", { class: "screen home" }, [
      el("div", { class: "topbar" }, [
        el("button", { class: "ghost", "data-go": "#/" }, ["← Wróć"]),
        connectionBadge(api.mode),
      ]),
      el("h1", {}, ["BAZA"]),
      el("p", { class: "lead" }, ["Centralna synchronizacja przez Supabase"]),
      el("div", { class: "form" }, [
        el("label", {}, ["URL projektu", url]),
        el("label", {}, ["Anon key", key]),
        el("button", { class: "primary", id: "save" }, ["Zapisz i sprawdź połączenie"]),
        el("button", { class: "ghost", id: "demo" }, ["Wyczyść i wróć do trybu demo"]),
        status,
      ]),
      el("div", { class: "help" }, [
        el("p", {}, ["Na telefonach punktów i na panelu admina wklej te same dane."]),
        el("ol", {}, [
          el("li", {}, ["Utwórz darmowy projekt na supabase.com"]),
          el("li", {}, ["SQL Editor → wklej plik supabase/schema.sql → Run"]),
          el("li", {}, ["Database → Replication → włącz tabelę points (Realtime)"]),
          el("li", {}, ["Settings → API → Project URL i anon public key"]),
        ]),
      ]),
    ]),
  );

  const onClick = async (event) => {
    const target = event.target.closest("button, [data-go]");
    if (!target) return;
    if (target.dataset.go) {
      location.hash = target.dataset.go;
      return;
    }
    if (target.id === "demo") {
      clearConfig();
      location.hash = "#/";
      location.reload();
      return;
    }
    if (target.id !== "save") return;
    const next = {
      supabaseUrl: url.value.trim(),
      supabaseAnonKey: key.value.trim(),
    };
    if (!next.supabaseUrl || !next.supabaseAnonKey) {
      status.className = "error";
      status.textContent = "Wklej URL i klucz.";
      return;
    }
    status.className = "muted";
    status.textContent = "Sprawdzam połączenie…";
    try {
      await testSupabase(next);
      saveConfig(next);
      status.className = "ok";
      status.textContent = "Połączono. Odświeżam aplikację…";
      window.setTimeout(() => location.reload(), 400);
    } catch (error) {
      status.className = "error";
      status.textContent =
        error instanceof Error
          ? `Nie udało się połączyć: ${error.message}`
          : "Nie udało się połączyć z bazą.";
    }
  };

  root.addEventListener("click", onClick);
  return () => root.removeEventListener("click", onClick);
}
