/**
 * Format any numeric value or decimal string to integer with space separators
 * e.g. 5000000.00 -> "5 000 000", 100.00 -> "100", 100000 -> "100 000"
 */
export const formatUZS = (val) => {
  if (val === null || val === undefined || val === '') return '0';
  const num = Math.round(Number(val));
  return isNaN(num) ? '0' : num.toLocaleString('ru-RU');
};

/**
 * Parses user input string (with spaces or other chars) into a clean integer.
 * e.g. "100 000" -> 100000, "2 500 000" -> 2500000, "" -> 0
 */
export const parseRawNumber = (str) => {
  const digits = String(str || '').replace(/\D/g, '');
  return digits ? parseInt(digits, 10) : 0;
};

/**
 * Formats user input as they type, preserving pure digits formatted with spaces.
 * e.g. typing "100000" becomes "100 000"
 */
export const formatInputAmount = (val) => {
  const digits = String(val || '').replace(/\D/g, '');
  if (!digits) return '';
  return parseInt(digits, 10).toLocaleString('ru-RU');
};
