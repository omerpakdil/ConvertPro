import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  UIManager,
  LayoutAnimation,
  Platform,
  Animated,
  StatusBar as RNStatusBar
} from 'react-native';
import {
  Button,
  useTheme,
  Text,
  Surface,
  IconButton,
  ProgressBar
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import type { StackNavigationProp } from '@react-navigation/stack';

// Örnek StackNavigator parametre listesi (projenize göre uyarlayın)
type RootStackParamList = {
  Onboarding: undefined;
  Home: undefined;
  Subscription: undefined;
};

type OnboardingScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Onboarding'
>;

interface OnboardingScreenProps {
  navigation: OnboardingScreenNavigationProp;
}

const onboardingSteps = [
  {
    id: 1,
    icon: 'auto-fix',
    title: 'Welcome to\nConvertPro',
    subtitle: 'Transform Any File Format',
    description: 'Convert images, audio, video, and documents with professional quality. Fast, secure, and completely offline.',
    gradient: ['#1a1a2e', '#16213e', '#0f3460'],
    accentColor: '#bb86fc',
    features: ['Professional Quality', 'Lightning Fast', '100% Secure']
  },
  {
    id: 2,
    icon: 'file-multiple',
    title: 'Universal\nMedia Support',
    subtitle: 'Every Format You Need',
    description: 'From WebP to HEIC, FLAC to MP3, MKV to MP4. Support for 50+ formats with advanced quality controls.',
    gradient: ['#2d1b69', '#11998e', '#38ef7d'],
    accentColor: '#03dac6',
    features: ['Images & Photos', 'Audio Files', 'Video Content']
  },
  {
    id: 3,
    icon: 'shield-lock',
    title: 'Privacy\nFirst Design',
    subtitle: 'Your Files Stay Private',
    description: 'All conversions happen locally on your device. No uploads, no cloud processing, no data collection.',
    gradient: ['#232526', '#414345', '#1e3c72'],
    accentColor: '#cf6679',
    features: ['Local Processing', 'No Cloud Upload', 'Complete Privacy']
  },
  {
    id: 4,
    icon: 'rocket-launch-outline',
    title: 'Ready to\nTransform?',
    subtitle: 'Start Converting Now',
    description: 'Join thousands of users who trust ConvertPro for their daily file conversion needs.',
    gradient: ['#0c0c0c', '#1a1a1a', '#2d2d2d'],
    accentColor: '#bb86fc',
    features: ['Get Started', 'Premium Experience', '5-Star Rated']
  },
];

const { width } = Dimensions.get('window');

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ navigation }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const theme = useTheme();
  const { colors } = theme;

  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const iconRotateAnim = useRef(new Animated.Value(0)).current;

  // Android için LayoutAnimation'ı etkinleştir
  if (
    Platform.OS === 'android' &&
    UIManager.setLayoutAnimationEnabledExperimental
  ) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Icon rotation animation
    Animated.loop(
      Animated.timing(iconRotateAnim, {
        toValue: 1,
        duration: 10000,
        useNativeDriver: true,
      })
    ).start();
  }, [currentStep]);

  const handleNext = () => {
    // Exit animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -50,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (currentStep < onboardingSteps.length - 1) {
        setCurrentStep(currentStep + 1);
        // Reset animations for next step
        slideAnim.setValue(50);
        fadeAnim.setValue(0);
      } else {
        navigation.replace('Home');
      }
    });
  };

  const handleBack = () => {
    if (currentStep > 0) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 50,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setCurrentStep(currentStep - 1);
        slideAnim.setValue(-50);
        fadeAnim.setValue(0);
      });
    }
  };

  const handleSkip = () => {
    navigation.replace('Home');
  };

  const stepData = onboardingSteps[currentStep];

  const iconRotation = iconRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const progress = (currentStep + 1) / onboardingSteps.length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        style="light"
        backgroundColor="#1a1a2e"
        translucent={false}
      />

      {/* Gradient Background */}
      <LinearGradient
        colors={stepData.gradient}
        style={styles.gradientBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Top Bar with Glassmorphism */}
      <View style={styles.topBar}>
        <View style={styles.progressContainer}>
          <ProgressBar
            progress={progress}
            color={stepData.accentColor}
            style={styles.progressBar}
          />
          <Text variant="labelSmall" style={styles.progressText}>
            {currentStep + 1} of {onboardingSteps.length}
          </Text>
        </View>
        <Surface style={styles.skipButton} elevation={0}>
          <IconButton
            icon="close"
            iconColor="rgba(255,255,255,0.7)"
            size={20}
            onPress={handleSkip}
          />
        </Surface>
      </View>

      <Animated.View
        style={[
          styles.container,
          {
            opacity: fadeAnim,
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim }
            ]
          }
        ]}
      >
        {/* Main Content */}
        <View style={styles.contentContainer}>
          {/* Floating Icon with Glassmorphism */}
          <Animated.View
            style={[
              styles.iconContainer,
              { transform: [{ rotate: iconRotation }] }
            ]}
          >
            <Surface style={[styles.iconSurface, { backgroundColor: stepData.accentColor + '20' }]} elevation={0}>
              <View style={[styles.iconInner, { borderColor: stepData.accentColor + '40' }]}>
                <IconButton
                  icon={stepData.icon}
                  iconColor={stepData.accentColor}
                  size={40}
                />
              </View>
            </Surface>
          </Animated.View>

          {/* Title and Subtitle */}
          <View style={styles.textContainer}>
            <Text variant="displaySmall" style={styles.title}>
              {stepData.title}
            </Text>
            <Text variant="titleMedium" style={[styles.subtitle, { color: stepData.accentColor }]}>
              {stepData.subtitle}
            </Text>
            <Text variant="bodyLarge" style={styles.description}>
              {stepData.description}
            </Text>
          </View>

          {/* Features List with Glassmorphism */}
          <View style={styles.featuresContainer}>
            {stepData.features.map((feature, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.featureItem,
                  {
                    opacity: fadeAnim,
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    borderColor: stepData.accentColor + '30',
                    transform: [{
                      translateX: slideAnim.interpolate({
                        inputRange: [-50, 0, 50],
                        outputRange: [-20, 0, 20],
                      })
                    }]
                  }
                ]}
              >
                <View style={styles.featureContent}>
                  <View style={[styles.featureDot, { backgroundColor: stepData.accentColor }]} />
                  <Text variant="bodyMedium" style={styles.featureText}>
                    {feature}
                  </Text>
                </View>
              </Animated.View>
            ))}
          </View>
        </View>

        {/* Navigation */}
        <View style={styles.navigationContainer}>
          <View style={styles.dotsContainer}>
            {onboardingSteps.map((_, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.dot,
                  {
                    backgroundColor: currentStep === index ? stepData.accentColor : 'rgba(255,255,255,0.2)',
                    opacity: currentStep === index ? 1 : 0.5,
                    transform: [{
                      scale: currentStep === index ? 1.3 : 1
                    }]
                  }
                ]}
              />
            ))}
          </View>

          <View style={styles.buttonsContainer}>
            {currentStep > 0 && (
              <Surface style={styles.backButtonSurface} elevation={0}>
                <Button
                  mode="outlined"
                  onPress={handleBack}
                  style={styles.backButton}
                  textColor="rgba(255,255,255,0.8)"
                  buttonColor="transparent"
                >
                  Back
                </Button>
              </Surface>
            )}
            <Surface style={[styles.nextButtonSurface, { backgroundColor: stepData.accentColor + '20' }]} elevation={0}>
              <Button
                mode="contained"
                onPress={handleNext}
                style={[styles.nextButton, currentStep === 0 && styles.fullWidthButton]}
                buttonColor={stepData.accentColor}
                textColor="#000000"
                icon={currentStep === onboardingSteps.length - 1 ? "rocket-launch" : "arrow-right"}
              >
                {currentStep === onboardingSteps.length - 1 ? 'Get Started' : 'Continue'}
              </Button>
            </Surface>
          </View>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1a1a2e', // Dark background to prevent gray area
  },
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 0) + 16 : 16,
    paddingBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  progressContainer: {
    flex: 1,
    marginRight: 16,
  },
  progressBar: {
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginBottom: 8,
  },
  progressText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '500',
  },
  skipButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 120, // Navigation için yer bırak
  },
  iconContainer: {
    marginBottom: 32,
  },
  iconSurface: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.4,
    shadowRadius: 20,
  },
  iconInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
    fontWeight: '400',
  },
  featuresContainer: {
    alignItems: 'stretch',
    width: '100%',
    paddingHorizontal: 20,
  },
  featureItem: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    marginVertical: 4,
    borderWidth: 1,
  },
  featureContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 12,
  },
  featureText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  navigationContainer: {
    position: 'absolute',
    bottom: 40,
    left: 24,
    right: 24,
    alignItems: 'center',
    paddingTop: 16,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  buttonsContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  backButtonSurface: {
    flex: 1,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  backButton: {
    borderRadius: 28,
    borderWidth: 0,
  },
  nextButtonSurface: {
    flex: 1,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  nextButton: {
    borderRadius: 28,
    fontWeight: '600',
  },
  fullWidthButton: {
    flex: 1,
  },
});

export default OnboardingScreen;