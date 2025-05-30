import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Text,
  Button,
  Card,
  Surface,
  IconButton,
  useTheme,
  Chip,
  Divider,
  RadioButton
} from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import AudioCompressionService, { AudioCompressionSettings } from '../services/AudioCompressionService';

type RootStackParamList = {
  AudioCompressionSettings: {
    files: Array<{ uri: string; name: string }>;
  };
  AudioCompressionProgress: {
    files: Array<{ uri: string; name: string }>;
    compressionSettings: AudioCompressionSettings;
  };
};

type AudioCompressionSettingsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AudioCompressionSettings'>;
  route: RouteProp<RootStackParamList, 'AudioCompressionSettings'>;
};

export const AudioCompressionSettingsScreen = ({ navigation, route }: AudioCompressionSettingsScreenProps) => {
  const theme = useTheme();
  const { files } = route.params;

  const [selectedPreset, setSelectedPreset] = useState<string>('medium');
  const [customBitrate, setCustomBitrate] = useState<number>(128);
  const [customSampleRate, setCustomSampleRate] = useState<number>(44100);
  const [customFormat, setCustomFormat] = useState<'mp3' | 'aac'>('mp3');
  const [useCustomSettings, setUseCustomSettings] = useState(false);
  const [fileSizes, setFileSizes] = useState<{ [key: string]: number }>({});

  const qualityPresets = AudioCompressionService.getQualityPresets();

  // Load file sizes
  const loadFileSizes = async () => {
    const sizes: { [key: string]: number } = {};
    for (const file of files) {
      try {
        const fileInfo = await FileSystem.getInfoAsync(file.uri);
        if (fileInfo.exists && fileInfo.size) {
          sizes[file.uri] = fileInfo.size;
        } else {
          sizes[file.uri] = 5 * 1024 * 1024; // 5MB default
        }
      } catch (error) {
        console.error('Error getting file size:', error);
        sizes[file.uri] = 5 * 1024 * 1024; // 5MB default
      }
    }
    setFileSizes(sizes);
  };

  // Load file sizes on component mount
  useEffect(() => {
    loadFileSizes();
  }, [files]);

  const getCurrentSettings = (): AudioCompressionSettings => {
    if (useCustomSettings) {
      return {
        bitrate: customBitrate,
        sampleRate: customSampleRate,
        format: customFormat,
        quality: 'medium' // Default for custom
      };
    }
    return qualityPresets[selectedPreset];
  };

  const getEstimatedSizes = () => {
    const settings = getCurrentSettings();
    const estimatedReduction = AudioCompressionService.getEstimatedCompressionRatio(settings);

    return files.map(file => {
      const originalSize = fileSizes[file.uri] || 5 * 1024 * 1024; // Use real size or 5MB default
      const estimatedCompressedSize = originalSize * (1 - estimatedReduction / 100);

      return {
        fileName: file.name,
        originalSize,
        compressedSize: estimatedCompressedSize,
        reduction: estimatedReduction
      };
    });
  };

  const handleStartCompression = async () => {
    // Request media library permission first
    const hasPermission = await AudioCompressionService.checkMediaLibraryPermissions();
    if (!hasPermission) {
      // Show a nice explanation dialog
      Alert.alert(
        'Music Library Access',
        'ConvertPro needs access to your music library to save compressed audio files. This allows you to easily find and play your compressed audio.',
        [
          {
            text: 'Not Now',
            style: 'cancel',
            onPress: () => {
              // Continue without permission (will save to app directory)
              const settings = getCurrentSettings();
              navigation.navigate('AudioCompressionProgress', {
                files,
                compressionSettings: settings
              });
            }
          },
          {
            text: 'Allow Access',
            onPress: async () => {
              const granted = await AudioCompressionService.requestMediaLibraryPermission();
              const settings = getCurrentSettings();
              navigation.navigate('AudioCompressionProgress', {
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
    navigation.navigate('AudioCompressionProgress', {
      files,
      compressionSettings: settings
    });
  };

  const estimatedSizes = getEstimatedSizes();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.innerContainer}>
        {/* Header */}
        <Surface style={styles.headerCard} elevation={1}>
          <View style={styles.headerContent}>
            <IconButton
              icon="arrow-left"
              size={24}
              onPress={() => navigation.goBack()}
              iconColor={theme.colors.onSurface}
            />
            <View style={styles.headerText}>
              <Text variant="headlineSmall" style={styles.title}>
                Audio Compression
              </Text>
              <Text variant="bodyMedium" style={styles.subtitle}>
                Reduce file size while maintaining quality
              </Text>
            </View>
          </View>
        </Surface>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* File Info */}
          <Card style={styles.card}>
            <Card.Title
              title="Selected Files"
              left={(props) => <IconButton icon="music-note" {...props} />}
            />
            <Card.Content>
              <Text variant="bodyMedium" style={styles.fileCount}>
                {files.length} audio file{files.length > 1 ? 's' : ''} selected
              </Text>
              {files.slice(0, 3).map((file, index) => (
                <Chip key={index} style={styles.fileChip} textStyle={styles.chipText}>
                  {file.name}
                </Chip>
              ))}
              {files.length > 3 && (
                <Text variant="bodySmall" style={styles.moreFiles}>
                  +{files.length - 3} more files
                </Text>
              )}
            </Card.Content>
          </Card>

          {/* Quality Presets */}
          <Card style={styles.card}>
            <Card.Title
              title="Compression Settings"
              left={(props) => <IconButton icon="tune" {...props} />}
            />
            <Card.Content>
              <RadioButton.Group
                onValueChange={(value) => {
                  if (value === 'custom') {
                    setUseCustomSettings(true);
                  } else {
                    setUseCustomSettings(false);
                    setSelectedPreset(value);
                  }
                }}
                value={useCustomSettings ? 'custom' : selectedPreset}
              >
                {Object.entries(qualityPresets).map(([key, preset]) => (
                  <RadioButton.Item
                    key={key}
                    label={`${key.charAt(0).toUpperCase() + key.slice(1)} (${(preset as AudioCompressionSettings).bitrate}k, ${(preset as AudioCompressionSettings).format.toUpperCase()})`}
                    value={key}
                    style={styles.radioItem}
                    labelStyle={styles.radioLabel}
                  />
                ))}
                <RadioButton.Item
                  label="Custom Settings"
                  value="custom"
                  style={styles.radioItem}
                  labelStyle={styles.radioLabel}
                />
              </RadioButton.Group>

              {useCustomSettings && (
                <>
                  <Divider style={styles.divider} />
                  <Text variant="titleSmall" style={styles.customTitle}>
                    Custom Settings
                  </Text>

                  {/* Format Selection */}
                  <Text variant="bodyMedium" style={styles.settingLabel}>
                    Output Format
                  </Text>
                  <RadioButton.Group
                    onValueChange={(value) => setCustomFormat(value as 'mp3' | 'aac')}
                    value={customFormat}
                  >
                    <RadioButton.Item
                      label="MP3"
                      value="mp3"
                      style={styles.radioItem}
                      labelStyle={styles.radioLabel}
                    />
                    <RadioButton.Item
                      label="AAC"
                      value="aac"
                      style={styles.radioItem}
                      labelStyle={styles.radioLabel}
                    />
                  </RadioButton.Group>

                  {/* Bitrate Selection */}
                  <Text variant="bodyMedium" style={styles.settingLabel}>
                    Bitrate
                  </Text>
                  <RadioButton.Group
                    onValueChange={(value) => setCustomBitrate(parseInt(value))}
                    value={customBitrate.toString()}
                  >
                    {[64, 128, 192, 256, 320].map((bitrate) => (
                      <RadioButton.Item
                        key={bitrate}
                        label={`${bitrate} kbps`}
                        value={bitrate.toString()}
                        style={styles.radioItem}
                        labelStyle={styles.radioLabel}
                      />
                    ))}
                  </RadioButton.Group>

                  {/* Sample Rate Selection */}
                  <Text variant="bodyMedium" style={styles.settingLabel}>
                    Sample Rate
                  </Text>
                  <RadioButton.Group
                    onValueChange={(value) => setCustomSampleRate(parseInt(value))}
                    value={customSampleRate.toString()}
                  >
                    {[22050, 44100, 48000].map((rate) => (
                      <RadioButton.Item
                        key={rate}
                        label={`${rate} Hz`}
                        value={rate.toString()}
                        style={styles.radioItem}
                        labelStyle={styles.radioLabel}
                      />
                    ))}
                  </RadioButton.Group>
                </>
              )}
            </Card.Content>
          </Card>

          {/* Estimated Results */}
          <Card style={styles.card}>
            <Card.Title
              title="Estimated Results"
              left={(props) => <IconButton icon="chart-line" {...props} />}
            />
            <Card.Content>
              {estimatedSizes.slice(0, 2).map((estimate, index) => (
                <View key={index} style={styles.estimateRow}>
                  <Text variant="bodyMedium" style={styles.fileName} numberOfLines={1}>
                    {estimate.fileName}
                  </Text>
                  <View style={styles.sizeInfo}>
                    <Text variant="bodySmall" style={styles.sizeText}>
                      ~{AudioCompressionService.formatFileSize(estimate.originalSize)} → {AudioCompressionService.formatFileSize(estimate.compressedSize)}
                    </Text>
                    <Text variant="bodySmall" style={styles.reductionText}>
                      -{estimate.reduction.toFixed(0)}%
                    </Text>
                  </View>
                </View>
              ))}
              {files.length > 2 && (
                <Text variant="bodySmall" style={styles.moreEstimates}>
                  Estimates for {files.length - 2} more files...
                </Text>
              )}
            </Card.Content>
          </Card>
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Button
            mode="outlined"
            onPress={() => navigation.goBack()}
            style={styles.button}
            icon="arrow-left"
          >
            Back
          </Button>
          <Button
            mode="contained"
            onPress={handleStartCompression}
            style={styles.button}
            icon="play"
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
    backgroundColor: '#121212',
  },
  innerContainer: {
    flex: 1,
  },
  headerCard: {
    margin: 16,
    backgroundColor: '#1E1E1E',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  headerText: {
    flex: 1,
    marginLeft: 8,
  },
  title: {
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subtitle: {
    opacity: 0.7,
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  card: {
    marginBottom: 16,
    backgroundColor: '#1E1E1E',
  },
  fileCount: {
    marginBottom: 12,
    color: '#FFFFFF',
  },
  fileChip: {
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#333333',
  },
  chipText: {
    color: '#FFFFFF',
  },
  moreFiles: {
    opacity: 0.7,
    color: '#FFFFFF',
  },
  radioItem: {
    paddingVertical: 4,
  },
  radioLabel: {
    color: '#FFFFFF',
  },
  divider: {
    marginVertical: 16,
  },
  customTitle: {
    marginBottom: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  settingLabel: {
    marginTop: 16,
    marginBottom: 8,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  estimateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 4,
  },
  fileName: {
    flex: 1,
    marginRight: 12,
    color: '#FFFFFF',
  },
  sizeInfo: {
    alignItems: 'flex-end',
  },
  sizeText: {
    color: '#FFFFFF',
    opacity: 0.8,
  },
  reductionText: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  moreEstimates: {
    textAlign: 'center',
    opacity: 0.7,
    marginTop: 8,
    color: '#FFFFFF',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 12,
    backgroundColor: '#121212',
    borderTopWidth: 1,
    borderTopColor: '#333333',
    gap: 12,
  },
  button: {
    flex: 1,
  },
});

export default AudioCompressionSettingsScreen;
