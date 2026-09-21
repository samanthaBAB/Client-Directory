import { NavigationContainer, Theme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { View } from "react-native";
import { BubbleLoader } from "@/components/BubbleLoader";
import { useAuth } from "@/context/AuthContext";
import BookingsScreen from "@/screens/BookingsScreen";
import HomeScreen from "@/screens/HomeScreen";
import JobDetailScreen from "@/screens/JobDetailScreen";
import LoginScreen from "@/screens/LoginScreen";
import PaymentScreen from "@/screens/PaymentScreen";
import ProfileScreen from "@/screens/ProfileScreen";
import RegisterScreen from "@/screens/RegisterScreen";
import SubscriptionScreen from "@/screens/SubscriptionScreen";
import SupportScreen from "@/screens/SupportScreen";
import { colors } from "@/theme";
import { Job } from "@/api/client";

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Home: undefined;
  Bookings: undefined;
  JobDetail: { jobId: string };
  Payment: { job: Job };
  Profile: undefined;
  Subscription: undefined;
  Support: undefined;
};

const navTheme: Theme = {
  dark: true,
  colors: {
    primary: colors.primary,
    background: colors.background,
    card: colors.background,
    text: colors.text,
    border: colors.border,
    notification: colors.primary,
  },
  fonts: {
    regular: { fontFamily: "System", fontWeight: "400" },
    medium: { fontFamily: "System", fontWeight: "500" },
    bold: { fontFamily: "System", fontWeight: "700" },
    heavy: { fontFamily: "System", fontWeight: "900" },
  },
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <BubbleLoader />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {!user ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ title: "Create account" }} />
          </>
        ) : (
          <>
            <Stack.Screen name="Home" component={HomeScreen} options={{ title: "Request a cleaning" }} />
            <Stack.Screen name="Bookings" component={BookingsScreen} options={{ title: "My bookings" }} />
            <Stack.Screen name="JobDetail" component={JobDetailScreen} options={{ title: "Booking details" }} />
            <Stack.Screen name="Payment" component={PaymentScreen} options={{ title: "Payment" }} />
            <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: "Profile" }} />
            <Stack.Screen name="Subscription" component={SubscriptionScreen} options={{ title: "Monthly membership" }} />
            <Stack.Screen name="Support" component={SupportScreen} options={{ title: "Support" }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
