import { clearConfig, getConfig, saveConfig } from "../config.js";
import { testSupabase, normalizeConfig } from "../api/index.js";
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
    placeholder: "eyJhbGciOi... albo sb_publishable_...",
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
        el("label", {}, ["Klucz anon albo publishable", key]),
        el("button", { class: "primary", id: "save" }, ["Zapisz i sprawdź połączenie"]),
        el("button", { class: "ghost", id: "demo" }, ["Wyczyść i wróć do trybu demo"]),
        status,
      ]),
      el("div", { class: "help" }, [
        el("p", {}, ["Na telefonach punktów i na panelu admina wklej te same dane."]),
        el("ol", {}, [
          el("li", {}, ["Utwórz darmowy projekt na supabase.com"]),
          el("li", {}, ["SQL Editor → wklej treść pliku schema.sql (nie link) → Run"]),
          el("li", {}, ["Settings → API → Project URL (https://xxxx.supabase.co)"]),
          el("li", {}, ["Settings → API → anon public albo publishable key"]),
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
      status.textContent = "Wklej URL projektu i klucz.";
      return;
    }
    status.className = "muted";
    status.textContent = "Sprawdzam połączenie…";
    try {
      const normalized = normalizeConfig(next);
      await testSupabase(normalized);
      saveConfig(normalized);
      status.className = "ok";
      status.textContent = "Połączono. Odświeżam aplikację…";
      window.setTimeout(() => location.reload(), 400);
    } catch (error) {
      status.className = "error";
      const message =
        error instanceof Error
          ? error.message
          : error && error.message
            ? error.message
            : "Nie udało się połączyć z bazą.";
      status.textContent = message;
    }
  };

  root.addEventListener("click", onClick);
  return () => root.removeEventListener("click", onClick);
}
