import dotenv from "dotenv";
import express from "express";
import fs from "fs";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { buildPrompt } from "./lib/brandPrompt.js";
import { DISPLAY_COLORS, getColorById } from "./lib/colors.js";
import {
  DEFAULT_DISPLAY_PATH,
  resolveDisplayBuffer,
  normalizeMime,
} from "./lib/displaySource.js";
import { nearestAspectRatioName, probeImageDimensions } from "./lib/imageDims.js";
import { recognizeBuffer, serializeWords } from "./lib/ocrService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 15 },
});

// Force HTML to be fresh so cached browser pages can't stick you on old defaults.
app.get(["/", "/index.html"], (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/favicon.ico", (_req, res) => {
  res.status(204).end();
});

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
/** Default to Pro image for quality closer to Gemini web; override via GEMINI_IMAGE_MODEL. */
const DEFAULT_MODEL =
  process.env.GEMINI_IMAGE_MODEL || "gemini-3-pro-image-preview";
const GEMINI_IMAGE_SIZE = process.env.GEMINI_IMAGE_SIZE || "2K";
const GEMINI_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";

const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
  "image/heif",
]);

function quotaHelpHint(detail) {
  const d = String(detail || "");
  if (!/quota|limit:\s*0|exceeded your current quota/i.test(d)) return undefined;
  return (
    "Google reported no usable free-tier quota for this image model (limit: 0 usually means image generation is not available on the free tier for your project, or that bucket is exhausted). " +
    "Try: (1) Nano Banana Pro in the dropdown if you have not yet, (2) enable billing for the Gemini API / Google Cloud project tied to your key—if every model shows limit:0, billing is usually required, (3) wait for the daily reset if you only hit a daily cap. " +
    "Docs: https://ai.google.dev/gemini-api/docs/rate-limits — usage: https://ai.dev/rate-limit"
  );
}

function extractImageFromResponse(data) {
  const parts = data.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    const inline = part.inlineData || part.inline_data;
    if (inline?.data) {
      return {
        mimeType: inline.mimeType || inline.mime_type || "image/png",
        data: inline.data,
      };
    }
  }
  return null;
}

app.use(
  express.static(path.join(__dirname, "public"), {
    setHeaders(res, filePath) {
      if (filePath.endsWith(".html")) {
        res.setHeader("Cache-Control", "no-store");
      }
      // JS/CSS define placement math; stale cache made guides look "wrong" while app.js was fresh.
      if (filePath.endsWith(".js") || filePath.endsWith(".css")) {
        res.setHeader("Cache-Control", "no-store, max-age=0");
      }
    },
  })
);

app.get("/default-display.png", (_req, res) => {
  if (!fs.existsSync(DEFAULT_DISPLAY_PATH)) {
    return res.status(404).send("Default display asset missing on server.");
  }
  res.type("image/png");
  res.sendFile(DEFAULT_DISPLAY_PATH);
});

app.get("/api/colors", (_req, res) => {
  res.json({
    colors: DISPLAY_COLORS.map((c) => ({
      id: c.id,
      label: c.label,
      url: `/colors/${encodeURIComponent(c.file)}`,
    })),
  });
});

app.post(
  "/api/brand",
  upload.fields([
    { name: "display", maxCount: 1 },
    { name: "logos", maxCount: 14 },
  ]),
  async (req, res) => {
    if (!GEMINI_API_KEY) {
      return res.status(500).json({
        error:
          "Server missing GEMINI_API_KEY. Copy .env.example to .env and add your key.",
      });
    }

    const displayFile = req.files?.display?.[0];
    const displayColorId = String(req.body?.displayColor || "").trim();

    let displayBuffer;
    let displayMime;
    try {
      const resolved = resolveDisplayBuffer({ displayFile, displayColorId });
      displayBuffer = resolved.buffer;
      displayMime = resolved.mime;
    } catch (e) {
      if (e.code === "COLOR_MISSING") {
        return res.status(500).json({
          error: "Color display asset missing on server.",
          detail: String(e.message),
        });
      }
      if (e.code === "DEFAULT_MISSING") {
        return res.status(500).json({
          error: "Default display file missing on server.",
          detail: "smoke shop in a box display.png",
        });
      }
      throw e;
    }

    if (displayFile?.buffer && !ALLOWED_MIME.has(displayMime)) {
      return res.status(400).json({
        error: `Unsupported display type: ${displayFile.mimetype}. Use PNG, JPEG, or WebP.`,
      });
    }

    const logoFiles = req.files?.logos || [];
    for (const f of logoFiles) {
      const m = normalizeMime(f.mimetype);
      if (!ALLOWED_MIME.has(m)) {
        return res.status(400).json({
          error: `Unsupported logo type: ${f.mimetype}`,
        });
      }
    }

    const model = (req.body?.model || DEFAULT_MODEL).trim();
    const userPrompt = req.body?.prompt || "";

    const colorEntry = displayFile?.buffer
      ? null
      : getColorById(String(req.body?.displayColor || "").trim());

    const promptText = buildPrompt(userPrompt, {
      hasLogos: logoFiles.length > 0,
      colorLabel: colorEntry?.label,
    });

    const dims = probeImageDimensions(displayBuffer, displayMime);
    const aspectRatio = dims
      ? nearestAspectRatioName(dims.width, dims.height)
      : "4:3";

    const parts = [
      { text: promptText },
      {
        inline_data: {
          mime_type: displayMime,
          data: displayBuffer.toString("base64"),
        },
      },
    ];

    for (const f of logoFiles) {
      parts.push({
        inline_data: {
          mime_type: normalizeMime(f.mimetype),
          data: f.buffer.toString("base64"),
        },
      });
    }

    const url = `${GEMINI_BASE}/${encodeURIComponent(model)}:generateContent`;

    const body = {
      contents: [
        {
          role: "user",
          parts,
        },
      ],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: {
          aspectRatio,
          imageSize: GEMINI_IMAGE_SIZE,
        },
      },
    };

    let apiRes;
    try {
      apiRes = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY,
        },
        body: JSON.stringify(body),
      });
    } catch (e) {
      return res.status(502).json({
        error: "Gemini request failed",
        detail: String(e?.message || e),
      });
    }

    const data = await apiRes.json().catch(() => ({}));

    if (!apiRes.ok) {
      const msg =
        data?.error?.message ||
        data?.error?.status ||
        `HTTP ${apiRes.status}`;
      const hint = quotaHelpHint(msg);
      const body = {
        error: "Gemini API error",
        detail: msg,
      };
      if (hint) body.hint = hint;
      return res.status(apiRes.status >= 400 && apiRes.status < 600 ? apiRes.status : 502).json(body);
    }

    const block = data.promptFeedback?.blockReason;
    if (block) {
      return res.status(400).json({
        error: "Prompt blocked",
        detail: block,
      });
    }

    const img = extractImageFromResponse(data);
    if (!img) {
      const textParts =
        data.candidates?.[0]?.content?.parts
          ?.filter((p) => p.text)
          .map((p) => p.text)
          .join("\n") || "";
      return res.status(422).json({
        error: "No image in model response (quota, safety, or model may not support image output).",
        detail: textParts.slice(0, 2000),
      });
    }

    const buf = Buffer.from(img.data, "base64");
    res.type(img.mimeType);
    return res.send(buf);
  }
);

app.post(
  "/api/ocr",
  upload.fields([{ name: "display", maxCount: 1 }]),
  async (req, res) => {
    try {
      const displayFile = req.files?.display?.[0];
      const displayColorId = String(req.body?.displayColor || "").trim();
      let displayBuffer;
      let displayMime;
      try {
        const resolved = resolveDisplayBuffer({ displayFile, displayColorId });
        displayBuffer = resolved.buffer;
        displayMime = resolved.mime;
      } catch (e) {
        if (e.code === "COLOR_MISSING") {
          return res.status(500).json({
            error: "Color display asset missing on server.",
            detail: String(e.message),
          });
        }
        if (e.code === "DEFAULT_MISSING") {
          return res.status(500).json({
            error: "Default display file missing on server.",
          });
        }
        throw e;
      }
      if (displayFile?.buffer && !ALLOWED_MIME.has(displayMime)) {
        return res.status(400).json({
          error: `Unsupported display type: ${displayFile.mimetype}`,
        });
      }
      const dims = probeImageDimensions(displayBuffer, displayMime);
      if (!dims) {
        return res.status(400).json({
          error: "Could not read image dimensions (use PNG or JPEG).",
        });
      }
      const page = await recognizeBuffer(displayBuffer);
      const words = serializeWords(page).filter(
        (w) => w.text.length > 0 && w.width > 0 && w.height > 0
      );
      res.json({
        ok: true,
        imageWidth: dims.width,
        imageHeight: dims.height,
        words,
        text: String(page?.text || "").slice(0, 4000),
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({
        error: "OCR failed",
        detail: String(e?.message || e),
      });
    }
  }
);

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    hasKey: Boolean(GEMINI_API_KEY),
    model: DEFAULT_MODEL,
    imageSize: GEMINI_IMAGE_SIZE,
  });
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  if (!fs.existsSync(DEFAULT_DISPLAY_PATH)) {
    console.warn(
      "Warning: default display not found:",
      DEFAULT_DISPLAY_PATH
    );
  }
  console.log(`http://localhost:${port}`);
});
