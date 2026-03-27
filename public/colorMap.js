/** Browser-side: maps UI color id → URL under /colors/ (kept in sync with lib/colors.js). */
const FILES = {
  brown: "brown.jpg",
  darkBlue: "darkblue.jpg",
  green: "greenbox.jpg",
  gray: "greybox.jpg",
  orange: "orangebox.jpg",
  pink: "pink.jpg",
  red: "red.jpg",
  teal: "tealbox.jpg",
  yellow: "yellowbox.jpg",
};

/**
 * @param {string | null | undefined} id
 * @returns {string | null} full URL path, or null to use original PNG default
 */
export function displayImageUrlForColorId(id) {
  if (!id || id === "original") return null;
  const f = FILES[id];
  return f ? `/colors/${f}` : null;
}
