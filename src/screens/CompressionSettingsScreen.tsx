import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Text,
  Button,
  Card,
  SegmentedButtons,
  Surface,
  IconButton,
  useTheme,
  Chip,
  Divider
} from 'react-native-paper';
import Slider from '@react-native-community/slider';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import CompressionService, { CompressionSettings, CompressionPreset } from '../services/CompressionService';

type RootStackParamList = {
  CompressionSettings: {
    files: Array<{ uri: string; name: string }>;
  };
  CompressionProgress: {
    files: Array<{ uri: string; name: string }>;
    compressionSettings: CompressionSettings;
  };
};

type CompressionSettingsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'CompressionSettings'>;
type CompressionSettingsScreenRouteProp = RouteProp<RootStackParamList, 'CompressionSettings'>;

type CompressionSettingsScreenProps = {
  navigation: CompressionSettingsScreenNavigationProp;
  route: CompressionSettingsScreenRouteProp;
};

export const CompressionSettingsScreen = ({ navigation, route }: CompressionSettingsScreenProps) => {
  const theme = useTheme();
  const { files } = route.params;

  const [selectedPreset, setSelectedPreset] = useState<string>('balanced');
  const [customSettings, setCustomSettings] = useState<CompressionSettings>({
    quality: 70,
    maxWidth: 1920,
    format: 'jpeg'
  });
  const [useCustomSettings, setUseCustomSettings] = useState(false);

  // Get current settings (preset or custom)
  const getCurrentSettings = (): CompressionSettings => {
    if (useCustomSettings) {
      return customSettings;
    }
    const preset = CompressionService.PRESETS.find(p => p.id === selectedPreset);
    return preset?.settings || CompressionService.PRESETS[1].settings; // Default to balanced
  };

  // State for real file sizes
  const [fileSizes, setFileSizes] = useState<{ [key: string]: number }>({});
  const [isLoadingSizes, setIsLoadingSizes] = useState(true);

  // Load real file sizes when component mounts
  useEffect(() => {
    const loadFileSizes = async () => {
      setIsLoadingSizes(true);
      const sizes: { [key: string]: number } = {};

      for (const file of files) {
        try {
          const size = await CompressionService.getFileSize(file.uri);
          sizes[file.uri] = size;
        } catch (error) {
          console.error(`Error getting size for ${file.name}:`, error);
          sizes[file.uri] = 2 * 1024 * 1024; // Fallback to 2MB
        }
      }

      setFileSizes(sizes);
      setIsLoadingSizes(false);
    };

    loadFileSizes();
  }, [files]);

  // Calculate estimated file sizes with real data
  const getEstimatedSizes = () => {
    const settings = getCurrentSettings();
    return files.map(file => {
      const originalSize = fileSizes[file.uri] || 2 * 1024 * 1024; // Fallback to 2MB
      const estimatedCompressedSize = CompressionService.estimateCompressedSize(originalSize, settings);
      return {
        fileName: file.name,
        originalSize,
        compressedSize: estimatedCompressedSize,
        reduction: ((originalSize - estimatedCompressedSize) / originalSize) * 100
      };
    });
  };

  const handleStartCompression = async () => {
    // Request media library permission first
    const hasPermission = await CompressionService.checkMediaLibraryPermissions();
    if (!hasPermission) {
      // Show a nice explanation dialog
      Alert.alert(
        'Photo Library Access',
        'ConvertPro needs access to your photo library to save compressed images. This allows you to easily find and share your compressed photos.',
        [
          {
            text: 'Not Now',
            style: 'cancel',
            onPress: () => {
              // Continue without permission (will save to app directory)
              const settings = getCurrentSettings();
              navigation.navigate('CompressionProgress', {
                files,
                compressionSettings: settings
              });
            }
          },
          {
            text: 'Allow Access',
            onPress: async () => {
              const granted = await CompressionService.requestMediaLibraryPermission();
              const settings = getCurrentSettings();
              navigation.navigate('CompressionProgress', {
                files,
                compressionSettings: settings
              });
            }
          }
        ]
      );
      return;
    }

    const settings = getCurrentSettings();
    navigation.navigate('CompressionProgress', {
      files,
      compressionSettings: settings
    });
  };

  const estimatedSizes = getEstimatedSizes();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.innerContainer}>
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        <Surface style={styles.headerCard} elevation={1}>
          <Text variant="headlineSmall" style={styles.title}>
            Compression Settings
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            {files.length} image{files.length > 1 ? 's' : ''} selected for compression
          </Text>
        </Surface>

      {/* Preset Selection */}
      <Card style={styles.card}>
        <Card.Title title="Compression Presets" left={(props) => <IconButton icon="tune" {...props} />} />
        <Card.Content>
          <View style={styles.presetsContainer}>
            {CompressionService.PRESETS.map((preset) => (
              <Chip
                key={preset.id}
                selected={selectedPreset === preset.id && !useCustomSettings}
                onPress={() => {
                  setSelectedPreset(preset.id);
                  setUseCustomSettings(false);
                }}
                style={styles.presetChip}
                icon="image"
              >
                {preset.name}
              </Chip>
            ))}
          </View>

          {selectedPreset && !useCustomSettings && (
            <View style={styles.presetDescription}>
              <Text variant="bodySmall" style={styles.descriptionText}>
                {CompressionService.PRESETS.find(p => p.id === selectedPreset)?.description}
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Custom Settings */}
      <Card style={styles.card}>
        <Card.Title
          title="Custom Settings"
          left={(props) => <IconButton icon="cog" {...props} />}
          right={() => (
            <Button
              mode={useCustomSettings ? "contained" : "outlined"}
              onPress={() => setUseCustomSettings(!useCustomSettings)}
              compact
              style={styles.useCustomButton}
            >
              {useCustomSettings ? "Using Custom" : "Use Custom"}
            </Button>
          )}
        />
        <Card.Content>

          {useCustomSettings && (
            <>
              <View style={styles.settingRow}>
                <Text variant="bodyMedium">Quality: {customSettings.quality}%</Text>
                <Slider
                  style={styles.slider}
                  value={customSettings.quality}
                  onValueChange={(value: number) => setCustomSettings({...customSettings, quality: Math.round(value)})}
                  minimumValue={10}
                  maximumValue={100}
                  step={5}
                />
              </View>

              <View style={styles.settingRow}>
                <Text variant="bodyMedium">Max Width: {customSettings.maxWidth}px</Text>
                <SegmentedButtons
                  value={customSettings.maxWidth?.toString() || '1920'}
                  onValueChange={(value) => setCustomSettings({...customSettings, maxWidth: parseInt(value)})}
                  buttons={[
                    { value: '800', label: '800px' },
                    { value: '1280', label: '1280px' },
                    { value: '1920', label: '1920px' },
                    { value: '2048', label: '2048px' }
                  ]}
                  style={styles.segmentedButtons}
                />
              </View>

              <View style={styles.settingRow}>
                <Text variant="bodyMedium">Output Format</Text>
                <SegmentedButtons
                  value={customSettings.format || 'jpeg'}
                  onValueChange={(value) => setCustomSettings({...customSettings, format: value as 'jpeg' | 'png' | 'webp'})}
                  buttons={[
                    { value: 'jpeg', label: 'JPEG' },
                    { value: 'png', label: 'PNG' },
                    { value: 'webp', label: 'WebP' }
                  ]}
                  style={styles.segmentedButtons}
                />
              </View>
            </>
          )}
        </Card.Content>
      </Card>

      {/* Size Estimation */}
      <Card style={styles.card}>
        <Card.Title title="Size Estimation" left={(props) => <IconButton icon="chart-line" {...props} />} />
        <Card.Content>
          {estimatedSizes.slice(0, 3).map((estimate, index) => (
            <View key={index} style={styles.estimationRow}>
              <Text variant="bodySmall" numberOfLines={1} style={styles.fileName}>
                {estimate.fileName}
              </Text>
              <View style={styles.sizeInfo}>
                <Text variant="bodySmall" style={styles.originalSize}>
                  {CompressionService.formatFileSize(estimate.originalSize)}
                </Text>
                <Text variant="bodySmall" style={styles.arrow}>→</Text>
                <Text variant="bodySmall" style={styles.compressedSize}>
                  {CompressionService.formatFileSize(estimate.compressedSize)}
                </Text>
                <Text
                  variant="bodySmall"
                  style={[styles.reduction, { color: CompressionService.getCompressionRatioColor(estimate.reduction) }]}
                >
                  -{estimate.reduction.toFixed(0)}%
                </Text>
              </View>
            </View>
          ))}

          {files.length > 3 && (
            <Text variant="bodySmall" style={styles.moreFiles}>
              +{files.length - 3} more files...
            </Text>
          )}
        </Card.Content>
      </Card>
      </ScrollView>

      {/* Fixed Action Buttons at Bottom */}
      <View style={styles.actionButtons}>
        <Button
          mode="outlined"
          onPress={() => navigation.goBack()}
          style={styles.button}
        >
          Back
        </Button>
        <Button
          mode="contained"
          onPress={handleStartCompression}
          style={styles.button}
        >
          Start Compression
        </Button>
      </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212', // Dark background
  },
  innerContainer: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Space for fixed buttons
  },
  headerCard: {
    margin: 16,
    padding: 16,
    backgroundColor: '#1E1E1E', // Dark card background
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#FFFFFF',
  },
  subtitle: {
    opacity: 0.7,
    color: '#FFFFFF',
  },
  card: {
    margin: 16,
    marginTop: 8,
    backgroundColor: '#1E1E1E', // Dark card background
  },
  presetsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  presetChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  presetDescription: {
    marginTop: 8,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.1)', // Light overlay for dark theme
    borderRadius: 8,
  },
  descriptionText: {
    fontStyle: 'italic',
    color: '#FFFFFF',
  },
  settingRow: {
    marginBottom: 20,
  },
  slider: {
    marginTop: 8,
  },
  segmentedButtons: {
    marginTop: 8,
  },
  estimationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)', // Light border for dark theme
  },
  fileName: {
    flex: 1,
    marginRight: 12,
    color: '#FFFFFF',
  },
  sizeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  originalSize: {
    opacity: 0.7,
    color: '#FFFFFF',
  },
  arrow: {
    opacity: 0.5,
    color: '#FFFFFF',
  },
  compressedSize: {
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  reduction: {
    fontWeight: 'bold',
    minWidth: 40,
    textAlign: 'right',
  },
  moreFiles: {
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.7,
    color: '#FFFFFF',
  },
  actionButtons: {
    position: 'absolute',
    bottom: 12, // Move buttons up from bottom
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 32, // Reduced padding
    backgroundColor: '#121212', // Match container background
    borderTopWidth: 1,
    borderTopColor: '#333333',
    gap: 12,
  },
  button: {
    flex: 1,
  },
  useCustomButton: {
    minWidth: 120,
    marginRight: 12,
  },
});

export default CompressionSettingsScreen;
