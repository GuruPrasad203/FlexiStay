/**
 * Worker entry point.
 *
 * Run this separately from the HTTP server:
 *   npm run worker
 *
 * Why separate?
 *   - The HTTP server handles incoming requests quickly.
 *   - Workers do the slow work (calling SendGrid, Twilio, Firebase).
 *   - If a worker crashes, the HTTP server keeps accepting jobs.
 *   - Jobs in Redis survive a worker restart — nothing is lost.
 */

// Importing the worker files is enough — their constructors register
// themselves with BullMQ and start listening immediately.
import "./workers/email.worker";
import "./workers/sms.worker";
import "./workers/push.worker";

console.log("Notification workers started — listening for jobs...");

// Keep the process alive
process.on("SIGTERM", () => {
  console.log("Worker shutting down gracefully...");
  process.exit(0);
});
