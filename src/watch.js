import { toLiveGame } from "./time.js";

export function watchGame(api, onUpdate) {
  let points = [];
  let ready = false;

  const emit = () => {
    if (!ready) return;
    onUpdate(toLiveGame(points), points);
  };

  const unsub = api.subscribe((next) => {
    points = next;
    ready = true;
    emit();
  });

  void api.loadPoints().then((next) => {
    points = next;
    ready = true;
    emit();
  });

  const timer = window.setInterval(emit, 250);
  return () => {
    window.clearInterval(timer);
    unsub();
  };
}
