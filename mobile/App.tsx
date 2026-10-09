import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import TopicsScreen from './src/screens/TopicsScreen';
import TopicDetailScreen from './src/screens/TopicDetailScreen';
import AuthScreen from './src/screens/AuthScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import RewardsScreen from './src/screens/RewardsScreen';
import { theme } from './src/theme';

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

const navTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    background: theme.ink,
    card: theme.ink2,
    text: theme.parchment,
    border: theme.line,
    primary: theme.brass,
    notification: theme.brass,
  },
};

const headerStyle = {
  headerStyle: { backgroundColor: theme.ink2 },
  headerTintColor: theme.parchment,
} as const;

function TopicsStack() {
  return (
    <Stack.Navigator screenOptions={headerStyle}>
      <Stack.Screen name="Topics" component={TopicsScreen} options={{ title: 'Gundem' }} />
      <Stack.Screen
        name="TopicDetail"
        component={TopicDetailScreen}
        options={({ route }) => ({
          title: (route.params as { title?: string })?.title ?? 'Dava',
        })}
      />
    </Stack.Navigator>
  );
}

function RootTabs() {
  const { user } = useAuth();
  return (
    <Tabs.Navigator
      screenOptions={{
        ...headerStyle,
        tabBarStyle: { backgroundColor: theme.ink2, borderTopColor: theme.line },
        tabBarActiveTintColor: theme.brass,
        tabBarInactiveTintColor: theme.parchmentDim,
      }}
    >
      <Tabs.Screen
        name="GundemTab"
        component={TopicsStack}
        options={{ title: 'Gundem', headerShown: false }}
      />
      <Tabs.Screen name="Odul" component={RewardsScreen} options={{ title: 'Odul' }} />
      <Tabs.Screen
        name="Bildirim"
        component={NotificationsScreen}
        options={{ title: 'Bildirim' }}
      />
      <Tabs.Screen
        name="Hesap"
        component={AuthScreen}
        options={{ title: user ? 'Hesap' : 'Giris' }}
      />
    </Tabs.Navigator>
  );
}

function Gate() {
  const { loading } = useAuth();
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.ink, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={theme.brass} />
      </View>
    );
  }
  return (
    <NavigationContainer theme={navTheme}>
      <RootTabs />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <Gate />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
