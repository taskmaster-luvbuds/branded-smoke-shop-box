/**
 * Prompt tuned to reduce hallucinated text / logo glitches vs barebones edits.
 * @param {string} [userPrompt]
 * @param {{ hasLogos?: boolean, colorLabel?: string }} [opts]
 * @returns {string}
 */
export function buildPrompt(userPrompt, opts = {}) {
  const extra = (userPrompt || "").trim();
  const hasLogos = opts.hasLogos !== false;
  const colorLabel = (opts.colorLabel || "").trim();

  const base = hasLogos
    ? [
        "You are a senior retail/POS mockup artist.",
        "Image order: (1) Full photograph of the cardboard floor display. (2+) Official logo assets — these are the ONLY source of truth for brand marks, spelling, colors, and letterforms.",
        "Goal: output ONE high-quality marketing image in the style of a professional product mockup (like a hero banner next to the unit): crisp print, believable lighting, coherent cardboard structure.",
        colorLabel
          ? `This display variant uses a ${colorLabel} color theme on the two horizontal shelf-band strips (middle area) and related accents — keep those bands reading as intentional brand color; harmonize the logo with that palette.`
          : "Honor the existing shelf-band colors and print style on the display.",
        "Integrate the logo(s) into header panels, top brand areas, and the colored shelf bands where appropriate. Match perspective, lighting, and print sharpness; do not float graphics in empty air.",
        "STRICT: Preserve all existing on-display text, illustrations, and layout unless you are deliberately replacing a specific panel with the uploaded logo artwork.",
        "Do NOT invent, paraphrase, or misspell any words. Do NOT output garbled letters, stray fragments, duplicated characters, or checkerboard transparency.",
        "Reproduce uploaded logo artwork faithfully (no improvised typography for the brand name).",
        "Keep shelf tiers, cutouts, and overall product geometry consistent with the first image.",
      ]
    : [
        "You are editing a product display photograph for retail branding.",
        "Apply only the changes described by the user. Preserve existing text and structure unless explicitly asked to change them.",
        "Output a single edited photo with no hallucinated text and no artifacts.",
      ];

  const joined = base.join(" ");
  return extra ? `${joined} User direction: ${extra}` : joined;
}
