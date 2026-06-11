/**
 * Email worker — processes jobs from the email-queue.
 *
 * How BullMQ workers work:
 *   Worker("queue-name", handlerFn, { connection }) registers a function
 *   that BullMQ calls for each job. If the function throws, BullMQ retries
 *   up to the configured `attempts` count with exponential backoff.
 */
import { Worker, Job } from "bullmq";
import sgMail from "@sendgrid/mail";
import { redisConnection, type EmailJobData } from "../queues";

// Initialise SendGrid with the API key once at startup
const apiKey = process.env["SENDGRID_API_KEY"];
if (!apiKey) throw new Error("SENDGRID_API_KEY is not set");
sgMail.setApiKey(apiKey);

const FROM_EMAIL = process.env["EMAIL_FROM"] ?? "noreply@flexistay.in";
const FROM_NAME = process.env["EMAIL_FROM_NAME"] ?? "FlexiStay";

// ── Email templates ────────────────────────────────────────────
// In production, use SendGrid Dynamic Templates (create them in the
// SendGrid dashboard, then pass templateId + dynamic_template_data).
// For now, we build simple HTML inline.

function buildEmailHtml(data: EmailJobData): string {
  const { templateId, variables, toName } = data;

  switch (templateId) {
    case "booking_confirmed":
      return `
        <h2>Booking Confirmed! 🎉</h2>
        <p>Hi ${toName},</p>
        <p>Your room at <strong>${variables["hotelName"]}</strong> is booked.</p>
        <ul>
          <li>Check-in: ${variables["checkIn"]}</li>
          <li>Check-out: ${variables["checkOut"]}</li>
          <li>Booking ID: ${variables["bookingId"]}</li>
          <li>Total: ₹${variables["totalAmount"]}</li>
        </ul>
        <p>Your OTP for check-in: <strong>${variables["otpCode"]}</strong></p>
        <p>Show this to the hotel staff at arrival.</p>
      `;

    case "booking_cancelled":
      return `
        <h2>Booking Cancelled</h2>
        <p>Hi ${toName},</p>
        <p>Your booking <strong>${variables["bookingId"]}</strong> has been cancelled.</p>
        <p>Refund of ₹${variables["refundAmount"]} will be credited in 3-5 business days.</p>
      `;

    case "otp":
      return `
        <h2>Your FlexiStay OTP</h2>
        <p>Hi ${toName},</p>
        <p>Your one-time password is: <strong style="font-size:24px">${variables["otpCode"]}</strong></p>
        <p>Valid for 10 minutes. Do not share this with anyone.</p>
      `;

    case "welcome":
      return `
        <h2>Welcome to FlexiStay! 🏨</h2>
        <p>Hi ${toName},</p>
        <p>Your account has been created. Start booking hourly stays across India.</p>
      `;

    default:
      return `<p>Notification from FlexiStay</p>`;
  }
}

// ── Worker ─────────────────────────────────────────────────────
export const emailWorker = new Worker<EmailJobData>(
  "email-queue",
  async (job: Job<EmailJobData>) => {
    const { to, toName, subject, templateId, variables } = job.data;

    const html = buildEmailHtml({ to, toName, subject, templateId, variables });

    await sgMail.send({
      to: { email: to, name: toName },
      from: { email: FROM_EMAIL, name: FROM_NAME },
      subject,
      html,
    });

    console.log(`[email] Sent "${templateId}" to ${to} (job ${job.id})`);
  },
  {
    connection: redisConnection,
    concurrency: 5, // process up to 5 emails simultaneously
  }
);

emailWorker.on("failed", (job, err) => {
  console.error(`[email] Job ${job?.id} failed:`, err.message);
});
