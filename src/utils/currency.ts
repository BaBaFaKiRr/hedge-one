/** Format amounts as Indian Rupees for display */
export function formatInr(value: number | null | undefined, fractionDigits = 2): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  const sign = Number(value) < 0 ? '-' : '';
  const abs = Math.abs(Number(value));
  return `${sign}₹${abs.toFixed(fractionDigits)}`;
}
