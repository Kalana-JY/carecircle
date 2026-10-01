import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AdminDashboard from '../screens/admin/AdminDashboard';
import UserManagementScreen from '../screens/admin/UserManagementScreen';
import SessionManagementScreen from '../screens/admin/SessionManagementScreen';
import NotificationsScreen from '../screens/main/NotificationsScreen';

const Stack = createNativeStackNavigator();

export default function AdminNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
      <Stack.Screen name="UserManagement" component={UserManagementScreen} />
      <Stack.Screen name="SessionManagement" component={SessionManagementScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
    </Stack.Navigator>
  );
}
