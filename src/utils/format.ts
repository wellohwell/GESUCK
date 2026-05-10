/**
 * Converts a string to Title Case.
 * Example: "PASAR NGIJON" -> "Pasar Ngijon"
 * Example: "TOKO MAJU JAYA 2" -> "Toko Maju Jaya 2"
 */
export function toTitleCase(text: string | null | undefined): string {
  if (!text) return '';

  return text
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
