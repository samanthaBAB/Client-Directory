"use client";

import { useEffect } from "react";

// Registers the offline-fallback service worker (public/sw.js). This is what
// lets the app show a friendly "you're offline" page instead of the
// WebView's bare connection-error screen — see mobile/README.md for why
// that matters for App Store review.
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Offline support is a nice-to-have, not critical — fail silently.
      });
    }
  }, []);

  return null;
}
