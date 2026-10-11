# yuchu-essay-web

Public content website for **予初作文 (Yuchu Essay)** — the web face of a Chinese
primary-school writing platform. Same content as the WeChat mini program, rendered for
search engines and for browsers.

**Nuxt 4 · Vue 3 · Nitro · TypeScript · Tailwind 4**

**Live:** https://ssr.vunbo.com

Sibling repositories:

| Repo | What | Stack |
|---|---|---|
| [`yuchu-essay-api`](https://github.com/VunboYao/yuchu-essay-api) | The backend this site reads from | Go · Gin · GORM |
| [`yuchu-essay-admin`](https://github.com/VunboYao/yuchu-essay-admin) | Operations admin panel | React 19 |

> **Documentation note:** [`docs/`](./docs/) is written in Chinese. It contains a full
> performance write-up — what was measured, what was changed, what the numbers were, and
> what is still unfixed. It is the most useful folder in this repo if you care about SSR
> performance.

---

## Rendering strategy: per URL, not one mode for the whole site

The interesting part of this project is not "it uses Nuxt" — it is that each route gets the
rendering mode that fits its traffic and change rate.

| Route | Mode | Why |
|---|---|---|
| `/` | SSR + SWR 60s | Changes with the editorial calendar; a stale minute is fine, a slow first byte is not |
| `/category` | prerendered at build | The taxonomy changes rarely and the page is a pure function of it |
| `/articles`, `/essays` | SSR + SWR 120s | Paginated listings; each query string caches independently |
| `/articles/:id`, `/essays/:id` | SSR + SWR 10 min | The long tail; content is edited rarely and read often |
| `/search` | prerendered shell, results fetched in the browser | Query-string space is unbounded — SSR-ing it would produce cache churn for no SEO value, so the page is `noindex` |
| `/download-guide`, `/open-miniprogram` | prerendered at build | Static copy |

10 pages, 7 components, 2 server routes (sitemap, robots), ~3,100 lines.

---

## Caching and transport

- **Cache headers are layered, not one blanket value.** Static assets get a long cache;
  HTML gets a short `s-maxage`.
- **Compression is split by origin.** Static output is precompressed by Nitro at build time
  and served as-is; dynamic responses are compressed by Nginx. Doing both would compress
  twice.
- **Images are not proxied.** Instead of routing remote images through Nuxt's image handler,
  the URL is rewritten so Alibaba Cloud OSS serves a resized variant directly. Proxying
  would hand the internet a free image-processing service, cost Node CPU and bandwidth, and
  add a hop — rewriting lets OSS do the resize and benefit from its own cache.

---

## Quickstart

```bash
pnpm install
pnpm dev                 # http://localhost:5176
```

The API origin defaults to `http://localhost:8080`, so start the backend first.

| Variable | Purpose | Default |
|---|---|---|
| `NUXT_API_ORIGIN` | Server-side fetch target | `http://localhost:8080` |
| `NUXT_PUBLIC_API_BASE` | Browser request prefix; Nitro proxies it | `/api/v1` |
| `NUXT_PUBLIC_SITE_URL` | Absolute site URL for canonical, Open Graph, sitemap | — |

Browsers never talk to `NUXT_API_ORIGIN` directly — they call same-origin `/api/v1` and
Nitro proxies it, so the API origin is not exposed to the client.

```bash
pnpm build      # prerenders /category, the static pages, and the latest detail pages
pnpm preview
pnpm test       # 7 tests, no backend required
pnpm typecheck
```

`pnpm build` needs to reach `NUXT_API_ORIGIN`, because the prerender step fetches real
content. Building against the public API works:

```bash
NUXT_API_ORIGIN=https://api.vunbo.com \
NUXT_PUBLIC_SITE_URL=https://ssr.vunbo.com \
pnpm build
```

---

## Social cards

`public/og-*.png` — six 1200×630 Open Graph images — are generated, not drawn:

```bash
node scripts/generate-og-images.mjs
```

The script renders inline HTML templates in headless Chrome and quantises the result to a
128-colour palette. Changing the copy means editing `CARD_VARIANTS` in the script and
re-running it.

`og:image` must be an absolute URL, which `NUXT_PUBLIC_SITE_URL` supplies. Forget to set it
in production and every share card points at `localhost`.

---

## Known issues

Listed because they are real, not because they are hidden in a backlog nobody reads:

- **`pnpm typecheck` prints a non-fatal plugin error.** `@vue/language-core` probes for
  `vue-router/volar/sfc-route-blocks`, which `vue-router@4` does not export (it appears in
  v5). Type errors are still caught correctly and the command exits non-zero on a real
  error — verified by injecting type errors into both a `.vue` and a `.ts` file. The fix is
  a vue-router major upgrade, which has not been done.
- **SSR payload travels in plaintext.** The HTML and its `_payload.json` are not encrypted;
  this is inherent to the pattern and would need a transport-level answer.
- **HTML sets `s-maxage` but no `max-age`**, so browser caching is left to heuristics.
- **`og:image` still points at the original full-size object** rather than a pre-sized card.
- **The home page's TTFB is blocked by an `await`** that could be streamed.
- **SWR caches a failed first render** along with successful ones.

The measured baseline and the full list are in
[`docs/ssr-performance-interview.md`](./docs/ssr-performance-interview.md)
(Chinese) — including the Lighthouse numbers (performance 96, SEO 99, accessibility 100,
best practices 100) and the expected effect of each remaining fix.

---

## License

MIT — see [LICENSE](./LICENSE).

The original Chinese README is kept at [`README.zh-CN.md`](./README.zh-CN.md).
