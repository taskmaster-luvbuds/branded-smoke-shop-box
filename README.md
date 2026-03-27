# Display branding (composite + optional Gemini)

Small **Express** app: choose one of **nine shelf-band color variants** (JPEGs in `public/colors/`, sourced from your smokeshop color set), or **Original PNG**, or upload your own display. Then add **logo** image(s).

- **Exact composite (default):** runs in the **browser** — draws your logo onto the display with **no AI**. **`resolvePlacementProfile()`** in `public/compositeMath.js` uses **safe zones**: header = lower **⅔** of the white backboard (clear of top corner art); **two colored bands** = flat red below the scallops; **bottom** = base kickplate with margins. Optional **OCR** for nudging. Edit `HEADER_QUAD_*` / `REGIONS_*` if artwork changes.
- **AI blend (Gemini Nano Banana Pro):** server calls **`gemini-3-pro-image-preview`** (configurable) with **2K** `imageConfig` and a prompt that references the selected **color label** so the logo blends with the colored shelf bands.

**Quotas:** Image generation is billed separately from plain text. Google may show **`limit: 0`** on free-tier metrics for image models (your key still works, but that model has **no free image quota** on your project until policy changes or you use another model).

### If you see “quota exceeded” or `limit: 0`

1. **Try each model** in the UI (2.5 Flash, 3.1 Flash, 3 Pro) or set `GEMINI_IMAGE_MODEL` in `.env`—each has its own quota bucket. The API may rename models in errors (e.g. `gemini-3.1-flash-image` when you requested `gemini-3.1-flash-image-preview`); that is normal.
2. **If every image model shows `limit: 0`**, your Google project currently has **no free-tier image quota** allocated for those models. The fix is **not** in this app: enable **billing** on the Google Cloud project used for the Gemini API, or create a new API key under a project that still has image quota (see [pricing](https://ai.google.dev/pricing)).
3. **Check usage** at [ai.dev/rate-limit](https://ai.dev/rate-limit) and read [rate limits](https://ai.google.dev/gemini-api/docs/rate-limits).

## Setup

1. Create an API key: [Google AI Studio](https://aistudio.google.com/apikey).
2. Copy env:

   ```bash
   cp .env.example .env
   ```

3. Set `GEMINI_API_KEY` in `.env`. Optionally set `GEMINI_IMAGE_MODEL` (default `gemini-3-pro-image-preview`) and `GEMINI_IMAGE_SIZE` (`1K` / `2K` / `4K`, default `2K`).

4. Install and run:

   ```bash
   npm install
   npm start
   ```

5. Open `http://localhost:3000`. Static **`.js` / `.css`** are served with `Cache-Control: no-store` so placement math updates apply immediately (avoids stale `compositeMath.js` while `app.js` was versioned).

## Tests

```bash
npm test
```

## Deploy on Render

- **Web Service** (not static): this repo needs a server to hold the API key.
- Set **Environment** variables:
  - `GEMINI_API_KEY` (required)
  - `GEMINI_IMAGE_MODEL` (optional; default `gemini-3-pro-image-preview`)
  - `GEMINI_IMAGE_SIZE` (optional; default `2K`)
- **Build:** `npm install` **Start:** `npm start`  
- `render.yaml` defines the web service **`luvbuds`** (change `name` there if you want a different Render service name).

## API

- `GET /api/health` — `{ ok, hasKey, model, imageSize }`
- `GET /api/colors` — `{ colors: [{ id, label, url }] }` for shelf color variants under `/colors/*.jpg`
- `POST /api/ocr` — `multipart/form-data` with the same `display` / `displayColor` rules as branding; returns JSON `{ ok, imageWidth, imageHeight, words: [{ text, left, top, width, height, confidence }], text }` (pixel coordinates). Used by the UI for guide overlays; first request may be slow while the Tesseract worker initializes.
- `GET /default-display.png` — legacy reference PNG (used when **Original PNG** is selected and no upload).
- `POST /api/brand` — `multipart/form-data`:
  - `displayColor` (optional): one of `brown` | `darkBlue` | `green` | `gray` | `orange` | `pink` | `red` | `teal` | `yellow` | `original` — picks the base JPEG in `public/colors/` or the original PNG when `display` is not uploaded
  - `display` (optional): one image file; if present, overrides color/original
  - `logos` (optional): multiple image files
  - `prompt` (optional): extra text direction
  - `model` (optional): overrides `GEMINI_IMAGE_MODEL` for that request

Response: raw image bytes on success; JSON `{ error, detail }` on failure.

---

Generated images may include SynthID watermarking per Google’s policies.
