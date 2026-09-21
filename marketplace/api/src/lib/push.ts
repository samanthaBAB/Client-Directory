import { Expo, ExpoPushMessage } from "expo-server-sdk";

const expo = new Expo();

/**
 * Sends a push notification to a device, if it has a valid Expo push
 * token registered. Never throws — a bad/expired token or a down push
 * service shouldn't fail the request that triggered the notification.
 */
export async function sendPush(
  pushToken: string | null | undefined,
  message: { title: string; body: string; data?: Record<string, unknown> },
) {
  if (!pushToken || !Expo.isExpoPushToken(pushToken)) return;

  const ticket: ExpoPushMessage = { to: pushToken, sound: "default", ...message };
  try {
    await expo.sendPushNotificationsAsync([ticket]);
  } catch (err) {
    console.error("Push notification failed", err);
  }
}

export async function sendPushToMany(
  pushTokens: (string | null | undefined)[],
  message: { title: string; body: string; data?: Record<string, unknown> },
) {
  const valid = pushTokens.filter((t): t is string => Boolean(t) && Expo.isExpoPushToken(t!));
  if (valid.length === 0) return;

  const messages: ExpoPushMessage[] = valid.map((to) => ({ to, sound: "default", ...message }));
  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    try {
      await expo.sendPushNotificationsAsync(chunk);
    } catch (err) {
      console.error("Push notification batch failed", err);
    }
  }
}
