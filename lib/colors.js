/**
 * Shelf-band color variants (JPEGs in public/colors/).
 * Filenames match assets copied from the smokeshop colors set.
 */
export const DISPLAY_COLORS = [
  { id: "brown", label: "Brown", file: "brown.jpg" },
  { id: "darkBlue", label: "Dark blue", file: "darkblue.jpg" },
  { id: "green", label: "Green", file: "greenbox.jpg" },
  { id: "gray", label: "Gray", file: "greybox.jpg" },
  { id: "orange", label: "Orange", file: "orangebox.jpg" },
  { id: "pink", label: "Pink", file: "pink.jpg" },
  { id: "red", label: "Red", file: "red.jpg" },
  { id: "teal", label: "Teal", file: "tealbox.jpg" },
  { id: "yellow", label: "Yellow", file: "yellowbox.jpg" },
];

/**
 * @param {string | undefined} id
 * @returns {(typeof DISPLAY_COLORS)[number] | null}
 */
export function getColorById(id) {
  if (!id || id === "original") return null;
  return DISPLAY_COLORS.find((c) => c.id === id) ?? null;
}
