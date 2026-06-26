/** Avança `hours` horas úteis (seg–sex) a partir de `from`. */
export function addBusinessHours(from: Date, hours: number): Date {
  const result = new Date(from);
  let remaining = hours;

  while (remaining > 0) {
    result.setHours(result.getHours() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) {
      remaining -= 1;
    }
  }

  return result;
}

export function isPastDeadline(deadlineIso: string | undefined): boolean {
  if (!deadlineIso) return false;
  return Date.now() >= new Date(deadlineIso).getTime();
}

export function hoursRemaining(deadlineIso: string | undefined): number {
  if (!deadlineIso) return 0;
  return Math.max(0, new Date(deadlineIso).getTime() - Date.now());
}
