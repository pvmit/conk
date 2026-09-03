import { hasSupabaseConfig } from "../config.js";
import { connectionBadge, el } from "../dom.js";

export function renderHome(root, api) {
  const home = el("section", { class: "screen home" }, [
    el("div", { class: "topbar" }, [
      connectionBadge(api.mode),
      el("button", { class: "ghost", "data-go": "#/setup" }, ["Ustawienia"]),
    ]),
    el("h1", {}, ["CONQUEST"]),
    el("p", { class: "lead" }, ["Wybierz rolę tego urządzenia"]),
  ]);

  if (!hasSupabaseConfig()) {
    home.append(
      el("div", { class: "banner" }, [
        "Tryb demo działa tylko na tym telefonie. Do gry na kilku punktach połącz bazę w Ustawieniach.",
      ]),
    );
  }

  home.append(
    el("div", { class: "role-grid" }, [
      button("PUNKT A", "#/point/A"),
      button("PUNKT B", "#/point/B"),
      button("PUNKT C", "#/point/C"),
      el("button", { class: "role score", "data-go": "#/wyniki" }, ["WYNIKI"]),
      el("button", { class: "role admin", "data-go": "#/admin" }, ["ADMINISTRATOR"]),
    ]),
  );

  root.append(home);

  const onClick = (event) => {
    const target = event.target.closest("[data-go]");
    if (!target) return;
    location.hash = target.dataset.go ?? "#/";
  };
  root.addEventListener("click", onClick);
  return () => root.removeEventListener("click", onClick);
}

function button(label, href) {
  return el("button", { class: "role", "data-go": href }, [label]);
}
