import React, { useState, useEffect } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { useAuth } from '../store/AuthContext';
import { tokenStorage } from '@/services/storage';

import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import AdminNavigator from './AdminNavigator';
import { LoadingScreen } from '@/screens/onboarding/LoadingScreen';

const CareTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#285F8E', // DESIGN.md Sky Blue primary
    background: '#F7FAFD', // DESIGN.md Serene background
    card: '#FFFFFF',
    text: '#181C1F', // DESIGN.md Slate text
    border: '#C1C7D0',
    notification: '#285F8E',
  },
};

export function AppNavigator() {
  const { user, isLoading } = useAuth();
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const seen = await tokenStorage.getItem('has_seen_onboarding');
        setHasSeenOnboarding(seen === 'true');
      } catch {
        setHasSeenOnboarding(false);
      }
    };
    checkOnboarding();
  }, []);

  // When app starts, show the branded LoadingScreen
  if (isLoading || hasSeenOnboarding === null) {
    return <LoadingScreen />;
  }

  const getNavigator = () => {
    if (!user) {
      return (
        <AuthNavigator
          initialRouteName={hasSeenOnboarding ? 'Login' : 'Onboarding'}
        />
      );
    }

    if (user.isAdmin) {
      return <AdminNavigator />;
    }

    return <MainNavigator />;
  };

  return (
    <NavigationContainer theme={CareTheme}>
      {getNavigator()}
    </NavigationContainer>
  );
}

