import { StatusBar } from "expo-status-bar";
import React from "react";
import { AuthProvider } from "@/context/AuthContext";
import RootNavigator from "@/navigation";

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <RootNavigator />
    </AuthProvider>
  );
}
