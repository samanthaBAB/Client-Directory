import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import BookingsScreen from "@/screens/BookingsScreen";
import HomeScreen from "@/screens/HomeScreen";
import JobDetailScreen from "@/screens/JobDetailScreen";
import LoginScreen from "@/screens/LoginScreen";
import PaymentScreen from "@/screens/PaymentScreen";
import ProfileScreen from "@/screens/ProfileScreen";
import RegisterScreen from "@/screens/RegisterScreen";
import { Job } from "@/api/client";

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Home: undefined;
  Bookings: undefined;
  JobDetail: { jobId: string };
  Payment: { job: Job };
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
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
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
