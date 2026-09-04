import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { useAuth } from '../store/AuthContext';
import { ActivityIndicator, View } from 'react-native';

import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import AdminNavigator from './AdminNavigator';

const CareTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#3A7CA5',
    background: '#F4F7FB',
    card: '#FFFFFF',
    text: '#1C242C',
    border: '#E7ECF1',
    notification: '#3A7CA5',
  },
};

export function AppNavigator() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F4F7FB' }}>
        <ActivityIndicator size="large" color="#3A7CA5" />
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
    <NavigationContainer theme={CareTheme}>
      {getNavigator()}
    </NavigationContainer>
  );
}
