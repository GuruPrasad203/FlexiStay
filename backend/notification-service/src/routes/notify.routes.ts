/**
 * Internal notification API.
 *
 * These routes are called by other backend services (auth, hotel, booking).
 * They are NOT exposed to the public — the server requires x-internal-key header.
 *
 * All routes just enqueue a job and return immediately.
 * The actual sending happens in the workers asynchronously.
 */
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { emailQueue, smsQueue, pushQueue } from "../queues";

// ── Validation schemas ─────────────────────────────────────────

const sendEmailSchema = z.object({
  to: z.string().email(),
  toName: z.string(),
  subject: z.string().min(1),
  templateId: z.enum(["booking_confirmed", "booking_cancelled", "otp", "welcome"]),
  variables: z.record(z.union([z.string(), z.number()])),
});

const sendSmsSchema = z.object({
  to: z.string().regex(/^\+[1-9]\d{7,14}$/, "Must be E.164 format: +919876543210"),
  message: z.string().min(1).max(160),
});

const sendPushSchema = z.object({
  fcmToken: z.string().min(1),
  title: z.string().min(1),
  body: z.string().min(1),
  data: z.record(z.string()).optional(),
});

// ── Convenience: booking confirmed (all three channels at once) ─
const bookingConfirmedSchema = z.object({
  // Guest details
  email: z.string().email(),
  name: z.string(),
  phone: z.string(),
  fcmToken: z.string().optional(), // not all users have the app

  // Booking details
  bookingId: z.string(),
  hotelName: z.string(),
  checkIn: z.string(),
  checkOut: z.string(),
  totalAmount: z.number(), // in paise — we'll format it
  otpCode: z.string(),
});

export async function notifyRoutes(app: FastifyInstance) {
  // ── POST /notify/email ───────────────────────────────────────
  app.post(
    "/email",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const result = sendEmailSchema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({ error: "Validation failed", details: result.error.flatten().fieldErrors });
      }

      const job = await emailQueue.add("send-email", result.data);
      return reply.status(202).send({ queued: true, jobId: job.id });
    }
  );

  // ── POST /notify/sms ─────────────────────────────────────────
  app.post(
    "/sms",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const result = sendSmsSchema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({ error: "Validation failed", details: result.error.flatten().fieldErrors });
      }

      const job = await smsQueue.add("send-sms", result.data);
      return reply.status(202).send({ queued: true, jobId: job.id });
    }
  );

  // ── POST /notify/push ────────────────────────────────────────
  app.post(
    "/push",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const result = sendPushSchema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({ error: "Validation failed", details: result.error.flatten().fieldErrors });
      }

      const job = await pushQueue.add("send-push", result.data);
      return reply.status(202).send({ queued: true, jobId: job.id });
    }
  );

  // ── POST /notify/booking-confirmed ───────────────────────────
  // Convenience endpoint: sends email + SMS + push in one call.
  // The booking service calls this after a successful payment.
  app.post(
    "/booking-confirmed",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const result = bookingConfirmedSchema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({ error: "Validation failed", details: result.error.flatten().fieldErrors });
      }

      const {
        email, name, phone, fcmToken,
        bookingId, hotelName, checkIn, checkOut, totalAmount, otpCode,
      } = result.data;

      // Format amount: paise → rupees (e.g. 50000 → "500")
      const totalRupees = (totalAmount / 100).toFixed(0);

      const variables = { bookingId, hotelName, checkIn, checkOut, totalAmount: totalRupees, otpCode };

      // Enqueue all three in parallel (Promise.all waits for all queues to accept)
      const [emailJob, smsJob, pushJob] = await Promise.all([
        emailQueue.add("booking-confirmed-email", {
          to: email,
          toName: name,
          subject: `Booking Confirmed — ${hotelName}`,
          templateId: "booking_confirmed" as const,
          variables,
        }),
        smsQueue.add("booking-confirmed-sms", {
          to: phone,
          message: `FlexiStay: Booking confirmed at ${hotelName}. Check-in OTP: ${otpCode}. ID: ${bookingId}`,
        }),
        // Push is optional — only if the user has the mobile app installed
        fcmToken
          ? pushQueue.add("booking-confirmed-push", {
              fcmToken,
              title: "Booking Confirmed! 🎉",
              body: `Your room at ${hotelName} is ready. OTP: ${otpCode}`,
              data: { bookingId, screen: "booking-detail" },
            })
          : Promise.resolve(null),
      ]);

      return reply.status(202).send({
        queued: true,
        jobs: { email: emailJob?.id, sms: smsJob?.id, push: pushJob?.id ?? null },
      });
    }
  );
}
