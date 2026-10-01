import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatINR(value: number | string): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatIndianCurrencyWords(amount: number): string {
  if (!amount || isNaN(amount) || amount <= 0) return "";
  if (amount >= 10000000) {
    const cr = amount / 10000000;
    return `₹${cr.toFixed(cr % 1 === 0 ? 0 : 2)} Crore${cr > 1 ? "s" : ""}`;
  }
  if (amount >= 100000) {
    const lakh = amount / 100000;
    return `₹${lakh.toFixed(lakh % 1 === 0 ? 0 : 2)} Lakh${lakh > 1 ? "s" : ""}`;
  }
  if (amount >= 1000) {
    const k = amount / 1000;
    return `₹${k.toFixed(k % 1 === 0 ? 0 : 1)} Thousand`;
  }
  return `₹${amount.toLocaleString("en-IN")}`;
}
