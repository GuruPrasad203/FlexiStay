// ─────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "checked_in"
  | "checked_out"
  | "cancelled"
  | "no_show";

export type PaymentMethod = "pay_now" | "reserve_now";

export type PaymentStatus =
  | "pending"
  | "authorized"
  | "captured"
  | "refunded"
  | "partially_refunded"
  | "failed";

export type CancellationPolicy =
  | "free"       // > 24 hrs before check-in → full refund
  | "partial"    // 2–24 hrs before check-in → 50% refund
  | "no_refund"; // < 2 hrs or no-show → 0% refund

export type HotelTier = "standard" | "comfort" | "premium";

export type UserRole =
  | "guest"
  | "member"
  | "host"
  | "admin"
  | "super_admin"
  | "auditor";

// ─────────────────────────────────────────────
// HOTEL
// ─────────────────────────────────────────────

export interface HotelAmenity {
  id: string;
  name: string;
  icon: string;
}

export interface RoomType {
  id: string;
  name: string;
  description: string;
  maxGuests: number;
  amenities: HotelAmenity[];
  images: string[];
}

export interface Hotel {
  id: string;
  name: string;
  slug: string;
  description: string;
  address: string;
  area: string;          // e.g. "Sholinganallur", "T Nagar"
  city: string;
  latitude: number;
  longitude: number;
  tier: HotelTier;
  pricePerHour: number;  // in paise (₹ × 100) — avoids float errors
  minDuration: number;   // hours (min 1)
  maxDuration: number;   // hours (max 12)
  images: string[];
  amenities: HotelAmenity[];
  rooms: RoomType[];
  rating: number;
  reviewCount: number;
  isActive: boolean;
}

// ─────────────────────────────────────────────
// BOOKING
// ─────────────────────────────────────────────

export interface BookingSlot {
  hotelId: string;
  roomTypeId: string;
  checkInAt: string;   // ISO 8601 — e.g. "2026-06-10T14:00:00+05:30"
  checkOutAt: string;  // ISO 8601
  durationHours: number;
}

export interface GuestDetails {
  fullName: string;
  phone: string;       // E.164 format — e.g. "+919876543210"
  email: string;
}

export interface PriceBreakdown {
  roomCharge: number;      // paise
  platformFee: number;     // paise (3% of roomCharge)
  taxes: number;           // paise (GST)
  total: number;           // paise
  advanceAmount?: number;  // paise — only for reserve_now (30%)
}

export interface Booking {
  id: string;
  guestId: string;
  hotel: Hotel;
  slot: BookingSlot;
  guest: GuestDetails;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  bookingStatus: BookingStatus;
  price: PriceBreakdown;
  checkInOtp?: string;
  checkOutOtp?: string;
  cancellationPolicy: CancellationPolicy;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────
// AUTH / USER
// ─────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  role: UserRole;
  isVerified: boolean;
  createdAt: string;
}

// ─────────────────────────────────────────────
// SEARCH
// ─────────────────────────────────────────────

export interface SearchFilters {
  area?: string;
  checkInAt?: string;    // ISO 8601
  durationHours?: number;
  minPrice?: number;     // paise
  maxPrice?: number;     // paise
  amenities?: string[];
  tier?: HotelTier[];
}

export interface SearchResult {
  hotels: Hotel[];
  total: number;
  page: number;
  perPage: number;
}

// ─────────────────────────────────────────────
// API RESPONSES
// ─────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}
