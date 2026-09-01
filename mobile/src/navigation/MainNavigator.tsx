import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '../hooks/use-color-scheme';
import { Colors } from '../constants/theme';

import HomeScreen from '../screens/main/HomeScreen';
import ExploreScreen from '../screens/main/ExploreScreen';
import CommunityScreen from '../screens/main/CommunityScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import ForumDetailScreen from '../screens/forum/ForumDetailScreen';
import CreatePostScreen from '../screens/forum/CreatePostScreen';
import BecomeSupporterScreen from '../screens/supporter/BecomeSupporterScreen';
import ModalScreen from '../screens/modal/ModalScreen';
<<<<<<< Updated upstream
=======
import ManageScheduleScreen from '../screens/supporter/ManageScheduleScreen';
import BookSessionScreen from '../screens/main/BookSessionScreen';
import GoalsScreen from '../screens/main/GoalsScreen';
import AddGoalScreen from '../screens/main/AddGoalScreen';
import AchievementsScreen from '../screens/main/AchievementsScreen';
import ReportsScreen from '../screens/main/ReportsScreen';

export type MainStackParamList = {
  MainTabs: undefined;
  MoodJournalHome: undefined;
  Moods: { selectedMood?: string } | undefined;
  Journals: undefined;
  ForumDetail: undefined;
  CreatePost: undefined;
  BecomeSupporter: undefined;
  Modal: undefined;
  Goals: { refreshKey?: number } | undefined;
  AddGoal: { goal?: any; mode?: 'create' | 'edit' } | undefined;
  Achievements: undefined;
  Reports: undefined;
  Profile: undefined;
  BookSession: undefined;
  ManageSchedule: undefined;
};

export type MainStackNavigationProp = NativeStackNavigationProp<MainStackParamList>;
>>>>>>> Stashed changes

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

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
        name="Mood"
        component={MoodJournalHomeScreen}
        options={{
          title: 'Mood',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="happy" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Goals"
        component={GoalsScreen}
        options={{
          title: 'Goals',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="flag" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Resources"
        component={ExploreScreen}
        options={{
          title: 'Resources',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text" size={size} color={color} />
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
        options={{ title: 'Become a Peer Supporter', headerBackTitle: 'Back' }}
      />
      <Stack.Screen
        name="Goals"
        component={GoalsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AddGoal"
        component={AddGoalScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Achievements"
        component={AchievementsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Reports"
        component={ReportsScreen}
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
