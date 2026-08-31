# Submission checklist

## Product

- [ ] Hosted HTTPS app works in the intended WebMCP browser.
- [x] Human UI works without WebMCP support.
- [x] Reset Demo restores the fixture exactly.
- [x] Canonical journey runs ten consecutive times (Playwright).
- [x] No production, food-safety, or real-restaurant claims.

## Repository

- [x] Public-ready project structure.
- [x] MIT license.
- [x] Node version and local commands documented.
- [ ] Final README includes screenshots, live URL, architecture, limitations, and 15-second script.
- [x] Tool implementation is clearly discoverable in `src/webmcp/`.
- [ ] All required assets are committed and licensed.

README now includes architecture, limitations, and a 15-second script. Screenshots and live URL still pending.

## Validation

- [ ] `npm run check`
- [ ] `npm run test`
- [ ] `npm run test:e2e`
- [ ] `npm run build`
- [ ] Fresh-clone `npm ci && npm run build`
- [ ] Real WebMCP runtime invocation in Chrome.
- [ ] Deployed URL fresh-session test.

Playwright covers a mock `document.modelContext` in Chromium. The intended WebMCP host browser still needs a manual pass.

## Video

Held until explicit approval.

- [ ] Public YouTube URL.
- [ ] Under three minutes.
- [ ] Clear English audio.
- [ ] Product and real WebMCP interaction shown.
- [ ] Stale-plan rejection readable without pausing.
- [ ] Human-only approval visible.
- [ ] Synthetic fixture limitation stated.

## Submission copy

Held until explicit approval.

- [ ] Why the use case fits WebMCP.
- [ ] What human and agent do together that was difficult before.
- [ ] Specific audience and problem.
- [ ] Exact WebMCP implementation details.
- [ ] Creativity claim centers on a non-pausing shared operational page, not unverifiable uniqueness.
- [ ] Working live URL, public source URL, and video URL.
