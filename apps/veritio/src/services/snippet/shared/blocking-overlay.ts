/**
 * Shared blocking overlay code for live-website-snippet.ts and proxy-companion.ts.
 *
 * Returns JS function declarations for showBlockingOverlay/removeBlockingOverlay.
 * These rely on closure variables: studySettings, blockingOverlay.
 *
 * Generated code is self-contained vanilla ES5 — no ESM, no bundler.
 */

export function getBlockingOverlayCode(): string {
  return `
  function showBlockingOverlay() {
    if (!studySettings.blockBeforeStart) return;
    if (blockingOverlay) return;
    blockingOverlay = document.createElement('div');
    blockingOverlay.id = '__veritio_lwt_overlay';
    blockingOverlay.style.cssText = 'position:fixed;inset:0;z-index:2147483645;background:rgba(0,0,0,0.3);pointer-events:auto;cursor:not-allowed;';
    document.body.appendChild(blockingOverlay);
    document.body.style.overflow = 'hidden';
  }

  function removeBlockingOverlay() {
    if (blockingOverlay && blockingOverlay.parentNode) {
      blockingOverlay.parentNode.removeChild(blockingOverlay);
      blockingOverlay = null;
    }
    document.body.style.overflow = '';
  }
`
}
