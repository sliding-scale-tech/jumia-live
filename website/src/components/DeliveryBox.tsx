"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { naira } from "@/lib/format";
import type { Delivery, DeliveryOption } from "@/lib/types";

interface Place {
  id: number;
  name: string;
}

const PREF_KEY = "cr_location_v1";
const regionCache: { list?: Place[] } = {};
const cityCache = new Map<number, Place[]>();

async function getJSON<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(String(r.status));
  return r.json() as Promise<T>;
}

function readPref(): { regionId: number; cityId: number } | null {
  try {
    const v = JSON.parse(localStorage.getItem(PREF_KEY) ?? "null");
    return v && Number.isInteger(v.regionId) && Number.isInteger(v.cityId) ? v : null;
  } catch {
    return null;
  }
}

function Row({ icon, title, opt, price }: { icon: string; title: string; opt?: DeliveryOption; price: number | null }) {
  const offered = opt && opt.fee != null;
  return (
    <div className={`flex gap-3 rounded-md border p-3 ${offered ? "border-line bg-white" : "border-line-soft bg-surface-2"}`}>
      <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-line-soft bg-surface-2 text-xl">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-semibold">{title}</h3>
          {offered ? (
            <span className="text-sm font-bold text-brand-500">{naira(opt.fee)}</span>
          ) : (
            <span className="text-ink-4">Not available here</span>
          )}
        </div>
        {offered ? (
          <>
            <p className="mt-0.5 text-ink-3">
              Ready between <strong className="font-medium text-ink-2">{opt.eta_from}</strong>
              {opt.eta_to && opt.eta_to !== opt.eta_from && (
                <>
                  {" "}and <strong className="font-medium text-ink-2">{opt.eta_to}</strong>
                </>
              )}
            </p>
            {opt.order_within && <p className="text-ink-4">Order within {opt.order_within}</p>}
            {price != null && opt.fee != null && (
              <p className="mt-1 text-ink-3">
                Total with item: <strong className="font-semibold text-ink">{naira(price + opt.fee)}</strong>
              </p>
            )}
            {opt.note && (
              <details className="mt-1 text-ink-3">
                <summary className="cursor-pointer text-brand-500 hover:underline">Details</summary>
                <p className="mt-1 leading-4">{opt.note}</p>
              </details>
            )}
          </>
        ) : (
          <p className="mt-0.5 text-ink-4">Choose another area to see if this option is offered.</p>
        )}
      </div>
    </div>
  );
}

/** "Delivery & pickup fees" column: Jumia's two options with a Region -> City picker that re-fetches the fees. */
export function DeliveryBox({ slug, initial, price }: { slug: string; initial: Delivery | null; price: number | null }) {
  const [regions, setRegions] = useState<Place[]>(regionCache.list ?? []);
  const [cities, setCities] = useState<Place[]>([]);
  const [regionId, setRegionId] = useState<number | "">(initial?.location.region_id ?? "");
  const [cityId, setCityId] = useState<number | "">(initial?.location.city_id ?? "");
  const [options, setOptions] = useState<DeliveryOption[] | null>(initial?.options ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const token = useRef(0); // ignore answers that arrive after a newer selection

  const loadCities = useCallback(async (rid: number) => {
    const hit = cityCache.get(rid);
    if (hit) return hit;
    const { cities: list } = await getJSON<{ cities: Place[] }>(`/api/locations/cities/${rid}`);
    cityCache.set(rid, list);
    return list;
  }, []);

  const loadFees = useCallback(
    async (cid: number) => {
      const mine = ++token.current;
      setLoading(true);
      setError(false);
      try {
        const r = await getJSON<{ options: DeliveryOption[] }>(`/api/delivery/${encodeURIComponent(slug)}?city=${cid}`);
        if (mine === token.current) setOptions(r.options);
      } catch {
        if (mine === token.current) setError(true);
      } finally {
        if (mine === token.current) setLoading(false);
      }
    },
    [slug],
  );

  // on first render: region list, and the visitor's remembered location
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        if (!regionCache.list) regionCache.list = (await getJSON<{ regions: Place[] }>("/api/locations/regions")).regions;
        if (live) setRegions(regionCache.list);
        const pref = readPref();
        const rid = pref?.regionId ?? initial?.location.region_id;
        if (rid) {
          const list = await loadCities(rid);
          if (!live) return;
          setCities(list);
          setRegionId(rid);
          if (pref && pref.cityId !== initial?.location.city_id) {
            setCityId(pref.cityId);
            loadFees(pref.cityId);
          }
        }
      } catch {
        /* the pickers just stay empty; the default fees above still show */
      }
    })();
    return () => {
      live = false;
    };
  }, [initial, loadCities, loadFees]);

  const onRegion = async (rid: number) => {
    setRegionId(rid);
    setCityId("");
    setOptions(null);
    setError(false);
    token.current++;
    try {
      setCities(await loadCities(rid));
    } catch {
      setCities([]);
      setError(true);
    }
  };

  const onCity = (cid: number) => {
    setCityId(cid);
    try {
      localStorage.setItem(PREF_KEY, JSON.stringify({ regionId, cityId: cid }));
    } catch {
      /* storage blocked */
    }
    loadFees(cid);
  };

  const pickup = options?.find((o) => o.type === "pickup");
  const door = options?.find((o) => o.type === "door");
  const select = "h-9 w-full rounded-md border border-line bg-white px-2 text-ink disabled:bg-surface-2 disabled:text-ink-4";

  return (
    <section className="rounded-md border border-line bg-white" aria-label="Delivery and pickup fees">
      <h2 className="flex items-center gap-2 border-b border-line-soft px-5 py-3 text-sm font-bold">
        <span aria-hidden>🚚</span> Delivery &amp; pickup fees
      </h2>
      <div className="space-y-3 p-5">
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-1 xl:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-ink-3">State</span>
            <select value={regionId} onChange={(e) => onRegion(Number(e.target.value))} className={select} aria-label="State">
              <option value="" disabled>Select state</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-ink-3">City / area</span>
            <select
              value={cityId}
              onChange={(e) => onCity(Number(e.target.value))}
              disabled={!cities.length}
              className={select}
              aria-label="City or area"
            >
              <option value="" disabled>{cities.length ? "Select area" : "Choose a state first"}</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
        </div>

        {loading ? (
          <div className="space-y-2" aria-busy aria-label="Loading fees">
            <div className="shimmer h-20" />
            <div className="shimmer h-20" />
          </div>
        ) : error ? (
          <p className="rounded-md bg-brand-50 p-3 text-brand-600">
            Couldn&apos;t load the fees for this area.{" "}
            {cityId !== "" && (
              <button type="button" onClick={() => loadFees(Number(cityId))} className="font-bold underline">
                Try again
              </button>
            )}
          </p>
        ) : options ? (
          <>
            <Row icon="🏬" title="Pickup Station" opt={pickup} price={price} />
            <Row icon="🚚" title="Door Delivery" opt={door} price={price} />
          </>
        ) : (
          <p className="text-ink-3">Pick your state and area to see the delivery and pickup fees.</p>
        )}

        <p className="text-ink-4">Fees depend on the product&apos;s size and weight and on where you are. Shown as quoted by Jumia.</p>
      </div>
    </section>
  );
}
