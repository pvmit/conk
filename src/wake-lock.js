export async function requestWakeLock() {
  if (!navigator.wakeLock) return () => undefined;

  let current = null;
  const lock = async () => {
    try {
      current = await navigator.wakeLock.request("screen");
    } catch {
      current = null;
    }
  };

  await lock();
  const onVisible = () => {
    if (document.visibilityState === "visible") void lock();
  };
  document.addEventListener("visibilitychange", onVisible);

  return () => {
    document.removeEventListener("visibilitychange", onVisible);
    void current?.release();
  };
}
