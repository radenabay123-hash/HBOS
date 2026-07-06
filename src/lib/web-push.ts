/**
 * Web Push helper — server-side push sender using web-push library.
 * Stores & retrieves push subscriptions per user, sends push messages
 * even when the user is NOT browsing the app.
 */
import webPush from "web-push";
import { db } from "@/lib/db";

// Configure web-push with VAPID details once
let configured = false;
function ensureConfigured() {
  if (configured) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@hafara.com";

  if (!publicKey || !privateKey) {
    throw new Error(
      "VAPID keys missing. Set VAPID_PUBLIC_KEY & VAPID_PRIVATE_KEY in .env"
    );
  }
  webPush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export function getVapidPublicKey(): string {
  return process.env.VAPID_PUBLIC_KEY || "";
}

export type PushPayload = {
  title: string;
  message: string;
  type?: string; // INFO, EVALUATION, URGENT_TASK, etc.
  priority?: "normal" | "high" | "urgent";
  actionUrl?: string;
};

/**
 * Send a push notification to ALL subscriptions owned by a user
 * (a user may have multiple devices: phone, laptop, etc.)
 * Skips muted subscriptions silently.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<{
  sent: number;
  failed: number;
  removedStale: number;
}> {
  ensureConfigured();

  const subs = await db.pushSubscription.findMany({ where: { userId } });
  if (subs.length === 0) return { sent: 0, failed: 0, removedStale: 0 };

  const data = JSON.stringify({
    title: payload.title,
    message: payload.message,
    type: payload.type || "INFO",
    priority: payload.priority || "normal",
    actionUrl: payload.actionUrl || "/",
  });

  let sent = 0;
  let failed = 0;
  const staleEndpoints: string[] = [];

  await Promise.all(
    subs.map(async (sub) => {
      // Skip muted devices
      if (sub.muted) return;
      try {
        await webPush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          data,
          {
            TTL: 60 * 60 * 24, // 24h
            urgency: payload.priority === "urgent" ? "high" : payload.priority === "high" ? "normal" : "low",
            topic: payload.type || "hbos",
          }
        );
        sent += 1;
      } catch (e: any) {
        const status = e?.statusCode;
        // 404 / 410 → subscription is gone, mark for removal
        if (status === 404 || status === 410) {
          staleEndpoints.push(sub.endpoint);
        } else {
          failed += 1;
        }
      }
    })
  );

  // Clean up stale subscriptions
  let removedStale = 0;
  if (staleEndpoints.length > 0) {
    const r = await db.pushSubscription.deleteMany({
      where: { endpoint: { in: staleEndpoints } },
    });
    removedStale = r.count;
  }

  return { sent, failed, removedStale };
}

/**
 * Send push to multiple users (e.g. broadcast recipients)
 */
export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload
): Promise<{ sent: number; failed: number; removedStale: number; reachedUsers: number }> {
  let total = { sent: 0, failed: 0, removedStale: 0 };
  let reached = 0;
  for (const uid of userIds) {
    const r = await sendPushToUser(uid, payload);
    total.sent += r.sent;
    total.failed += r.failed;
    total.removedStale += r.removedStale;
    if (r.sent > 0) reached += 1;
  }
  return { ...total, reachedUsers: reached };
}

/**
 * Convert base64url VAPID public key to Uint8Array for pushManager.subscribe()
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = Buffer.from(base64, "base64");
  const arr = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData[i];
  return arr;
}
