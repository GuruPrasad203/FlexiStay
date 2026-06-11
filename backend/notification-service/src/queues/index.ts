/**
 * BullMQ queue definitions.
 *
 * What is BullMQ?
 *   A job queue backed by Redis. Instead of sending an email directly in the
 *   booking API (which would slow down the response), the API adds a job to
 *   the queue and returns immediately. This service picks up jobs in the
 *   background and sends the actual notifications.
 *
 *   Think of it like a "to-do list" in Redis:
 *     Booking API → adds "send confirmation email" to the list
 *     This worker  → reads from the list, calls SendGrid, marks done
 *
 * Three queues:
 *   email-queue  → SendGrid (transactional email)
 *   sms-queue    → Twilio (OTP SMS, booking confirmations)
 *   push-queue   → Firebase Cloud Messaging (app push notifications)
 */
import { Queue } from "bullmq";
import IORedis from "ioredis";

// ── Redis connection ──────────────────────────────────────────
// BullMQ needs a Redis connection to store jobs.
// "maxRetriesPerRequest: null" is required by BullMQ (it manages retries itself).
export const redisConnection = new IORedis(
  process.env["REDIS_URL"] ?? "redis://localhost:6379",
  { maxRetriesPerRequest: null }
);

// ── Job payload types ─────────────────────────────────────────
// TypeScript interfaces that describe what data each job carries.

export interface EmailJobData {
  to: string;
  toName: string;
  subject: string;
  templateId: "booking_confirmed" | "booking_cancelled" | "otp" | "welcome";
  variables: Record<string, string | number>;
}

export interface SmsJobData {
  to: string;          // E.164 format: +919876543210
  message: string;
}

export interface PushJobData {
  fcmToken: string;    // device token from Firebase SDK
  title: string;
  body: string;
  data?: Record<string, string>; // extra payload (e.g. bookingId for deep linking)
}

// ── Queue instances ────────────────────────────────────────────
// One Queue per channel. The queue just adds jobs — workers process them.
export const emailQueue = new Queue<EmailJobData>("email-queue", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,        // retry up to 3 times if SendGrid fails
    backoff: {
      type: "exponential",
      delay: 2000,      // wait 2s, then 4s, then 8s between retries
    },
    removeOnComplete: 100, // keep last 100 completed jobs for debugging
    removeOnFail: 200,
  },
});

export const smsQueue = new Queue<SmsJobData>("sms-queue", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});

export const pushQueue = new Queue<PushJobData>("push-queue", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 2,        // push is best-effort — fewer retries
    backoff: { type: "fixed", delay: 1000 },
    removeOnComplete: 50,
    removeOnFail: 100,
  },
});
