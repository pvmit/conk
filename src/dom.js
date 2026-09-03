export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === false || value === undefined) continue;
    if (value === true) {
      node.setAttribute(key, "");
      continue;
    }
    if (key === "class") {
      node.className = value;
      continue;
    }
    node.setAttribute(key, value);
  }
  for (const child of children) node.append(child);
  return node;
}

export function clear(node) {
  node.replaceChildren();
}

export function connectionBadge(mode, ok = true) {
  const cls = !ok ? "offline" : mode === "supabase" ? "online" : "demo";
  const label = !ok ? "Brak połączenia" : mode === "supabase" ? "Na żywo" : "Demo";
  return el("div", { class: `conn ${cls}` }, [el("i"), ` ${label}`]);
}
