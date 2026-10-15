import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '@/screens/auth/LoginScreen';
import SignupScreen from '@/screens/auth/SignupScreen';
import OnboardingScreen from '@/screens/onboarding/OnboardingScreen';
import OnboardingSlide1 from '@/screens/onboarding/OnboardingSlide1';
import OnboardingSlide2 from '@/screens/onboarding/OnboardingSlide2';
import OnboardingSlide3 from '@/screens/onboarding/OnboardingSlide3';
import LoadingScreen from '@/screens/onboarding/LoadingScreen';

interface AuthNavigatorProps {
  initialRouteName?: string;
}

const Stack = createNativeStackNavigator();

export default function AuthNavigator({ initialRouteName = 'Onboarding' }: AuthNavigatorProps) {
  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="OnboardingSlide1" component={OnboardingSlide1} />
      <Stack.Screen name="OnboardingSlide2" component={OnboardingSlide2} />
      <Stack.Screen name="OnboardingSlide3" component={OnboardingSlide3} />
      <Stack.Screen name="Loading" component={LoadingScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
    </Stack.Navigator>
  );
}

