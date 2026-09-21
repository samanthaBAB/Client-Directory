import { CompositeScreenProps, NavigationContainer } from "@react-navigation/native";
import { BottomTabScreenProps, createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator, NativeStackScreenProps } from "@react-navigation/native-stack";
import React from "react";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import JobFeedScreen from "@/screens/JobFeedScreen";
import JobDetailScreen from "@/screens/JobDetailScreen";
import LoginScreen from "@/screens/LoginScreen";
import MyJobsScreen from "@/screens/MyJobsScreen";
import ProfileScreen from "@/screens/ProfileScreen";
import RegisterScreen from "@/screens/RegisterScreen";
import StripeOnboardingScreen from "@/screens/StripeOnboardingScreen";

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Main: undefined;
  JobDetail: { jobId: string; source: "feed" | "mine" };
};

export type MainTabParamList = {
  JobFeed: undefined;
  MyJobs: undefined;
  Payouts: undefined;
  Profile: undefined;
};

export type MainTabScreenProps<T extends keyof MainTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="JobFeed" component={JobFeedScreen} options={{ title: "Available jobs" }} />
      <Tab.Screen name="MyJobs" component={MyJobsScreen} options={{ title: "My jobs" }} />
      <Tab.Screen name="Payouts" component={StripeOnboardingScreen} options={{ title: "Payouts" }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: "Profile" }} />
    </Tab.Navigator>
  );
}

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
            <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
            <Stack.Screen name="JobDetail" component={JobDetailScreen} options={{ title: "Job details" }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
