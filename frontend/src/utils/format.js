/**
 * Convertit un id numérique en format d'affichage court : 2 lettres + tiret + 3 chiffres (ex. AB-123).
 * Déterministe : un même id donne toujours le même code. Unique pour id 1..676000.
 */
export function toDisplayId(id) {
  const n = Math.max(1, parseInt(id, 10) || 1);
  const letterPart = Math.floor((n - 1) / 1000) % 676;
  const digitPart = (n - 1) % 1000;
  const first = Math.floor(letterPart / 26);
  const second = letterPart % 26;
  const letters = String.fromCharCode(65 + first) + String.fromCharCode(65 + second);
  const digits = String(digitPart).padStart(3, '0');
  return `${letters}-${digits}`;
}
