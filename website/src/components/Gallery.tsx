"use client";

import { useState } from "react";

export function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const [i, setI] = useState(0);
  if (!images.length) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-md bg-surface-2 text-7xl" aria-hidden>
        📦
      </div>
    );
  }
  return (
    <div>
      <div className="flex aspect-square items-center justify-center rounded-md bg-surface-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[i]} alt={alt} referrerPolicy="no-referrer" className="max-h-full max-w-full object-contain mix-blend-multiply" />
      </div>
      {images.length > 1 && (
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
          {images.map((src, n) => (
            <button
              key={src}
              type="button"
              onClick={() => setI(n)}
              aria-label={`Show image ${n + 1}`}
              aria-current={n === i}
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-surface-2 ${
                n === i ? "border-2 border-brand-500" : "border border-line"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src.replace("680x680", "150x150")} alt="" loading="lazy" referrerPolicy="no-referrer" className="max-h-12 max-w-12 object-contain mix-blend-multiply" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
