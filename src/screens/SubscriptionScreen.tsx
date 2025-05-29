import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Platform,
  StatusBar as RNStatusBar,
  Modal
} from 'react-native';
import {
  Button,
  Text,
  useTheme,
  Surface,
  IconButton,
  ProgressBar
} from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';

// Örnek bir RootStackParamList, projenizdeki gerçek tanımla eşleşmelidir.
type RootStackParamList = {
  Subscription: undefined;
  Home: undefined;
  // Diğer ekranlarınız...
};

type SubscriptionScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Subscription'>;

interface SubscriptionScreenProps {
  navigation: SubscriptionScreenNavigationProp;
}

const { width } = Dimensions.get('window');

const SubscriptionScreen: React.FC<SubscriptionScreenProps> = ({ navigation }) => {
  const theme = useTheme();
  const [selectedPackage, setSelectedPackage] = useState<string | null>('yearly');
  const [showModal, setShowModal] = useState(false);
  const [modalPackage, setModalPackage] = useState<any>(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;
  const modalAnim = useRef(new Animated.Value(0)).current;

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

    // Sparkle animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(sparkleAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(sparkleAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const packages = [
    {
      id: 'monthly',
      title: 'Monthly',
      subtitle: 'Perfect for trying out',
      price: '$9.99',
      period: '/month',
      features: [
        'All premium formats',
        'No watermarks',
        'Priority support',
        'Advanced settings'
      ],
      popular: false,
      icon: 'calendar-month',
      gradient: ['#667eea', '#764ba2'],
      accentColor: '#667eea',
      savings: null,
    },
    {
      id: 'yearly',
      title: 'Yearly',
      subtitle: 'Most popular choice',
      price: '$59.99',
      period: '/year',
      originalPrice: '$119.88',
      features: [
        'All premium formats',
        'No watermarks',
        'Priority support',
        'Advanced settings',
        'Cloud sync',
        'Batch processing'
      ],
      popular: true,
      icon: 'star-circle',
      gradient: ['#f093fb', '#f5576c'],
      accentColor: '#f5576c',
      savings: 'Save 50%',
    },
    {
      id: 'lifetime',
      title: 'Lifetime',
      subtitle: 'One-time payment',
      price: '$199.99',
      period: 'forever',
      features: [
        'All premium formats',
        'No watermarks',
        'Priority support',
        'Advanced settings',
        'Cloud sync',
        'Batch processing',
        'Future updates',
        'Premium templates'
      ],
      popular: false,
      icon: 'infinity',
      gradient: ['#4facfe', '#00f2fe'],
      accentColor: '#00f2fe',
      savings: 'Best Value',
    },
  ];

  const handleSelectPackage = (packageId: string) => {
    setSelectedPackage(packageId);
  };

  const handlePackagePress = (pkg: any) => {
    setModalPackage(pkg);
    setShowModal(true);
    Animated.spring(modalAnim, {
      toValue: 1,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const handleCloseModal = () => {
    Animated.timing(modalAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowModal(false);
      setModalPackage(null);
    });
  };

  const handleSubscribe = () => {
    if (selectedPackage) {
      console.log(`${selectedPackage} paketine abone olundu.`);
      navigation.navigate('Home');
    } else {
      console.log('Lütfen bir paket seçin.');
    }
  };

  const handleMaybeLater = () => {
    navigation.navigate('Home');
  };

  const sparkleOpacity = sparkleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });

  const sparkleScale = sparkleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1.2],
  });

  const renderCompactCard = (pkg: any, index: number) => {
    const isSelected = selectedPackage === pkg.id;
    const cardDelay = index * 100;

    return (
      <Animated.View
        key={pkg.id}
        style={[
          {
            opacity: fadeAnim,
            transform: [
              {
                translateY: slideAnim.interpolate({
                  inputRange: [0, 50],
                  outputRange: [0, 50 + cardDelay],
                })
              },
              { scale: scaleAnim }
            ]
          }
        ]}
      >
        <TouchableOpacity
          onPress={() => handleSelectPackage(pkg.id)}
          onLongPress={() => handlePackagePress(pkg)}
          activeOpacity={0.9}
          style={styles.compactCardContainer}
        >
          <Surface style={[
            styles.compactCard,
            isSelected && styles.selectedCompactCard,
          ]} elevation={isSelected ? 3 : 1}>

            {/* Gradient Background */}
            <LinearGradient
              colors={pkg.gradient}
              style={styles.compactCardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />

            {/* Popular Badge */}
            {pkg.popular && (
              <View style={styles.compactPopularBadge}>
                <Text style={styles.compactBadgeText}>⭐</Text>
              </View>
            )}

            <View style={styles.compactCardContent}>
              {/* Icon & Title Row */}
              <View style={styles.compactHeaderRow}>
                <Surface style={[styles.compactIconSurface, { backgroundColor: pkg.accentColor + '20' }]} elevation={0}>
                  <IconButton
                    icon={pkg.icon}
                    iconColor={pkg.accentColor}
                    size={14}
                  />
                </Surface>
                <View style={styles.compactTitleContainer}>
                  <Text variant="titleMedium" style={styles.compactTitle}>
                    {pkg.title}
                  </Text>
                  <Text variant="bodySmall" style={[styles.compactSubtitle, { color: pkg.accentColor }]}>
                    {pkg.subtitle}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handlePackagePress(pkg)}
                  style={styles.infoButton}
                >
                  <IconButton
                    icon="chevron-right"
                    iconColor="rgba(255,255,255,0.6)"
                    size={16}
                  />
                </TouchableOpacity>
              </View>

              {/* Price Row */}
              <View style={styles.compactPriceRow}>
                <View style={styles.compactPriceContainer}>
                  <Text variant="headlineSmall" style={[styles.compactPrice, { color: pkg.accentColor }]}>
                    {pkg.price}
                  </Text>
                  <Text variant="bodySmall" style={styles.compactPeriod}>
                    {pkg.period}
                  </Text>
                </View>
                {pkg.savings && (
                  <View style={[styles.compactSavingsBadge, { backgroundColor: pkg.accentColor + '20' }]}>
                    <Text variant="labelSmall" style={[styles.compactSavingsText, { color: pkg.accentColor }]}>
                      {pkg.savings}
                    </Text>
                  </View>
                )}
              </View>

              {pkg.originalPrice && (
                <Text variant="bodySmall" style={styles.compactOriginalPrice}>
                  {pkg.originalPrice}
                </Text>
              )}
            </View>

            {/* Selection Indicator */}
            {isSelected && (
              <View style={[styles.selectionIndicator, { backgroundColor: pkg.accentColor }]} />
            )}
          </Surface>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        style="light"
        backgroundColor="#1a1a2e"
        translucent={false}
      />

      {/* Main Gradient Background */}
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.gradientBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Header Section - Fixed Height */}
      <Animated.View
        style={[
          styles.headerSection,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <View style={styles.headerRow}>
          <Surface style={styles.backButton} elevation={0}>
            <IconButton
              icon="arrow-left"
              iconColor="rgba(255,255,255,0.8)"
              size={24}
              onPress={() => navigation.goBack()}
            />
          </Surface>

          <View style={styles.headerContent}>
            <Animated.View style={[
              styles.headerIcon,
              {
                transform: [{
                  rotate: sparkleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '360deg'],
                  })
                }]
              }
            ]}>
              <Text style={styles.headerEmoji}>👑</Text>
            </Animated.View>
            <Text variant="headlineLarge" style={styles.headerTitle}>
              Unlock Premium
            </Text>
            <Text variant="bodyMedium" style={styles.headerSubtitle}>
              Transform any file format with professional quality
            </Text>
          </View>

          {/* Invisible placeholder to center content */}
          <View style={styles.headerPlaceholder} />
        </View>
      </Animated.View>

      {/* Packages Section - Flexible Height */}
      <View style={styles.packagesSection}>
        {packages.map((pkg, index) => renderCompactCard(pkg, index))}
      </View>

      {/* Bottom Section - Fixed Height */}
      <View style={styles.bottomSection}>
        {/* CTA Button */}
        <Animated.View
          style={[
            styles.ctaContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          <Surface style={[styles.ctaButtonSurface, { backgroundColor: packages.find(p => p.id === selectedPackage)?.accentColor + '20' }]} elevation={5}>
            <Button
              mode="contained"
              onPress={handleSubscribe}
              style={styles.ctaButton}
              buttonColor={packages.find(p => p.id === selectedPackage)?.accentColor}
              textColor="#000000"
              icon="rocket-launch"
              disabled={!selectedPackage}
            >
              {selectedPackage ? `Start with ${packages.find(p => p.id === selectedPackage)?.title}` : 'Select a Plan'}
            </Button>
          </Surface>

          <TouchableOpacity onPress={handleMaybeLater} style={styles.skipButton}>
            <Text variant="bodyMedium" style={styles.skipText}>
              Maybe Later
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Legal Text */}
        <View style={styles.legalContainer}>
          <Text variant="labelSmall" style={styles.legalText}>
            By purchasing, you agree to our Terms of Service and Privacy Policy.
            Subscriptions auto-renew unless cancelled.
          </Text>
        </View>
      </View>

      {/* Detail Modal */}
      <Modal
        visible={showModal}
        transparent={true}
        animationType="none"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={handleCloseModal}
          />
          {modalPackage && (
            <Animated.View
              style={[
                styles.modalContainer,
                {
                  opacity: modalAnim,
                  transform: [{
                    scale: modalAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    })
                  }]
                }
              ]}
            >
              <Surface style={styles.modalContent} elevation={5}>
                <LinearGradient
                  colors={modalPackage.gradient}
                  style={styles.modalGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />

                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <Surface style={[styles.modalIconSurface, { backgroundColor: modalPackage.accentColor + '20' }]} elevation={0}>
                    <IconButton
                      icon={modalPackage.icon}
                      iconColor={modalPackage.accentColor}
                      size={32}
                    />
                  </Surface>
                  <TouchableOpacity onPress={handleCloseModal} style={styles.modalCloseButton}>
                    <IconButton
                      icon="close"
                      iconColor="rgba(255,255,255,0.8)"
                      size={20}
                    />
                  </TouchableOpacity>
                </View>

                {/* Modal Title */}
                <Text variant="headlineMedium" style={styles.modalTitle}>
                  {modalPackage.title}
                </Text>
                <Text variant="bodyLarge" style={[styles.modalSubtitle, { color: modalPackage.accentColor }]}>
                  {modalPackage.subtitle}
                </Text>

                {/* Modal Price */}
                <View style={styles.modalPriceContainer}>
                  <Text variant="displayMedium" style={[styles.modalPrice, { color: modalPackage.accentColor }]}>
                    {modalPackage.price}
                  </Text>
                  <Text variant="bodyLarge" style={styles.modalPeriod}>
                    {modalPackage.period}
                  </Text>
                </View>

                {modalPackage.originalPrice && (
                  <Text variant="bodyMedium" style={styles.modalOriginalPrice}>
                    {modalPackage.originalPrice}
                  </Text>
                )}

                {/* Modal Features */}
                <View style={styles.modalFeaturesContainer}>
                  <Text variant="titleMedium" style={styles.modalFeaturesTitle}>
                    What's included:
                  </Text>
                  {modalPackage.features.map((feature: string, index: number) => (
                    <View key={index} style={styles.modalFeatureItem}>
                      <View style={[styles.modalFeatureDot, { backgroundColor: modalPackage.accentColor }]} />
                      <Text variant="bodyMedium" style={styles.modalFeatureText}>
                        {feature}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Modal Actions */}
                <View style={styles.modalActions}>
                  <Button
                    mode="contained"
                    onPress={() => {
                      handleSelectPackage(modalPackage.id);
                      handleCloseModal();
                    }}
                    style={styles.modalSelectButton}
                    buttonColor={modalPackage.accentColor}
                    textColor="#000000"
                  >
                    Select This Plan
                  </Button>
                </View>
              </Surface>
            </Animated.View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  // Layout Sections
  headerSection: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 0) + 8 : 8,
    paddingBottom: 12,
    minHeight: 140, // Reduced header height
  },
  packagesSection: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
    minHeight: 280, // Slightly reduced
  },
  bottomSection: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 25 : 8,
    minHeight: 120, // Reduced bottom section height
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  backButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  headerPlaceholder: {
    width: 48,
    height: 48,
  },
  headerIcon: {
    marginBottom: 8,
  },
  headerEmoji: {
    fontSize: 36,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  packagesContainer: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  packageCardContainer: {
    marginBottom: 20,
  },
  packageCard: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  selectedCard: {
    borderColor: 'rgba(255,255,255,0.3)',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  cardGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    opacity: 0.1,
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    left: 20,
    right: 20,
    zIndex: 10,
    borderRadius: 20,
    overflow: 'hidden',
  },
  badgeGradient: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  badgeText: {
    color: '#000000',
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  savingsBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  savingsText: {
    fontWeight: '700',
    fontSize: 11,
  },
  cardContent: {
    padding: 24,
    paddingTop: 32,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 16,
  },
  iconSurface: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  packageTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  packageSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '500',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 8,
  },
  price: {
    fontSize: 36,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  period: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    marginLeft: 4,
    fontWeight: '500',
  },
  originalPrice: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    textDecorationLine: 'line-through',
    textAlign: 'center',
    marginBottom: 20,
  },
  featuresContainer: {
    alignSelf: 'stretch',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
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
  ctaContainer: {
    marginBottom: 16,
    marginTop: 20,
    alignItems: 'center',
  },
  ctaButtonSurface: {
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
    width: '100%',
  },
  ctaButton: {
    borderRadius: 28,
    paddingVertical: 8,
  },
  skipButton: {
    marginTop: 10,
    paddingVertical: 12,
  },
  skipText: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  legalContainer: {
    marginTop: 12,
  },
  legalText: {
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 18,
  },

  // Compact Card Styles
  compactCardContainer: {
    marginBottom: 8,
  },
  compactCard: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    position: 'relative',
    minHeight: 70, // Reduced height
  },
  selectedCompactCard: {
    borderColor: 'rgba(255,255,255,0.3)',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  compactCardGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    opacity: 0.08,
  },
  compactPopularBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
  },
  compactBadgeText: {
    fontSize: 16,
  },
  compactCardContent: {
    padding: 10,
  },
  compactHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  compactIconSurface: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginRight: 8,
    marginLeft: 8,
  },
  compactTitleContainer: {
    flex: 1,
  },
  compactTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 1,
  },
  compactSubtitle: {
    fontSize: 10,
    fontWeight: '500',
  },
  infoButton: {
    padding: 4,
  },
  compactPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  compactPriceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginLeft: 8,
  },
  compactPrice: {
    fontSize: 18,
    fontWeight: '700',
  },
  compactPeriod: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.7)',
    marginLeft: 2,
    fontWeight: '500',
  },
  compactSavingsBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    marginRight: 8,
  },
  compactSavingsText: {
    fontWeight: '600',
    fontSize: 10,
  },
  compactOriginalPrice: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    textDecorationLine: 'line-through',
    marginBottom: 8,
    marginLeft: 8,
  },
  selectionIndicator: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    width: width * 0.9,
    maxHeight: '80%',
  },
  modalContent: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  modalGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    opacity: 0.1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
  },
  modalIconSurface: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalCloseButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  modalSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '500',
    paddingHorizontal: 20,
  },
  modalPriceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  modalPrice: {
    fontSize: 32,
    fontWeight: '800',
  },
  modalPeriod: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    marginLeft: 4,
    fontWeight: '500',
  },
  modalOriginalPrice: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    textDecorationLine: 'line-through',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  modalFeaturesContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  modalFeaturesTitle: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  modalFeatureDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 12,
  },
  modalFeatureText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  modalActions: {
    padding: 20,
    paddingTop: 0,
  },
  modalSelectButton: {
    borderRadius: 16,
    paddingVertical: 4,
  },
});

export default SubscriptionScreen;