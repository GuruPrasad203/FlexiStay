import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type {
  BookingSlot,
  GuestDetails,
  PaymentMethod,
  PriceBreakdown,
  Hotel,
} from "@/types";

// ─────────────────────────────────────────────
// STATE SHAPE
// ─────────────────────────────────────────────

interface BookingState {
  // Step 1 — user picks a hotel and time slot
  selectedHotel: Hotel | null;
  slot: BookingSlot | null;

  // Step 2 — user fills in their details
  guestDetails: GuestDetails | null;

  // Step 3 — user picks Pay Now or Reserve Now
  paymentMethod: PaymentMethod | null;

  // Computed price shown at checkout
  priceBreakdown: PriceBreakdown | null;

  // Current step in the booking funnel (1–4)
  currentStep: number;

  // True while a booking API call is in flight
  isSubmitting: boolean;

  // Holds the confirmed booking ID after success
  confirmedBookingId: string | null;
}

// ─────────────────────────────────────────────
// ACTIONS
// ─────────────────────────────────────────────

interface BookingActions {
  setSelectedHotel: (hotel: Hotel) => void;
  setSlot: (slot: BookingSlot) => void;
  setGuestDetails: (details: GuestDetails) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setPriceBreakdown: (price: PriceBreakdown) => void;
  setCurrentStep: (step: number) => void;
  setIsSubmitting: (value: boolean) => void;
  setConfirmedBookingId: (id: string) => void;

  // Wipe everything — called after booking completes or user cancels
  resetBooking: () => void;
}

// ─────────────────────────────────────────────
// INITIAL STATE
// ─────────────────────────────────────────────

const initialState: BookingState = {
  selectedHotel: null,
  slot: null,
  guestDetails: null,
  paymentMethod: null,
  priceBreakdown: null,
  currentStep: 1,
  isSubmitting: false,
  confirmedBookingId: null,
};

// ─────────────────────────────────────────────
// STORE
// ─────────────────────────────────────────────

/**
 * Global booking store using Zustand.
 *
 * Holds the in-progress booking state as the user moves through:
 *   Search → Hotel Detail → Room Selection → Guest Details → Payment → Confirmation
 *
 * devtools() enables the Redux DevTools browser extension for debugging.
 *
 * Usage in a component:
 *   const { slot, setSlot } = useBookingStore()
 */
export const useBookingStore = create<BookingState & BookingActions>()(
  devtools(
    (set) => ({
      ...initialState,

      setSelectedHotel: (hotel) =>
        set({ selectedHotel: hotel }, false, "booking/setSelectedHotel"),

      setSlot: (slot) =>
        set({ slot }, false, "booking/setSlot"),

      setGuestDetails: (details) =>
        set({ guestDetails: details }, false, "booking/setGuestDetails"),

      setPaymentMethod: (method) =>
        set({ paymentMethod: method }, false, "booking/setPaymentMethod"),

      setPriceBreakdown: (price) =>
        set({ priceBreakdown: price }, false, "booking/setPriceBreakdown"),

      setCurrentStep: (step) =>
        set({ currentStep: step }, false, "booking/setCurrentStep"),

      setIsSubmitting: (value) =>
        set({ isSubmitting: value }, false, "booking/setIsSubmitting"),

      setConfirmedBookingId: (id) =>
        set({ confirmedBookingId: id }, false, "booking/setConfirmedBookingId"),

      resetBooking: () =>
        set(initialState, false, "booking/reset"),
    }),
    { name: "FlexiStay/BookingStore" }
  )
);

// ─────────────────────────────────────────────
// SELECTORS
// Derive computed values from state — keeps components clean
// ─────────────────────────────────────────────

/**
 * Returns true if the user has completed enough steps to proceed to payment.
 * Used to guard the payment step.
 */
export const selectIsReadyForPayment = (state: BookingState) =>
  state.selectedHotel !== null &&
  state.slot !== null &&
  state.guestDetails !== null;

/**
 * Returns the cancellation policy based on hours until check-in.
 * Mirrors the backend cancellation engine logic (Deva / P5).
 *
 *  > 24 hrs  → free
 *  2–24 hrs  → partial (50%)
 *  < 2 hrs   → no_refund
 */
export const selectCancellationPolicy = (state: BookingState) => {
  if (!state.slot) return null;

  const now = Date.now();
  const checkIn = new Date(state.slot.checkInAt).getTime();
  const hoursUntilCheckIn = (checkIn - now) / (1000 * 60 * 60);

  if (hoursUntilCheckIn > 24) return "free" as const;
  if (hoursUntilCheckIn >= 2) return "partial" as const;
  return "no_refund" as const;
};
