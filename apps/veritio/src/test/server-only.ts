// Next.js treats `server-only` as a compile-time boundary marker. Vitest needs
// an inert module so server route handlers can be imported for direct tests.
export {};
