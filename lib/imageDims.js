/**
 * Minimal width/height probes (no native deps). PNG + JPEG only.
 * @param {Buffer} buf
 * @param {string} mime normalized mime e.g. image/png
 * @returns {{ width: number, height: number } | null}
 */
export function probeImageDimensions(buf, mime) {
  if (mime === "image/png") return pngDims(buf);
  if (mime === "image/jpeg" || mime === "image/jpg") return jpegDims(buf);
  return null;
}

function pngDims(buf) {
  if (buf.length < 24 || buf[0] !== 0x89) return null;
  if (buf.toString("ascii", 1, 4) !== "PNG") return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function jpegDims(buf) {
  let i = 0;
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) {
      i++;
      continue;
    }
    const m = buf[i + 1];
    const len = buf.readUInt16BE(i + 2);
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    i += 2 + len;
  }
  return null;
}

/** Closest Gemini imageConfig aspectRatio string for w:h */
export function nearestAspectRatioName(width, height) {
  if (!width || !height) return "4:3";
  const r = width / height;
  const opts = [
    ["1:1", 1],
    ["4:3", 4 / 3],
    ["3:4", 3 / 4],
    ["16:9", 16 / 9],
    ["9:16", 9 / 16],
    ["3:2", 3 / 2],
    ["2:3", 2 / 3],
    ["4:5", 4 / 5],
    ["5:4", 5 / 4],
  ];
  let best = opts[0];
  let bestD = Math.abs(r - best[1]);
  for (const o of opts) {
    const d = Math.abs(r - o[1]);
    if (d < bestD) {
      best = o;
      bestD = d;
    }
  }
  return best[0];
}
