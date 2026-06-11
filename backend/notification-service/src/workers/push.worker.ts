/**
 * Push notification worker — Firebase Cloud Messaging (FCM).
 *
 * FCM sends push notifications to the FlexiStay mobile app.
 * The mobile app registers a device token with FCM and sends it
 * to our backend when the user logs in. We store that token and
 * use it here to push alerts.
 */
import { Worker, Job } from "bullmq";
import admin from "firebase-admin";
import { redisConnection, type PushJobData } from "../queues";

// Initialise Firebase Admin SDK once at startup
const serviceAccountPath = process.env["FIREBASE_SERVICE_ACCOUNT_PATH"];
if (!serviceAccountPath) {
  throw new Error("FIREBASE_SERVICE_ACCOUNT_PATH is not set");
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const serviceAccount = require(serviceAccountPath) as admin.ServiceAccount;

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export const pushWorker = new Worker<PushJobData>(
  "push-queue",
  async (job: Job<PushJobData>) => {
    const { fcmToken, title, body, data } = job.data;

    await admin.messaging().send({
      token: fcmToken,
      notification: { title, body },
      // "data" is extra key-value pairs sent to the app (e.g. for deep linking)
      ...(data && { data }),
      android: {
        priority: "high",
        notification: { sound: "default" },
      },
      apns: {
        payload: {
          aps: { sound: "default" },
        },
      },
    });

    console.log(`[push] Sent "${title}" to token ...${fcmToken.slice(-8)} (job ${job.id})`);
  },
  {
    connection: redisConnection,
    concurrency: 20, // push is fast — higher concurrency is fine
  }
);

pushWorker.on("failed", (job, err) => {
  console.error(`[push] Job ${job?.id} failed:`, err.message);
});
