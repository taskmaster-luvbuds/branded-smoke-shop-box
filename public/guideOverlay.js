import { resolvePlacementProfile } from "./compositeMath.js";

const REGION_LABELS = {
  header: "header safe",
  topShelf: "top band (flat red)",
  middleShelf: "mid band (flat red)",
  bottom: "base safe",
};

/**
 * For object-fit: contain, compute the drawn image rect inside the element box.
 * @param {HTMLImageElement} img
 * @returns {{ ox: number, oy: number, scale: number, nw: number, nh: number }}
 */
export function getContainedImageRect(img) {
  const nw = img.naturalWidth || 1;
  const nh = img.naturalHeight || 1;
  const cw = img.clientWidth || 1;
  const ch = img.clientHeight || 1;
  const scale = Math.min(cw / nw, ch / nh);
  const w = nw * scale;
  const h = nh * scale;
  const ox = (cw - w) / 2;
  const oy = (ch - h) / 2;
  return { ox, oy, scale, nw, nh };
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLImageElement} img
 * @param {{ showLayout: boolean, words?: { left: number, top: number, width: number, height: number, text?: string }[], displayColorId?: string, customDisplay?: boolean }} opts
 */
export function drawGuideOverlay(ctx, img, opts) {
  const { showLayout, words, displayColorId, customDisplay } = opts;
  const cw = img.clientWidth;
  const ch = img.clientHeight;
  const { ox, oy, scale, nw, nh } = getContainedImageRect(img);

  const profile = resolvePlacementProfile(
    String(displayColorId || ""),
    img.naturalWidth || 1,
    img.naturalHeight || 1,
    { customDisplay: Boolean(customDisplay) }
  );
  const regions = profile.regions;
  const headerQuad = profile.headerQuad;

  ctx.clearRect(0, 0, cw, ch);

  if (showLayout) {
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    for (const key of Object.keys(regions)) {
      const r = regions[key];
      ctx.strokeStyle = "rgba(80, 220, 140, 0.95)";
      ctx.strokeRect(
        ox + r.left * nw * scale,
        oy + r.top * nh * scale,
        r.width * nw * scale,
        r.height * nh * scale
      );
      ctx.fillStyle = "rgba(80, 220, 140, 0.12)";
      ctx.font = "11px system-ui, sans-serif";
      ctx.fillText(
        REGION_LABELS[key] || key,
        ox + r.left * nw * scale + 4,
        oy + r.top * nh * scale + 14
      );
    }

    ctx.strokeStyle = "rgba(100, 190, 255, 0.95)";
    ctx.beginPath();
    for (let i = 0; i < headerQuad.length; i++) {
      const [nx, ny] = headerQuad[i];
      const px = ox + nx * nw * scale;
      const py = oy + ny * nh * scale;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(100, 190, 255, 0.85)";
    ctx.font = "11px system-ui, sans-serif";
    ctx.fillText(
      "header warp quad",
      ox + headerQuad[0][0] * nw * scale + 4,
      oy + headerQuad[0][1] * nh * scale + 14
    );
  }

  if (words && words.length) {
    ctx.setLineDash([]);
    ctx.lineWidth = 1.5;
    for (const w of words) {
      const x = ox + w.left * scale;
      const y = oy + w.top * scale;
      const ww = w.width * scale;
      const hh = w.height * scale;
      ctx.fillStyle = "rgba(255, 90, 90, 0.15)";
      ctx.strokeStyle = "rgba(255, 90, 90, 0.75)";
      ctx.fillRect(x, y, ww, hh);
      ctx.strokeRect(x, y, ww, hh);
    }
  }
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {HTMLImageElement} img
 * @param {{ showLayout: boolean, words?: { left: number, top: number, width: number, height: number }[], displayColorId?: string, customDisplay?: boolean }} opts
 */
export function paintGuideOverlay(canvas, img, opts) {
  const cw = img.clientWidth;
  const ch = img.clientHeight;
  if (cw < 2 || ch < 2) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(cw * dpr);
  canvas.height = Math.round(ch * dpr);
  canvas.style.width = `${cw}px`;
  canvas.style.height = `${ch}px`;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawGuideOverlay(ctx, img, opts);
}
