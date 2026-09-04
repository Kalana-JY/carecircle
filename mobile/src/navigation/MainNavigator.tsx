import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { NavigatorScreenParams } from '@react-navigation/native';

import HomeScreen from '../screens/main/HomeScreen';
import CommunityScreen from '../screens/main/CommunityScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import MoodsScreen from '../screens/main/moods';
import JournalsScreen from '../screens/main/journals';
import MoodJournalHomeScreen from '../screens/main/MoodJournalHomeScreen';
import MoodHubScreen from '../screens/main/MoodHubScreen';
import WellnessActivitiesScreen from '../screens/main/WellnessActivitiesScreen';
import GoalsScreen from '../screens/main/GoalsScreen';
import ResourcesScreen from '../screens/main/ResourcesScreen';
import ForumDetailScreen from '../screens/forum/ForumDetailScreen';
import CreatePostScreen from '../screens/forum/CreatePostScreen';
import BecomeSupporterScreen from '../screens/supporter/BecomeSupporterScreen';
import ModalScreen from '../screens/modal/ModalScreen';
import ManageScheduleScreen from '../screens/supporter/ManageScheduleScreen';
import BookSessionScreen from '../screens/main/BookSessionScreen';
import { CustomTabBar } from '../components/CustomTabBar';
import type { HubTab } from '../components/MoodHubChrome';

export type MainTabParamList = {
  Home: undefined;
  Community: undefined;
  Mood: { selectedMood?: string; hubTab?: HubTab } | undefined;
  Goals: undefined;
  Resources: undefined;
};

export type MainStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  MoodJournalHome: undefined;
  Moods: { selectedMood?: string } | undefined;
  Journals: undefined;
  WellnessActivities: undefined;
  Profile: undefined;
  ForumDetail: undefined;
  CreatePost: undefined;
  BecomeSupporter: undefined;
  ManageSchedule: undefined;
  BookSession: undefined;
  Modal: undefined;
};

export type MainStackNavigationProp = NativeStackNavigationProp<MainStackParamList>;

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<MainStackParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="Community" component={CommunityScreen} options={{ title: 'Community' }} />
      <Tab.Screen name="Mood" component={MoodHubScreen} options={{ title: 'Mood' }} />
      <Tab.Screen name="Goals" component={GoalsScreen} options={{ title: 'Goals' }} />
      <Tab.Screen name="Resources" component={ResourcesScreen} options={{ title: 'Resources' }} />
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
        options={{ headerShown: false, contentStyle: { backgroundColor: '#F4F7FB' } }}
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
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
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
