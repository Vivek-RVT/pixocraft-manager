import { format } from "date-fns";

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr: string | Date): string {
  if (!dateStr) return "";
  try {
    return format(new Date(dateStr), "dd MMM yyyy");
  } catch (e) {
    return String(dateStr);
  }
}
