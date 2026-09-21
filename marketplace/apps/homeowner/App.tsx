import { StripeProvider } from "@stripe/stripe-react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { AuthProvider } from "@/context/AuthContext";
import { usePushRegistration } from "@/hooks/usePushRegistration";
import RootNavigator from "@/navigation";

const STRIPE_PUBLISHABLE_KEY = (Constants.expoConfig?.extra?.stripePublishableKey as string) ?? "";

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
    <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
      <AuthProvider>
        <StatusBar style="dark" />
        <AppContent />
      </AuthProvider>
    </StripeProvider>
  );
}
