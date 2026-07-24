"use client";

import { usePathname } from "next/navigation";
import { Analytics } from "@vercel/analytics/next";
import { MetaPixel } from "@/components/analytics/meta-pixel";

// Participant sessions (/s/*) and PDF render pages (/render/*) must not pay
// for marketing/analytics JS: participants are external test subjects, not
// marketing targets, and these routes are the most latency-sensitive pages.
// SpeedInsights intentionally stays global (rendered in the root layout) —
// it is the RUM instrument for exactly these routes.
export function AnalyticsGate({ pixelId }: { pixelId?: string }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/s/") || pathname?.startsWith("/render")) {
    return null;
  }
  return (
    <>
      <Analytics />
      <MetaPixel pixelId={pixelId} />
    </>
  );
}
