"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/lib/api-client";

type PushState = {
  // Browser capability
  supported: boolean;
  permission: NotificationPermission | "unsupported";
  // Registration
  swRegistered: boolean;
  subscribed: boolean;
  // Local mute (synced to backend)
  muted: boolean;
  // Loading states
  enabling: boolean;
  // Last error
  error: string | null;
};

/**
 * usePushNotifications — hook to register service worker,
 * subscribe to push, and sync mute state.
 *
 * Flow:
 *   1. On mount, check browser support + permission + existing SW
 *   2. Call enable() to request permission, register SW, subscribe,
 *      and POST subscription to backend
 *   3. Call disable() to unsubscribe + remove from backend
 *   4. Call setMuted(bool) to mute/unmute this device (also synced to SW)
 *   5. Call sendTest() to verify background delivery
 */
export function usePushNotifications() {
  const [state, setState] = useState<PushState>({
    supported: false,
    permission: "default",
    swRegistered: false,
    subscribed: false,
    muted: false,
    enabling: false,
    error: null,
  });

  // Keep ref to current registration so we can unsubscribe later
  const regRef = useRef<ServiceWorkerRegistration | null>(null);
  const subRef = useRef<PushSubscription | null>(null);

  // Initial check on mount
  useEffect(() => {
    const supported =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;

    if (!supported) {
      setState((s) => ({ ...s, supported: false, permission: "unsupported" }));
      return;
    }

    setState((s) => ({ ...s, supported: true, permission: Notification.permission }));

    let cancelled = false;
    (async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });
        if (cancelled) return;
        regRef.current = reg;

        // Listen for updates
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "activated") {
                // Tell SW to take over immediately
                newWorker.postMessage({ type: "SKIP_WAITING" });
              }
            });
          }
        });

        // Check existing subscription
        const sub = await reg.pushManager.getSubscription();
        if (cancelled) return;
        if (sub) {
          subRef.current = sub;
          setState((s) => ({ ...s, swRegistered: true, subscribed: true }));
        } else {
          setState((s) => ({ ...s, swRegistered: true, subscribed: false }));
        }

        // Fetch mute state from backend
        try {
          const d = await api<{ muted: boolean }>("/api/push/mute");
          if (!cancelled) setState((s) => ({ ...s, muted: !!d.muted }));
        } catch {}

        // Listen for messages from SW
        navigator.serviceWorker.addEventListener("message", (event) => {
          const data = event.data || {};
          if (data.type === "NOTIF_CLICK" && data.actionUrl) {
            // Optionally notify React router — but we just let the app reload
          }
        });
      } catch (e) {
        if (!cancelled) {
          setState((s) => ({ ...s, error: "Gagal register service worker" }));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Convert VAPID key to Uint8Array (browser-side)
  function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = atob(base64);
    const arr = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i);
    return arr;
  }

  // Enable push notifications
  const enable = useCallback(async () => {
    if (!state.supported) {
      setState((s) => ({ ...s, error: "Browser tidak mendukung push notification" }));
      return false;
    }
    setState((s) => ({ ...s, enabling: true, error: null }));
    try {
      // 1. Request permission
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState((s) => ({
          ...s,
          enabling: false,
          permission: perm,
          error: "Izin notifikasi ditolak. Aktifkan di pengaturan browser.",
        }));
        return false;
      }
      setState((s) => ({ ...s, permission: perm }));

      // 2. Ensure SW is registered & ready
      let reg = regRef.current;
      if (!reg) {
        reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        regRef.current = reg;
      }
      await navigator.serviceWorker.ready;

      // 3. Fetch VAPID public key
      const vRes = await api<{ publicKey: string }>("/api/push/vapid-public");
      if (!vRes.publicKey) throw new Error("VAPID key kosong");

      // 4. Subscribe
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vRes.publicKey),
      });
      subRef.current = sub;

      // 5. Serialize & send to backend
      const json = sub.toJSON() as any;
      await api("/api/push/subscribe", {
        method: "POST",
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
          userAgent: navigator.userAgent,
        }),
      });

      // 6. Tell SW about user (for IndexedDB persistence)
      // We don't have user id here — fetch from /api/auth/me equivalent if needed
      reg.active?.postMessage({ type: "SET_USER", userId: "" });
      // Sync mute state to SW
      reg.active?.postMessage({ type: "MUTE", muted: state.muted });

      setState((s) => ({ ...s, enabling: false, subscribed: true, swRegistered: true }));
      return true;
    } catch (e: any) {
      setState((s) => ({
        ...s,
        enabling: false,
        error: e?.message || "Gagal mengaktifkan push notification",
      }));
      return false;
    }
  }, [state.supported, state.muted]);

  // Disable push notifications
  const disable = useCallback(async () => {
    try {
      const sub = subRef.current || (await regRef.current?.pushManager.getSubscription());
      if (sub) {
        const json = sub.toJSON() as any;
        try {
          await api("/api/push/unsubscribe", {
            method: "POST",
            body: JSON.stringify({ endpoint: json.endpoint }),
          });
        } catch {}
        await sub.unsubscribe();
        subRef.current = null;
      }
      setState((s) => ({ ...s, subscribed: false }));
      return true;
    } catch (e: any) {
      setState((s) => ({ ...s, error: e?.message || "Gagal menonaktifkan" }));
      return false;
    }
  }, []);

  // Toggle mute
  const setMuted = useCallback(async (muted: boolean) => {
    setState((s) => ({ ...s, muted }));
    // Notify SW (for IndexedDB local copy)
    try {
      const reg = regRef.current;
      reg?.active?.postMessage({ type: "MUTE", muted });
    } catch {}
    // Sync to backend
    try {
      await api("/api/push/mute", {
        method: "POST",
        body: JSON.stringify({ muted }),
      });
    } catch {}
  }, []);

  // Send test push notification
  const sendTest = useCallback(async () => {
    try {
      const d = await api<{ sent: number; message: string }>("/api/push/test", {
        method: "POST",
      });
      return { ok: true, sent: d.sent, message: d.message };
    } catch (e: any) {
      return { ok: false, message: e?.message || "Gagal kirim test" };
    }
  }, []);

  // Play a test sound locally (no push needed)
  const playTestSound = useCallback(async (priority: "normal" | "high" | "urgent" = "normal") => {
    try {
      const reg = regRef.current;
      reg?.active?.postMessage({ type: "TEST_SOUND", priority });
      return true;
    } catch {
      return false;
    }
  }, []);

  return {
    ...state,
    enable,
    disable,
    setMuted,
    sendTest,
    playTestSound,
  };
}
