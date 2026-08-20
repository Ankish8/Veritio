// Only the pure URL builders live here. The Figma REST client and OAuth
// service are owned by the app (apps/veritio/src/services/figma) — the copies
// that used to sit alongside this file were stale duplicates (older OAuth
// scopes, a hardcoded localhost redirect URI) that nothing imported and that
// shadowed the real ones through this barrel.
export * from './embed-url'
