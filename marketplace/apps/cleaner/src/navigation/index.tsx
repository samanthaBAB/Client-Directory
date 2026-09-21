import { CompositeScreenProps, NavigationContainer, Theme } from "@react-navigation/native";
import { BottomTabScreenProps, createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator, NativeStackScreenProps } from "@react-navigation/native-stack";
import React from "react";
import { View } from "react-native";
import { BubbleLoader } from "@/components/BubbleLoader";
import { useAuth } from "@/context/AuthContext";
import JobFeedScreen from "@/screens/JobFeedScreen";
import JobDetailScreen from "@/screens/JobDetailScreen";
import LoginScreen from "@/screens/LoginScreen";
import MyJobsScreen from "@/screens/MyJobsScreen";
import ProfileScreen from "@/screens/ProfileScreen";
import RegisterScreen from "@/screens/RegisterScreen";
import StripeOnboardingScreen from "@/screens/StripeOnboardingScreen";
import SupportScreen from "@/screens/SupportScreen";
import { colors } from "@/theme";

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Main: undefined;
  JobDetail: { jobId: string; source: "feed" | "mine" };
  Support: undefined;
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
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
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
            <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
            <Stack.Screen name="JobDetail" component={JobDetailScreen} options={{ title: "Job details" }} />
            <Stack.Screen name="Support" component={SupportScreen} options={{ title: "Support & policies" }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
