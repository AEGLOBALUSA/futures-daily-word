# Futures Church domain cutover → `futures.church`

Runbook for moving the new Futures Church site (and the Daily Word link-out)
onto the real **`futures.church`** domain.

Everything that can be prepared in code/config **without breaking the current
live setup has already been done** (see "Already prepped" below). The remaining
steps are infra + two env flips, and must happen **together at cutover** because
some of them point at `futures.church`, which 404s until DNS is switched.

---

## Current state (during the hold)

| Thing | Where it lives now | Notes |
|---|---|---|
| New church site | `https://futures-church.netlify.app` | Netlify project **`futures-church`** (site id `5d4b5e7e-14cc-44de-a76b-85419b1de3a2`) |
| `futures.church` | redirects to the **legacy** site (The Church Co) | intentional backup during the hold |
| `futures.global` | parked lander (redirects to `/lander`) | **not** the church site — don't link here |
| Daily Word app | `https://futuresdailyword.com` | Netlify project **`futures-daily-word`** |
| Church → Daily Word | "Open the full Daily Word app →" on `/daily-word` | → `futuresdailyword.com` ✅ live |
| Daily Word → Church | seam "Futures Church ↗" / "Back to Futures Church" | → `futures-church.netlify.app/daily-word` ✅ live |

---

## Already prepped (no action needed)

- **Daily Word return link is config-driven.** Defaults to the netlify.app URL;
  flip with one env var at cutover (step 4). No code change/PR required.
- **CORS allowlist** (`netlify/functions/lib/cors.js`) already includes
  `https://futures.church`, `https://www.futures.church`, and
  `https://futures-church.netlify.app` — so cross-origin works before and after.
- **Church SEO code already defaults to `https://futures.church`**
  (`metadataBase`, `sitemap.ts`, `robots.ts`, all JSON-LD). Only the Netlify env
  var `NEXT_PUBLIC_SITE_URL` is overriding it to netlify.app — flip in step 3.

> ⚠️ **Why we did NOT flip `NEXT_PUBLIC_SITE_URL` early:** it also feeds the
> intake admin **access-link generator** (`app/intake/admin/[slug]/page.tsx`).
> Setting it to `futures.church` before DNS is live would make every intake
> contributor link 404 during the hold. It must flip *with* DNS.

---

## Cutover steps (do in order, ideally in one sitting)

### 1. Attach the domain in Netlify (church project)
On the **`futures-church`** project → Domain management:
- Add custom domain **`futures.church`** and **`www.futures.church`**.
- Set **`futures.church`** as the **primary** domain.
  (Netlify will then 301 `futures-church.netlify.app` → `futures.church`.)

> ⚠️ **Do this AT cutover, not before.** We tried to pre-stage `futures.church`
> as a non-primary alias during the hold and Netlify rejected it:
> *"You cannot update domain aliases while primary custom domain is not set"* —
> aliases require a primary custom domain first. And setting `futures.church` as
> the primary now (with `force_ssl: true`) risks Netlify 301-ing the live
> `futures-church.netlify.app` → `futures.church`, which still serves the
> **legacy** site during the hold — breaking the only working church URL and the
> Daily Word return link. So the attach is safe only once DNS is ready to flip
> in the same sitting (steps 1→2 back-to-back).
> Current state confirmed: `custom_domain: None`, `domain_aliases: []`.

### 2. Point DNS at Netlify (registrar / DNS host)
- Switch `futures.church` DNS to Netlify (Netlify DNS, or apex `A`/`ALIAS` +
  `www` `CNAME` per Netlify's instructions).
- This is the moment the **legacy redirect to The Church Co stops** and the new
  site starts serving. Wait for HTTPS cert to provision (Netlify auto).

### 3. Flip the church site env → redeploy
On the **`futures-church`** project env vars:
- Set `NEXT_PUBLIC_SITE_URL = https://futures.church` (context: **all**).
- Trigger a redeploy.
- Fixes: canonical, `sitemap.xml`, `robots.txt`, OG/JSON-LD, **and** intake
  access links — all now use `futures.church`.

### 4. Flip the Daily Word link → redeploy
On the **`futures-daily-word`** project env vars:
- Set `VITE_CHURCH_DAILY_WORD_URL = https://futures.church/daily-word`
  (build-time var; redeploy required).
- Trigger a redeploy. The seam's "Futures Church ↗" / "Back to Futures Church"
  now point at the pretty domain.

### 5. Verify
```sh
# Church site live on the real domain
curl -sI https://futures.church/daily-word | grep -i "^HTTP"          # 200
curl -s https://futures.church/daily-word | grep -o '<link rel="canonical"[^>]*>'  # → futures.church
curl -s https://futures.church/daily-word | grep -c "Open the full Daily Word app" # 1

# netlify.app now redirects to the primary domain
curl -sI https://futures-church.netlify.app/ | grep -iE "^HTTP|location"  # 301 → futures.church

# Daily Word return link uses the pretty domain
B=$(curl -s https://futuresdailyword.com/ | grep -oE 'assets/index-[A-Za-z0-9_-]+\.js' | head -1)
curl -s "https://futuresdailyword.com/$B" | grep -c "futures.church/daily-word"   # 1

# Intake access links resolve (spot-check one real link from the admin)
# SEO surfaces
curl -s https://futures.church/sitemap.xml | grep -c "futures.church"   # > 0
curl -s https://futures.church/robots.txt
```

### 6. Post-cutover cleanup (optional)
- Update the `TODO`/comment in `src/components/Seam.tsx` if you want the
  hard-coded default to also be `futures.church` (cosmetic; env already wins).
- Decide what `futures.global` should do (redirect to `futures.church`, or leave
  as lander).
- Re-check `og:url` (currently hard-coded `https://futures.church` in layout — already correct).

---

## Rollback
If anything goes wrong, revert DNS to the legacy target and set
`NEXT_PUBLIC_SITE_URL` back to `https://futures-church.netlify.app`
+ unset `VITE_CHURCH_DAILY_WORD_URL`, then redeploy both. The netlify.app URL
keeps working throughout, so the new site is never unreachable.
