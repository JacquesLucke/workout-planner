export let wakeLock: WakeLockSentinel | null = null;

export async function ensureWakeLock() {
  if (wakeLock !== null) {
    return;
  }
  try {
    // May fail if e.g. another tab is open.
    wakeLock = await navigator.wakeLock.request("screen");
  } catch {
    return;
  }
  wakeLock.addEventListener("release", () => {
    wakeLock = null;
  });
}

export function ensureNoWakeLock() {
  if (wakeLock === null) {
    return;
  }
  wakeLock.release();
  wakeLock = null;
}
