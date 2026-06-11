import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { CancellationPolicy, PriceBreakdown } from "@/types";

// ─────────────────────────────────────────────
// TAILWIND UTILITY
// ─────────────────────────────────────────────

/**
 * Merges Tailwind classes safely — resolves conflicts automatically.
 *
 * Usage:
 *   cn("px-4 py-2", isActive && "bg-blue-500", "px-6")
 *   → "py-2 bg-blue-500 px-6"  (px-6 wins over px-4)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─────────────────────────────────────────────
// MONEY
// ─────────────────────────────────────────────

/**
 * Convert paise to rupees string.
 * All money in the app is stored as paise (integer) to avoid float bugs.
 *
 * formatPrice(96900) → "₹969"
 * formatPrice(96900, true) → "₹969.00"
 */
export function formatPrice(paise: number, showDecimals = false): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(rupees);
}

/**
 * Calculate FlexiStay price breakdown from a base room charge.
 *
 * Rules (from project plan):
 *  - Platform fee: 3% of room charge
 *  - GST: 12% on room charge (hotel accommodation GST rate)
 *  - Reserve Now advance: 30% of total
 */
export function calculatePriceBreakdown(
  roomChargePaise: number,
  isReserveNow = false
): PriceBreakdown {
  const platformFee = Math.round(roomChargePaise * 0.03);
  const taxes = Math.round(roomChargePaise * 0.12);
  const total = roomChargePaise + platformFee + taxes;
  const advanceAmount = isReserveNow ? Math.round(total * 0.3) : undefined;

  return { roomCharge: roomChargePaise, platformFee, taxes, total, advanceAmount };
}

// ─────────────────────────────────────────────
// DATE / TIME
// ─────────────────────────────────────────────

/**
 * Format an ISO date string to readable time.
 * formatTime("2026-06-10T14:00:00+05:30") → "2:00 PM"
 */
export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).format(new Date(iso));
}

/**
 * Format an ISO date string to readable date.
 * formatDate("2026-06-10T14:00:00+05:30") → "10 Jun 2026"
 */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(iso));
}

/**
 * Get hours remaining until a given ISO datetime.
 * Used for OTP validity countdown and cancellation policy display.
 */
export function hoursUntil(iso: string): number {
  const diff = new Date(iso).getTime() - Date.now();
  return diff / (1000 * 60 * 60);
}

/**
 * Format seconds into MM:SS for the OTP countdown timer.
 * formatCountdown(3661) → "1:01:01"  (uses H:MM:SS if > 1 hour)
 */
export function formatCountdown(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ─────────────────────────────────────────────
// CANCELLATION POLICY
// ─────────────────────────────────────────────

/**
 * Derive cancellation policy from hours until check-in.
 * Mirrors the backend cancellation engine (Deva / P5).
 *
 *  > 24 hrs  → free
 *  2–24 hrs  → partial (50% retained)
 *  < 2 hrs   → no_refund
 */
export function getCancellationPolicy(checkInIso: string): CancellationPolicy {
  const hours = hoursUntil(checkInIso);
  if (hours > 24) return "free";
  if (hours >= 2) return "partial";
  return "no_refund";
}

/**
 * Calculate refund amount in paise based on cancellation policy.
 */
export function getRefundAmount(
  totalPaise: number,
  policy: CancellationPolicy
): number {
  if (policy === "free") return totalPaise;
  if (policy === "partial") return Math.round(totalPaise * 0.5);
  return 0;
}

// ─────────────────────────────────────────────
// VALIDATION HELPERS
// ─────────────────────────────────────────────

/**
 * Validate an Indian phone number (10 digits, starts with 6–9).
 */
export function isValidIndianPhone(phone: string): boolean {
  return /^[6-9]\d{9}$/.test(phone.replace(/\s+/g, ""));
}

/**
 * Convert a local 10-digit phone to E.164 format.
 * toE164("9876543210") → "+919876543210"
 */
export function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("91") ? `+${digits}` : `+91${digits}`;
}
