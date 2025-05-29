import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PaperProvider, MD3DarkTheme } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import { Platform } from 'react-native';

// Buffer polyfill for React Native
import { Buffer } from 'buffer';
global.Buffer = Buffer;

import OnboardingScreen from './src/screens/OnboardingScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import SubscriptionScreen from './src/screens/SubscriptionScreen';
import GenericConversionSettingsScreen from './src/screens/GenericConversionSettingsScreen';
import GenericConversionProgressScreen from './src/screens/GenericConversionProgressScreen';
import ErrorBoundary from './src/components/ErrorBoundary';

export type RootStackParamList = {
  Onboarding: undefined;
  Home: undefined;
  Subscription: undefined;
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

  useEffect(() => {
    // Android için navigation bar rengini ayarla
    if (Platform.OS === 'android') {
      NavigationBar.setBackgroundColorAsync(theme.colors.background);
    }
  }, [theme.colors.background]);

  return (
    <ErrorBoundary>
      <PaperProvider theme={theme}>
        <StatusBar style="light" backgroundColor={theme.colors.background} />
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
    </ErrorBoundary>
  );
}

export default App;
