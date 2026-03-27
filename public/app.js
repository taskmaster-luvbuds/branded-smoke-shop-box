import { paintGuideOverlay } from "./guideOverlay.js";
import { resolvePlacementProfile } from "./compositeMath.js";

const form = document.getElementById("form");
const statusEl = document.getElementById("status");
const submitBtn = document.getElementById("submit");
const resultImg = document.getElementById("result-img");
const resultEmpty = document.getElementById("result-empty");
const resultActions = document.getElementById("result-actions");
const downloadBtn = document.getElementById("download-btn");
const geminiPanel = document.getElementById("gemini-only");
const compositePanel = document.getElementById("composite-only");
const modelSelect = document.getElementById("model");
const scaleInput = document.getElementById("scale");
const scaleVal = document.getElementById("scale-val");
const displayThumb = document.getElementById("display-thumb");
const displayColorInput = document.getElementById("displayColor");
const displayFileInput = form.querySelector('input[name="display"]');
const guideCanvas = document.getElementById("guide-canvas");
const showLayoutGuides = document.getElementById("show-layout-guides");
const showOcrGuides = document.getElementById("show-ocr-guides");
const scanOcrBtn = document.getElementById("scan-ocr");
const guideStatus = document.getElementById("guide-status");
const calibrationBadge = document.getElementById("calibration-badge");

/** @type {{ left: number, top: number, width: number, height: number, text?: string }[]} */
let ocrWords = [];

function refreshGuides() {
  if (!guideCanvas || !displayThumb) return;
  const layout = showLayoutGuides?.checked ?? true;
  const ocrOn = showOcrGuides?.checked && ocrWords.length > 0;
  const file = displayFileInput?.files?.[0];
  const customDisplay = !!(file && file.size);
  const colorId = displayColorInput?.value || "red";
  const nw = displayThumb.naturalWidth;
  const nh = displayThumb.naturalHeight;
  if (calibrationBadge) {
    if (nw > 1 && nh > 1) {
      const profile = resolvePlacementProfile(colorId, nw, nh, {
        customDisplay,
      });
      const src = customDisplay
        ? "your uploaded display"
        : colorId === "original"
          ? "Original PNG (smoke shop in a box display.png)"
          : `color chip “${colorId}” → /colors/*.jpg on server`;
      calibrationBadge.textContent = `Calibration: ${profile.kind} · ${nw}×${nh}px · ${src}`;
    } else {
      calibrationBadge.textContent = "Loading preview image…";
    }
  }
  paintGuideOverlay(guideCanvas, displayThumb, {
    showLayout: layout,
    words: ocrOn ? ocrWords : undefined,
    displayColorId: colorId,
    customDisplay,
  });
}

/** Keep blob URL alive until the next render so Download still works */
let resultObjectUrl = null;
let lastResultBlob = null;
/** Revoke previous preview URL when overriding with a file */
let previewObjectUrl = null;

function releaseResultObjectUrl() {
  if (resultObjectUrl) {
    URL.revokeObjectURL(resultObjectUrl);
    resultObjectUrl = null;
  }
  lastResultBlob = null;
}

function showResultImage(blob) {
  releaseResultObjectUrl();
  lastResultBlob = blob;
  resultObjectUrl = URL.createObjectURL(blob);
  resultImg.src = resultObjectUrl;
  resultImg.hidden = false;
  resultEmpty.hidden = true;
  if (resultActions) resultActions.hidden = false;
}

function getMode() {
  const el = form.querySelector('input[name="mode"]:checked');
  return el ? el.value : "composite";
}

function syncModeUi() {
  const mode = getMode();
  if (geminiPanel) geminiPanel.hidden = mode !== "gemini";
  if (compositePanel) compositePanel.hidden = mode !== "composite";
  if (modelSelect && mode === "gemini") {
    modelSelect.value = "gemini-2.5-flash-image";
  }
}

form.querySelectorAll('input[name="mode"]').forEach((r) => {
  r.addEventListener("change", syncModeUi);
});
syncModeUi();

if (scaleInput && scaleVal) {
  const upd = () => {
    scaleVal.textContent = String(Math.round(Number(scaleInput.value) * 100));
  };
  scaleInput.addEventListener("input", upd);
  upd();
}

async function syncDisplayThumb() {
  const { displayImageUrlForColorId } = await import("./colorMap.js");
  if (!displayThumb) return;
  if (previewObjectUrl) {
    URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl = null;
  }
  const file = displayFileInput?.files?.[0];
  if (file && file.size) {
    previewObjectUrl = URL.createObjectURL(file);
    displayThumb.src = previewObjectUrl;
    ocrWords = [];
    if (showOcrGuides) showOcrGuides.checked = false;
    if (guideStatus) guideStatus.hidden = true;
    return;
  }
  const id = displayColorInput?.value || "red";
  const u = displayImageUrlForColorId(id);
  displayThumb.src = u || "/default-display.png";
  ocrWords = [];
  if (showOcrGuides) showOcrGuides.checked = false;
  if (guideStatus) guideStatus.hidden = true;
}

async function initColorGrid() {
  const grid = document.getElementById("color-grid");
  if (!grid || !displayColorInput) return;
  const r = await fetch("/api/colors");
  const data = await r.json();
  grid.innerHTML = "";
  for (const c of data.colors) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "color-chip";
    b.dataset.id = c.id;
    b.textContent = c.label;
    if (c.id === displayColorInput.value) b.classList.add("color-chip--active");
    grid.appendChild(b);
  }
  const orig = document.createElement("button");
  orig.type = "button";
  orig.className = "color-chip color-chip--ghost";
  orig.dataset.id = "original";
  orig.textContent = "Original PNG";
  if (displayColorInput.value === "original") orig.classList.add("color-chip--active");
  grid.appendChild(orig);

  grid.querySelectorAll(".color-chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      displayColorInput.value = btn.dataset.id || "red";
      grid.querySelectorAll(".color-chip").forEach((x) => x.classList.remove("color-chip--active"));
      btn.classList.add("color-chip--active");
      syncDisplayThumb();
    });
  });
}

initColorGrid().then(() => syncDisplayThumb());

if (displayFileInput) {
  displayFileInput.addEventListener("change", () => syncDisplayThumb());
}

if (displayThumb) {
  displayThumb.addEventListener("load", () => {
    requestAnimationFrame(refreshGuides);
  });
}

if (typeof ResizeObserver !== "undefined" && displayThumb) {
  const ro = new ResizeObserver(() => refreshGuides());
  ro.observe(displayThumb);
}

showLayoutGuides?.addEventListener("change", refreshGuides);
showOcrGuides?.addEventListener("change", refreshGuides);

scanOcrBtn?.addEventListener("click", async () => {
  if (guideStatus) {
    guideStatus.hidden = false;
    guideStatus.classList.remove("error");
    guideStatus.textContent = "Running OCR (first run may take 10–20s)…";
  }
  scanOcrBtn.disabled = true;
  try {
    const fd = new FormData();
    const file = displayFileInput?.files?.[0];
    if (file && file.size) {
      fd.append("display", file);
    } else {
      fd.append("displayColor", displayColorInput?.value || "red");
    }
    const res = await fetch("/api/ocr", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.detail || data.error || `HTTP ${res.status}`);
    }
    ocrWords = (data.words || []).map((w) => ({
      left: w.left,
      top: w.top,
      width: w.width,
      height: w.height,
      text: w.text,
    }));
    if (showOcrGuides) showOcrGuides.checked = true;
    refreshGuides();
    if (guideStatus) {
      guideStatus.textContent = `OCR: ${ocrWords.length} word boxes on this display.`;
    }
  } catch (e) {
    if (guideStatus) {
      guideStatus.classList.add("error");
      guideStatus.textContent = String(e?.message || e);
    }
  } finally {
    scanOcrBtn.disabled = false;
  }
});

requestAnimationFrame(() => refreshGuides());

if (downloadBtn) {
  downloadBtn.addEventListener("click", () => {
    if (!resultObjectUrl || !lastResultBlob) return;
    const ext = lastResultBlob.type.includes("jpeg") ? "jpg" : "png";
    const a = document.createElement("a");
    a.href = resultObjectUrl;
    a.download = `branded-display.${ext}`;
    a.rel = "noopener";
    a.click();
  });
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  statusEl.hidden = false;
  statusEl.classList.remove("error");
  submitBtn.disabled = true;
  resultImg.hidden = true;
  resultEmpty.hidden = false;
  releaseResultObjectUrl();
  if (resultActions) resultActions.hidden = true;

  const mode = getMode();

  if (mode === "composite") {
    statusEl.textContent = "Compositing (no AI)…";
    try {
      const { buildCompositePng } = await import("./composite.js");
      const { displayImageUrlForColorId } = await import("./colorMap.js");
      const fd = new FormData(form);
      const logoFiles = fd.getAll("logos").filter((f) => f instanceof File && f.size);
      if (!logoFiles.length) {
        statusEl.classList.add("error");
        statusEl.textContent = "Select a logo image file.";
        return;
      }
      const displayInput = form.querySelector('input[name="display"]');
      const displayFile =
        displayInput?.files?.[0] instanceof File && displayInput.files[0].size
          ? displayInput.files[0]
          : null;

      const colorId = fd.get("displayColor") || "red";
      const displayUrl = displayFile ? null : displayImageUrlForColorId(String(colorId));

      const regionKey = fd.get("region") || "headerPerspective";
      const scale = Number(fd.get("scale") ?? 1);
      const offX = Number(fd.get("offX") ?? 0);
      const offY = Number(fd.get("offY") ?? 0);

      const blob = await buildCompositePng({
        displayFile,
        displayUrl,
        logoFile: logoFiles[0],
        regionKey,
        scale,
        offX,
        offY,
        displayColorId: String(colorId),
        customDisplay: Boolean(displayFile),
      });

      showResultImage(blob);
      statusEl.textContent = "Done — exact composite (original pixels preserved).";
    } catch (err) {
      statusEl.classList.add("error");
      statusEl.textContent = String(err?.message || err);
    } finally {
      submitBtn.disabled = false;
    }
    return;
  }

  statusEl.textContent = "Calling Gemini…";

  const fd = new FormData(form);

  try {
    const res = await fetch("/api/brand", {
      method: "POST",
      body: fd,
    });

    const ct = res.headers.get("content-type") || "";

    if (ct.includes("application/json")) {
      const err = await res.json();
      statusEl.classList.add("error");
      let t = err.error + (err.detail ? `: ${err.detail}` : "");
      if (err.hint) t += `\n\n${err.hint}`;
      statusEl.textContent = t;
      return;
    }

    if (!res.ok) {
      statusEl.classList.add("error");
      statusEl.textContent = `Request failed (${res.status})`;
      return;
    }

    const blob = await res.blob();
    showResultImage(blob);
    statusEl.textContent = "Done — AI blend (verify logo and spelling).";
  } catch (err) {
    statusEl.classList.add("error");
    statusEl.textContent = String(err?.message || err);
  } finally {
    submitBtn.disabled = false;
  }
});
