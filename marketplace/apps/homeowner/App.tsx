import { StripeProvider } from "@stripe/stripe-react-native";
import Constants from "expo-constants";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { AuthProvider } from "@/context/AuthContext";
import RootNavigator from "@/navigation";

const STRIPE_PUBLISHABLE_KEY = (Constants.expoConfig?.extra?.stripePublishableKey as string) ?? "";

export default function App() {
  return (
    <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
      <AuthProvider>
        <StatusBar style="dark" />
        <RootNavigator />
      </AuthProvider>
    </StripeProvider>
  );
}
