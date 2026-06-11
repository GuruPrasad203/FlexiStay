/**
 * SMS worker — processes jobs from the sms-queue via Twilio.
 *
 * Primary use cases for FlexiStay:
 *   - OTP codes for check-in / check-out
 *   - Booking confirmation SMS
 *   - Overstay alerts
 */
import { Worker, Job } from "bullmq";
import twilio from "twilio";
import { redisConnection, type SmsJobData } from "../queues";

const accountSid = process.env["TWILIO_ACCOUNT_SID"];
const authToken = process.env["TWILIO_AUTH_TOKEN"];
const fromNumber = process.env["TWILIO_PHONE_NUMBER"];

if (!accountSid || !authToken || !fromNumber) {
  throw new Error("Twilio credentials (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER) are not set");
}

const twilioClient = twilio(accountSid, authToken);

export const smsWorker = new Worker<SmsJobData>(
  "sms-queue",
  async (job: Job<SmsJobData>) => {
    const { to, message } = job.data;

    await twilioClient.messages.create({
      body: message,
      from: fromNumber,
      to,
    });

    console.log(`[sms] Sent to ${to} (job ${job.id})`);
  },
  {
    connection: redisConnection,
    concurrency: 10,
  }
);

smsWorker.on("failed", (job, err) => {
  console.error(`[sms] Job ${job?.id} failed:`, err.message);
});
