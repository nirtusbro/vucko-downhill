/** A finish-only bonus. Each saved second under 90 seconds is worth 50 points. */
export function finishTimeBonus(seconds: number) {
  return Math.max(0, Math.round((90 - Math.max(0, seconds)) * 50));
}
