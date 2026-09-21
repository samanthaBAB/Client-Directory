import * as Notifications from "expo-notifications";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { AuthProvider } from "@/context/AuthContext";
import { usePushRegistration } from "@/hooks/usePushRegistration";
import RootNavigator from "@/navigation";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function AppContent() {
  usePushRegistration();
  return <RootNavigator />;
}

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <AppContent />
    </AuthProvider>
  );
}
