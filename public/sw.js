/* ============================================================
 * HBOS Service Worker — Web Push + Background Notifications
 * ============================================================
 * Handles push events even when the app is NOT open in browser.
 * Supports:
 *   - Push events from server (broadcast/evaluations/urgent tasks)
 *   - Notification click → opens app & navigates to actionUrl
 *   - Sound playback (Web Audio API beep) on push
 *   - Mute flag stored in IndexedDB (per-device)
 * ============================================================ */

const CACHE_NAME = "hbos-v1";
const DB_NAME = "hbos-push";
const DB_STORE = "settings";
const SW_VERSION = "1.0.0";

// ============================================================
// IndexedDB helpers (for mute state & user id persistence)
// ============================================================

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(key) {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(DB_STORE, "readonly");
      const store = tx.objectStore(DB_STORE);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ? req.result.value : null);
      req.onerror = () => resolve(null);
    });
  } catch { return null; }
}

async function idbSet(key, value) {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(DB_STORE, "readwrite");
      const store = tx.objectStore(DB_STORE);
      store.put({ key, value });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch { return false; }
}

// ============================================================
// Sound playback (Web Audio API beep — no external file needed)
// ============================================================

async function playNotificationSound(priority) {
  try {
    // Skip if muted
    const muted = await idbGet("muted");
    if (muted === true) return;

    const AC = self.AudioContext || self.webkitAudioContext;
    if (!AC) return;

    const ctx = new AC();
    // Resume context if suspended (mobile autoplay policy)
    if (ctx.state === "suspended") {
      try { await ctx.resume(); } catch {}
    }

    // Choose tone by priority
    const isUrgent = priority === "urgent";
    const isHigh = priority === "high";
    const freq = isUrgent ? 880 : isHigh ? 660 : 523.25; // A5, E5, C5
    const beeps = isUrgent ? 3 : isHigh ? 2 : 1;

    for (let i = 0; i < beeps; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = isUrgent ? "square" : "sine";
      osc.frequency.value = freq;
      const startT = ctx.currentTime + i * 0.22;
      const endT = startT + 0.18;
      gain.gain.setValueAtTime(0, startT);
      gain.gain.linearRampToValueAtTime(isUrgent ? 0.18 : 0.12, startT + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, endT);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startT);
      osc.stop(endT);
    }

    // Vibrate on mobile (best-effort)
    if (self.navigator && self.navigator.vibrate) {
      try {
        self.navigator.vibrate(isUrgent ? [200, 80, 200, 80, 200] : isHigh ? [180, 60, 180] : 150);
      } catch {}
    }

    // Close context after sound finishes
    setTimeout(() => { try { ctx.close(); } catch {} }, (beeps * 250) + 500);
  } catch (e) {
    // Silent fail — sound is best-effort
  }
}

// ============================================================
// Install / Activate
// ============================================================

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Clean old caches
      caches.keys().then((names) =>
        Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
      ),
    ])
  );
});

// ============================================================
// Message from client (mute toggle, test ping)
// ============================================================

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "MUTE") {
    idbSet("muted", !!data.muted);
  } else if (data.type === "SET_USER") {
    idbSet("userId", data.userId);
  } else if (data.type === "TEST_SOUND") {
    playNotificationSound(data.priority || "normal");
  } else if (data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// ============================================================
// Push event — show notification + play sound
// ============================================================

self.addEventListener("push", (event) => {
  let payload = { title: "Notifikasi HBOS", message: "", priority: "normal", type: "INFO", actionUrl: "/" };
  try {
    if (event.data) {
      const text = event.data.text();
      try { payload = { ...payload, ...JSON.parse(text) }; }
      catch { payload = { ...payload, message: text }; }
    }
  } catch {}

  const title = payload.title || "Notifikasi HBOS";
  const body = payload.message || "";
  const priority = payload.priority || "normal";
  const type = payload.type || "INFO";
  const isUrgent = priority === "urgent";
  const isHigh = priority === "high";

  // Icon & badge — use inline data URIs (no network dependency)
  const icon =
    "data:image/svg+xml;base64," +
    btoa('<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192"><rect width="192" height="192" rx="32" fill="#1d4ed8"/><path d="M96 36a8 8 0 0 1 8 8v8h28a12 12 0 0 1 12 12v8a8 8 0 0 1-8 8H56a8 8 0 0 1-8-8v-8a12 12 0 0 1 12-12h28v-8a8 8 0 0 1 8-8ZM48 92h96v56a12 12 0 0 1-12 12H60a12 12 0 0 1-12-12V92Z" fill="white"/><circle cx="96" cy="120" r="14" fill="#1d4ed8"/></svg>');

  const badge = icon;

  // Tag groups notifications of same type so they replace (not stack)
  const tag = `hbos-${type}`;
  const renotify = isUrgent;

  const options = {
    body,
    icon,
    badge,
    tag,
    renotify,
    data: {
      actionUrl: payload.actionUrl || "/",
      type,
      priority,
      createdAt: Date.now(),
    },
    requireInteraction: isUrgent, // urgent stays until clicked
    silent: false, // we play our own sound
    vibrate: isUrgent ? [200, 80, 200, 80, 200] : isHigh ? [180, 60, 180] : [150],
    actions: [
      { action: "open", title: "Buka Aplikasi" },
      { action: "dismiss", title: "Tutup" },
    ],
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, options),
      playNotificationSound(priority),
    ])
  );
});

// ============================================================
// Notification click — open / focus app
// ============================================================

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const action = event.action;
  if (action === "dismiss") return;

  const targetUrl = (event.notification.data && event.notification.data.actionUrl) || "/";

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      // Try to find a client whose URL starts with our origin
      for (const client of allClients) {
        try {
          const u = new URL(client.url);
          if (u.origin === self.location.origin) {
            // Focus & navigate
            if ("focus" in client) {
              await client.focus();
            }
            if ("navigate" in client) {
              try { await client.navigate(targetUrl); } catch {}
            }
            // Tell client to switch view
            try {
              client.postMessage({ type: "NOTIF_CLICK", actionUrl: targetUrl });
            } catch {}
            return;
          }
        } catch {}
      }

      // No open client → open new window
      if (self.clients.openWindow) {
        try {
          await self.clients.openWindow(targetUrl);
        } catch {}
      }
    })()
  );
});

// ============================================================
// Push subscription change (browser rotates keys) — re-subscribe
// ============================================================

self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const reg = await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: event.newSubscription
            ? undefined
            : await getVapidKey(),
        });
        const allClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
        for (const c of allClients) {
          c.postMessage({ type: "RESUBSCRIBE", subscription: reg });
        }
      } catch {}
    })()
  );
});
