import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";
import createNextIntlPlugin from "next-intl/plugin";
import path from "path";
import { createSecurityHeaders } from "../../packages/config/security-headers/index.mjs";
import { marketingRoutes } from "../../packages/config/marketing-routes/index";

import { resolveLandingOrigin } from "./src/lib/landing-origin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const bundleAnalyzeMode = process.env.BUNDLE_ANALYZE;
const bundleAnalyzeEnabled =
  process.env.ANALYZE === "true" || !!bundleAnalyzeMode;
const analyzeServer = bundleAnalyzeMode
  ? ["server", "both"].includes(bundleAnalyzeMode)
  : true;
const analyzeBrowser = bundleAnalyzeMode
  ? ["browser", "both"].includes(bundleAnalyzeMode)
  : true;

const withBundleAnalyzer = bundleAnalyzer({
  enabled: bundleAnalyzeEnabled,
  analyzeServer,
  analyzeBrowser,
} as any);

const isDev = process.env.NODE_ENV !== "production";
const livePreviewFrameSrc = (() => {
  const configured = process.env.NEXT_PUBLIC_LIVE_PREVIEW_ORIGIN;
  if (!configured) return "";
  try {
    return ` ${new URL(configured).origin}`;
  } catch {
    return "";
  }
})();

// Marketing site origin — public routes come from the shared marketing manifest.
// Its assets load cross-origin
// from here, so it must be allowed in the asset CSP directives.
// Development uses the local landing server. That app pins its assets to :4003,
// keeping its /_next namespace separate while pages remain visible on :4001.
// Production uses the deployed landing unless an explicit origin overrides it.
const LANDING_ORIGIN = resolveLandingOrigin();

// PostHog: client-side posthog-js sends everything first-party through the
// managed reverse proxy at t.veritio.io (evades ad blockers). The us(.assets)
// hosts stay allowlisted as a fallback in case the proxy host is ever bypassed.
const posthogOrigins = [
  "https://t.veritio.io",
  "https://us.i.posthog.com",
  "https://us-assets.i.posthog.com",
].join(" ");

const scriptSrc = [
  "'self'",
  "'unsafe-inline'",
  ...(isDev ? ["'unsafe-eval'"] : []),
  "https://*.supabase.co",
  "https://connect.facebook.net",
  "https://t.veritio.io",
  "https://us-assets.i.posthog.com",
  LANDING_ORIGIN,
].join(" ");

const metaTrackingOrigins = [
  "https://www.facebook.com",
  "https://*.facebook.com",
  "https://*.facebook.net",
].join(" ");

const contentSecurityPolicy = `default-src 'self'; script-src ${scriptSrc} https://js.stripe.com; worker-src 'self' blob:; style-src 'self' 'unsafe-inline' ${LANDING_ORIGIN}; img-src 'self' https://*.supabase.co https://*.figma.com https://logos.composio.dev ${LANDING_ORIGIN} ${metaTrackingOrigins} ${posthogOrigins} data: blob:; font-src 'self' data: ${LANDING_ORIGIN}; media-src 'self' blob: data: https://*.r2.cloudflarestorage.com https://*.r2.dev https://*.supabase.co; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.up.railway.app wss://*.up.railway.app https://*.r2.cloudflarestorage.com https://*.r2.dev https://api.stripe.com https://*.polar.sh ${metaTrackingOrigins} ${posthogOrigins} ws://localhost:* wss://localhost:*; frame-src 'self' https://*.figma.com https://*.polar.sh https://polar.sh https://js.stripe.com https://hooks.stripe.com${livePreviewFrameSrc}; frame-ancestors 'self' ${LANDING_ORIGIN}; base-uri 'self'; form-action 'self';`;
const oauthConsentContentSecurityPolicy = contentSecurityPolicy.replace(
  /frame-ancestors [^;]+;/,
  "frame-ancestors 'none';",
);

const nextConfig: NextConfig = {
  poweredByHeader: false,

  // The default bottom-left dev indicator covers the mobile bottom nav in local
  // iPhone testing. Disable it so the local dev UI matches the real app surface.
  devIndicators: false,

  allowedDevOrigins: process.env.ALLOWED_DEV_ORIGINS?.split(",") || [],

  // Force Turbopack to bundle these pure-JavaScript server dependencies instead
  // of generating hashed external module names that cannot resolve at runtime.
  transpilePackages: ["pg", "pg-pool", "ioredis", "@veritio/prototype-test"],

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "logos.composio.dev",
      },
    ],
  },
  // Cache headers for static assets and participant pages
  async headers() {
    return [
      // Security headers for all routes
      {
        source: "/(.*)",
        headers: createSecurityHeaders({
          contentSecurityPolicy,
          frameOptions: "SAMEORIGIN",
          // camera=() disabled the camera for this origin too, so session
          // recording needs all three capture permissions same-origin.
          permissionsPolicy:
            "camera=(self), microphone=(self), display-capture=(self), geolocation=(), payment=(), usb=()",
        }),
      },
      // Consent is a security decision, so it must not be embedded even by
      // another same-origin page. Repeat the full policy so this exact-route
      // override does not weaken any of the global directives.
      {
        source: "/oauth/consent",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Content-Security-Policy",
            value: oauthConsentContentSecurityPolicy,
          },
          { key: "Cache-Control", value: "private, no-store" },
        ],
      },
      // Public directory static images — long-lived cache
      {
        source: "/images/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      // Public directory SVGs — long-lived cache
      {
        source: "/:path*.svg",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      // Participant pages — allow must-revalidate for fresh study data
      {
        source: "/s/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
        ],
      },
    ];
  },

  // www→apex at the routing layer (host-conditional) — previously done in
  // middleware, which forced an edge invocation on every request site-wide.
  async redirects() {
    return [
      ...marketingRoutes.flatMap((route) =>
        (route.redirectFrom ?? []).map((source) => ({
          source,
          destination: route.path,
          permanent: true,
        })),
      ),
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.veritio.io" }],
        destination: "https://veritio.io/:path*",
        permanent: true,
      },
    ];
  },

  // Proxy API requests to Motia server on port 4000
  // EXCEPT /api/auth/* which is handled by Better Auth in Next.js
  // BUT /api/auth/figma/* goes to Motia for Figma OAuth
  async rewrites() {
    return {
      // Multi-zone: serve the marketing site at these exact public paths by proxying
      // to the landing deployment. ('/' is handled in middleware instead, so logged-in
      // users still get the dashboard there.) Every other app URL is untouched.
      beforeFiles: [
        {
          // Motia rc.26 serializes string bodies as JSON. Route public snippet
          // files through Next so script tags receive executable JavaScript.
          source: "/api/snippet/:snippetFile([a-zA-Z0-9_-]+\\.js)",
          destination: "/api/snippet-script/:snippetFile",
        },
        ...marketingRoutes
          .filter((route) => route.path !== "/")
          .map((route) => ({
            source: route.path,
            destination: `${LANDING_ORIGIN}${route.path}`,
          })),
        {
          source: "/.well-known/security.txt",
          destination: `${LANDING_ORIGIN}/.well-known/security.txt`,
        },
        {
          // The education form is served at veritio.io/education, so it posts to
          // veritio.io/api/education-request. Without this it would fall through
          // to the /api/* backend proxy in afterFiles and 404 on the iii engine.
          // beforeFiles runs first, so this wins over that proxy.
          source: "/api/education-request",
          destination: `${LANDING_ORIGIN}/api/education-request`,
        },
      ],
      afterFiles: [
        {
          // Proxy /api/* to Motia EXCEPT /api/auth/* (Better Auth) and /api/billing/*
          // (Polar checkout/portal/webhook are Next.js route handlers — the webhook
          // needs the raw request body for Standard-Webhooks signature verification).
          // /api/mcp-keys/* and /api/mcp-oauth/* are also Next.js handlers.
          // Better Auth treats a key's
          // `permissions` as a server-only property and rejects it on any request
          // carrying headers, so key creation has to happen server-side rather than
          // by the browser calling /api/auth/api-key/create directly.
          // /api/v1/* is the public REST API, served by the catch-all route at
          // app/api/v1/[[...segments]]. It shares the MCP server's authorization
          // core, which lives in Next.js, so it cannot run on the iii engine.
          source:
            "/api/:path((?!auth|billing|snippet-script|mcp-keys|mcp-oauth|v1(?:/|$)).*)*",
          destination: process.env.MOTIA_BACKEND_URL
            ? `${process.env.MOTIA_BACKEND_URL}/api/:path*`
            : "http://localhost:4000/api/:path*",
        },
      ],
    };
  },

  serverExternalPackages: [
    "@aws-sdk/client-s3",
    "@aws-sdk/s3-request-presigner",
  ],

  experimental: {
    serverActions: {
      allowedOrigins: ["veritio.io", "www.veritio.io"],
    },
    optimizePackageImports: [
      "recharts",
      "d3",
      "lucide-react",
      "framer-motion",
      "@tiptap/react",
      "@tiptap/starter-kit",
      "@tiptap/extension-link",
      "@tiptap/extension-image",
      "@tiptap/extension-table",
      "@tiptap/extension-table-row",
      "@tiptap/extension-table-header",
      "@tiptap/extension-table-cell",
      "@tiptap/pm",
      "@dnd-kit/core",
      "@dnd-kit/sortable",
      "@dnd-kit/utilities",
      "wavesurfer.js",
      "date-fns",
      "radix-ui",
      "@veritio/ui",
      "@veritio/core",
      "@veritio/study-types",
      "@veritio/study-flow",
      "@veritio/card-sort",
      "@veritio/prototype-test",
      "@veritio/analysis-shared",
      "@veritio/dashboard-common",
      "@veritio/swr-config",
      "@veritio/yjs",
      "@veritio/auth",
    ],
  },

  productionBrowserSourceMaps: false,

  // Vercel's 8 GB Hobby builder repeatedly OOMs in Next's duplicate
  // "Running TypeScript" phase after compilation. Type safety remains a
  // required CI gate (`bun run type-check`) and local builds still run Next's
  // checker; only Vercel skips the redundant pass.
  typescript: {
    ignoreBuildErrors: process.env.VERCEL === "1",
  },

  turbopack: {
    // Monorepo root for workspace package resolution
    root: path.resolve(__dirname, "../.."),
    // Force external package resolution to prevent Turbopack from generating
    // hashed module names that cannot be required at runtime in dev.
    resolveAlias: {
      pg: "pg",
      "pg-pool": "pg-pool",
      ioredis: "ioredis",
    },
  },
};

export default withNextIntl(withBundleAnalyzer(nextConfig));
