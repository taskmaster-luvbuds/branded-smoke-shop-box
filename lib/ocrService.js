import { createWorker } from "tesseract.js";

let workerPromise = null;
/** Serialize concurrent recognize calls — one worker, one job at a time */
let chain = Promise.resolve();

function getWorker() {
  if (!workerPromise) workerPromise = createWorker("eng");
  return workerPromise;
}

/**
 * @param {Buffer} buffer
 * @returns {Promise<import("tesseract.js").Page>}
 */
export function recognizeBuffer(buffer) {
  const run = async () => {
    const worker = await getWorker();
    const r = await worker.recognize(buffer);
    return r.data;
  };
  const p = chain.then(run, run);
  chain = p.then(
    () => {},
    () => {}
  );
  return p;
}

/**
 * @param {import("tesseract.js").Page} data
 */
export function serializeWords(data) {
  const words = data.words || [];
  return words.map((w) => {
    const b = w.bbox || { x0: 0, y0: 0, x1: 0, y1: 0 };
    return {
      text: String(w.text || "").trim(),
      left: b.x0,
      top: b.y0,
      width: b.x1 - b.x0,
      height: b.y1 - b.y0,
      confidence: typeof w.confidence === "number" ? w.confidence : 0,
    };
  });
}
