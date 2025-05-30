import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PaperProvider, MD3DarkTheme } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import { Platform } from 'react-native';



import OnboardingScreen from './src/screens/OnboardingScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import SubscriptionScreen from './src/screens/SubscriptionScreen';
import GenericConversionSettingsScreen from './src/screens/GenericConversionSettingsScreen';
import GenericConversionProgressScreen from './src/screens/GenericConversionProgressScreen';
import CompressionSettingsScreen from './src/screens/CompressionSettingsScreen';
import CompressionProgressScreen from './src/screens/CompressionProgressScreen';
import AudioCompressionSettingsScreen from './src/screens/AudioCompressionSettingsScreen';
import AudioCompressionProgressScreen from './src/screens/AudioCompressionProgressScreen';
import ErrorBoundary from './src/components/ErrorBoundary';

export type RootStackParamList = {
  Onboarding: undefined;
  Home: undefined;
  Subscription: undefined;
  GenericConversionSettings: {
    files: Array<{ uri: string; name: string }>;
    conversionType: 'image' | 'audio' | 'video';
  };
  GenericConversionProgress: {
    files: Array<{ uri: string; name: string; outputName: string }>;
    outputFormatId: string;
    outputFormatExtension: string;
    quality?: number;
    conversionType: 'image' | 'audio' | 'video';
  };
  CompressionSettings: {
    files: Array<{ uri: string; name: string }>;
  };
  CompressionProgress: {
    files: Array<{ uri: string; name: string }>;
    compressionSettings: any; // CompressionSettings type
  };
  AudioCompressionSettings: {
    files: Array<{ uri: string; name: string }>;
  };
  AudioCompressionProgress: {
    files: Array<{ uri: string; name: string }>;
    compressionSettings: any; // AudioCompressionSettings type
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
          <Stack.Screen
            name="CompressionSettings"
            component={CompressionSettingsScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="CompressionProgress"
            component={CompressionProgressScreen}
            options={{
              headerShown: false,
              gestureEnabled: false
            }}
          />
          <Stack.Screen
            name="AudioCompressionSettings"
            component={AudioCompressionSettingsScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="AudioCompressionProgress"
            component={AudioCompressionProgressScreen}
            options={{
              headerShown: false,
              gestureEnabled: false
            }}
          />
        </Stack.Navigator>
        </NavigationContainer>
      </PaperProvider>
    </ErrorBoundary>
  );
}

export default App;
