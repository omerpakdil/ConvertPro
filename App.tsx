import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PaperProvider, MD3DarkTheme } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';

import OnboardingScreen from './src/screens/OnboardingScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import SubscriptionScreen from './src/screens/SubscriptionScreen';
import GenericFileSelectScreen from './src/screens/GenericFileSelectScreen';
import GenericConversionSettingsScreen from './src/screens/GenericConversionSettingsScreen';
import GenericConversionProgressScreen from './src/screens/GenericConversionProgressScreen';

export type RootStackParamList = {
  Onboarding: undefined;
  Home: undefined;
  Subscription: undefined;
  GenericFileSelect: { conversionType: 'image' | 'audio' | 'video' | 'document' };
  GenericConversionSettings: {
    files: Array<{ uri: string; name: string }>;
    conversionType: 'image' | 'audio' | 'video' | 'document';
  };
  GenericConversionProgress: {
    files: Array<{ uri: string; name: string; outputName: string }>;
    outputFormatId: string;
    outputFormatExtension: string;
    quality?: number;
    conversionType: 'image' | 'audio' | 'video' | 'document';
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function App(): React.JSX.Element {
  // Varsayılan olarak koyu tema kullan
  const theme = MD3DarkTheme;

  return (
    <PaperProvider theme={theme}>
      <StatusBar style="light" />
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Onboarding">
          <Stack.Screen
            name="Onboarding"
            component={OnboardingScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Subscription"
            component={SubscriptionScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="GenericFileSelect"
            component={GenericFileSelectScreen}
            options={({ route }) => ({ title: `Select ${route.params.conversionType.charAt(0).toUpperCase() + route.params.conversionType.slice(1)} File(s)` })}
          />
          <Stack.Screen
            name="GenericConversionSettings"
            component={GenericConversionSettingsScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="GenericConversionProgress"
            component={GenericConversionProgressScreen as any}
            options={{ headerShown: false }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
}

export default App;
