import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number as CHF currency with Swiss number formatting (1'234.56)
 */
export function formatCurrency(value: string | number, currency = "CHF"): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return `${currency} 0.00`;
  const formatted = num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, "'");
  return `${currency} ${formatted}`;
}

/**
 * Format an ISO date string as dd.mm.yyyy
 */
export function formatDate(isoDate: string | null | undefined): string {
  if (!isoDate) return "–";
  const parts = isoDate.split("T")[0].split("-");
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

/**
 * Get today's date as ISO string (YYYY-MM-DD)
 */
export function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Calculate VAT amount from gross amount and rate
 */
export function calcVatAmount(amount: string, vatRate: string): string {
  const a = parseFloat(amount);
  const r = parseFloat(vatRate);
  if (isNaN(a) || isNaN(r)) return "0.00";
  // Swiss MWST is included in the gross amount
  const vatAmount = a * r / (100 + r);
  return vatAmount.toFixed(2);
}

/**
 * Month names in German
 */
export const MONTH_NAMES = [
  "Jan", "Feb", "Mär", "Apr", "Mai", "Jun",
  "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"
];
