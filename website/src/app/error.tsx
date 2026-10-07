"use client";

import { ErrorCard } from "@/components/States";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorCard message={error.message || "Unexpected error"} retry={reset} />;
}
