"use client";

import { useSyncExternalStore } from "react";

/** Watchlist kept in the visitor's browser (localStorage). */
export interface SavedItem {
  slug: string;
  name: string;
  brand: string | null;
  image: string | null;
  price: number | null;
  savedAt: number;
}

const KEY = "cr_saved_v1";
const EMPTY: SavedItem[] = [];
const subs = new Set<() => void>();
let raw: string | null = null;
let parsed: SavedItem[] = EMPTY;

function snapshot(): SavedItem[] {
  try {
    const s = localStorage.getItem(KEY) ?? "[]";
    if (s !== raw) {
      raw = s;
      parsed = JSON.parse(s);
    }
  } catch {
    parsed = EMPTY;
  }
  return parsed;
}

function subscribe(cb: () => void) {
  subs.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    subs.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function write(items: SavedItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* storage blocked: nothing to do */
  }
  subs.forEach((f) => f());
}

export const useSaved = () => useSyncExternalStore(subscribe, snapshot, () => EMPTY);

export function toggleSaved(item: Omit<SavedItem, "savedAt">) {
  const cur = snapshot();
  write(cur.some((s) => s.slug === item.slug) ? cur.filter((s) => s.slug !== item.slug) : [{ ...item, savedAt: Date.now() }, ...cur]);
}

export function removeSaved(slug: string) {
  write(snapshot().filter((s) => s.slug !== slug));
}
