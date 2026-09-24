import { useSyncExternalStore } from 'react';

// One shared, minute-aligned clock for anything that renders a countdown, instead of an interval
// per card. It only runs while something is subscribed. The snapshot is quantised to the start of
// the current minute so it is stable between ticks (useSyncExternalStore requires that) and stays
// correct even if the store sat unused for hours before the first subscriber mounted.
const MINUTE_MS = 60 * 1000;
const listeners = new Set();
let timer = null;

const currentMinute = () => Math.floor(Date.now() / MINUTE_MS) * MINUTE_MS;

function scheduleNextTick() {
  // Aim just past the minute boundary so the snapshot has definitely moved when we notify.
  timer = setTimeout(() => {
    listeners.forEach((listener) => listener());
    scheduleNextTick();
  }, MINUTE_MS - (Date.now() % MINUTE_MS) + 25);
}

function subscribe(listener) {
  listeners.add(listener);
  if (timer === null) scheduleNextTick();

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };
}

// Epoch ms, changing once a minute.
export function useNow() {
  return useSyncExternalStore(subscribe, currentMinute);
}
