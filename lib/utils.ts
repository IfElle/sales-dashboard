import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function deduplicateExcelRows(rows: any[]) {
  const seen = new Set();
  return rows.filter(row => {
    const key = JSON.stringify(row);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function groupByField(
  data: Record<string, any>[],
  groupKey: string,
  sumKey: string = "",
  count: boolean = false
) {
  const result = data.reduce((acc, item) => {
    const key = item[groupKey] ?? "Unknown";
    const value = count ? 1 : Number(item[sumKey]) || 0;

    acc[key] = (acc[key] || 0) + value;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(result).map(([key, value]) => ({
    key,
    value,
  }));
}

export function sumField<T>(items: T[], field: keyof T): number {
  return items.reduce((total, item) => {
    const value = item[field];
    const number = typeof value === "number" ? value : parseFloat(String(value));
    return total + (isNaN(number) ? 0 : number);
  }, 0);
}