import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '../hooks/use-color-scheme';
import { Colors } from '../constants/theme';

import HomeScreen from '../screens/main/HomeScreen';
import ExploreScreen from '../screens/main/ExploreScreen';
import CommunityScreen from '../screens/main/CommunityScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import MoodsScreen from '../screens/main/moods';
import JournalsScreen from '../screens/main/journals';
import MoodJournalHomeScreen from '../screens/main/MoodJournalHomeScreen';
import WellnessActivitiesScreen from '../screens/main/WellnessActivitiesScreen';
import ForumDetailScreen from '../screens/forum/ForumDetailScreen';
import CreatePostScreen from '../screens/forum/CreatePostScreen';
import BecomeSupporterScreen from '../screens/supporter/BecomeSupporterScreen';
import ModalScreen from '../screens/modal/ModalScreen';
import ManageScheduleScreen from '../screens/supporter/ManageScheduleScreen';
import BookSessionScreen from '../screens/main/BookSessionScreen';

export type MainStackParamList = {
  MainTabs: undefined;
  MoodJournalHome: undefined;
  Moods: { selectedMood?: string } | undefined;
  Journals: undefined;
  WellnessActivities: undefined;
  ForumDetail: undefined;
  CreatePost: undefined;
  BecomeSupporter: undefined;
  Modal: undefined;
};

export type MainStackNavigationProp = NativeStackNavigationProp<MainStackParamList>;

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator<MainStackParamList>();

function MainTabs() {
  const colorScheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const colors = Colors[colorScheme];

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.tabIconDefault,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Explore"
        component={ExploreScreen}
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="compass" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Community"
        component={CommunityScreen}
        options={{
          title: 'Community',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function MainNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="MainTabs"
        component={MainTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Moods"
        component={MoodsScreen}
        options={{ title: 'Mood Journal' }}
      />
      <Stack.Screen
        name="MoodJournalHome"
        component={MoodJournalHomeScreen}
        options={{ title: 'Mood & Journal' }}
      />
      <Stack.Screen
        name="Journals"
        component={JournalsScreen}
        options={{ title: 'Journal' }}
      />
      <Stack.Screen
        name="WellnessActivities"
        component={WellnessActivitiesScreen}
        options={{ title: 'Wellness activities' }}
      />
      <Stack.Screen
        name="ForumDetail"
        component={ForumDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreatePost"
        component={CreatePostScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="BecomeSupporter"
        component={BecomeSupporterScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ManageSchedule"
        component={ManageScheduleScreen}
        options={{ title: 'Manage Support Sessions', headerBackTitle: 'Back' }}
      />
      <Stack.Screen
        name="BookSession"
        component={BookSessionScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Modal"
        component={ModalScreen}
        options={{ presentation: 'modal', title: 'Modal' }}
      />
    </Stack.Navigator>
  );
}
