// path: apps/web/src/shared/domain/time/fiscalCalendar.ts

export function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function parseIsoDate(value: string): Date {
  return new Date(`${value}T00:00:00Z`);
}

export function addDays(value: Date, days: number): Date {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function addMonths(value: Date, months: number): Date {
  const next = new Date(value);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

export function fiscalMonthStart(value: Date): Date {
  const year = value.getUTCFullYear();
  const month = value.getUTCMonth();
  const day = value.getUTCDate();

  if (day >= 22) {
    return new Date(Date.UTC(year, month, 22));
  }

  return new Date(Date.UTC(year, month - 1, 22));
}

export function fiscalMonthEnd(value: Date): Date {
  return addDays(addMonths(fiscalMonthStart(value), 1), -1);
}

export function isFirstWeekOfFiscalMonth(value: Date): boolean {
  const start = fiscalMonthStart(value);
  const diffMs = value.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  return diffDays <= 6;
}