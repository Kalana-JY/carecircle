import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../store/AuthContext';
import { useColorScheme } from '../hooks/use-color-scheme';
import { ActivityIndicator, View } from 'react-native';

import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import AdminNavigator from './AdminNavigator';

export function AppNavigator() {
  const { user, isLoading } = useAuth();
  const colorScheme = useColorScheme();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colorScheme === 'dark' ? '#121212' : '#F4F7FC' }}>
        <ActivityIndicator size="large" color="#245B8B" />
      </View>
    );
  }

  const getNavigator = () => {
    if (!user) {
      return <AuthNavigator />;
    }

    const email = user.email.toLowerCase();
    if (user.isAdmin || email.includes('admin')) {
      return <AdminNavigator />;
    }

    return <MainNavigator />;
  };

  return (
    <NavigationContainer>
      {getNavigator()}
    </NavigationContainer>
  );
}
