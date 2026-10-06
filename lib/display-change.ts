export function formatSignedPercentagePoints(value: number): string {
  const magnitude = new Intl.NumberFormat("da-DK", { maximumFractionDigits: 1 }).format(Math.abs(value) * 100);
  const roundedToZero = Math.round(Math.abs(value) * 1000) === 0;
  const sign = roundedToZero ? "" : value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${magnitude} procentpoint`;
}

export function formatSignedPercentage(value: number, formattedMagnitude: string): string {
  const roundedToZero = Math.round(Math.abs(value) * 1000) === 0;
  const sign = roundedToZero ? "" : value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${formattedMagnitude}`;
}
