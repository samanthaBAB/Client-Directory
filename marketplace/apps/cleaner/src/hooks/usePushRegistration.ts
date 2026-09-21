import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import { Platform } from "react-native";
import { api } from "@/api/client";
import { useAuth } from "@/context/AuthContext";

// Registers this device for push notifications once signed in, and sends
// the token to the backend. No-ops quietly if permission is denied or if
// the project hasn't been configured with EAS yet (no projectId) — the
// app still works fine without push, it just won't get notified.
export function usePushRegistration() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    (async () => {
      try {
        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("default", {
            name: "default",
            importance: Notifications.AndroidImportance.DEFAULT,
          });
        }

        const { status: existing } = await Notifications.getPermissionsAsync();
        let status = existing;
        if (status !== "granted") {
          const req = await Notifications.requestPermissionsAsync();
          status = req.status;
        }
        if (status !== "granted") return;

        const projectId =
          Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
        if (!projectId) return;

        const { data: pushToken } = await Notifications.getExpoPushTokenAsync({ projectId });
        await api.registerPushToken(pushToken);
      } catch (err) {
        console.warn("Push registration skipped:", err);
      }
    })();
  }, [user]);
}
