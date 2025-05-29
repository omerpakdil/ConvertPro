import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Platform, Alert, StatusBar as ReactNativeStatusBar } from 'react-native';
import {
  Text,
  Button,
  useTheme,
  Surface,
  IconButton,
  RadioButton,
  Divider,
  Card,
  Chip,
  ActivityIndicator
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider'; // Kurulumu gerekebilir
import { StatusBar } from 'expo-status-bar'; // Kurulumu gerekebilir
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import {
  RootStackParamList,
  conversionOptions, // Directly import conversionOptions
  MediaType,
  FileItem,       // Import FileItem
  FormatOption    // Import FormatOption
} from '../types';

// FormatOption is now imported from '../types'

// FileItem is now imported from '../types'

// conversionOptions is now imported from '../types'
// The mockConversionOptions fallback is removed as conversionOptions is directly imported.

// Placeholder for MediaConverter.getFileInfo
const mockGetFileInfo = async (fileUri: string) => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({ size: Math.floor(Math.random() * 10000000) + 100000, modificationTime: Date.now() });
    }, 500);
  });
};


type GenericConversionSettingsScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'GenericConversionSettings'
>;
type GenericConversionSettingsScreenRouteProp = RouteProp<
  RootStackParamList,
  'GenericConversionSettings'
>;

type GenericConversionSettingsScreenProps = {
  navigation: GenericConversionSettingsScreenNavigationProp;
  route: GenericConversionSettingsScreenRouteProp;
};

export const GenericConversionSettingsScreen = ({ navigation, route }: GenericConversionSettingsScreenProps) => {
  const theme = useTheme();
  const { files, conversionType } = route.params;

  // For simplicity, we'll use the first file for displaying info and settings
  const firstFile = files[0] || { uri: 'mock/uri/sample.jpg', name: 'sample.jpg' };
  const fileUri = firstFile.uri;
  const fileName = firstFile.name;

  const formats: FormatOption[] = conversionOptions[conversionType as MediaType] || conversionOptions.image; // Fallback to image

  const [selectedFormat, setSelectedFormat] = useState<string>(formats[0].id);
  const [selectedQuality, setSelectedQuality] = useState<number | undefined>(() => {
    const initialFormat = formats[0];
    if (initialFormat?.quality) {
      if (Array.isArray(initialFormat.quality) && initialFormat.quality.length > 0) {
        return initialFormat.quality[0]; // Default to the first bitrate/option in the list
      } else if (typeof initialFormat.quality === 'boolean') {
        return 75; // Default quality 75% for images
      }
    }
    return undefined;
  });
  const [fileInfo, setFileInfo] = useState<{ size: number, modificationTime: number } | null>(null);
  const [isLoadingFileInfo, setIsLoadingFileInfo] = useState(true);

  const formatObj: FormatOption | undefined = formats.find(f => f.id === selectedFormat);

  useEffect(() => {
    const loadFileInfo = async () => {
      try {
        setIsLoadingFileInfo(true);
        // @ts-ignore
        const info = await mockGetFileInfo(fileUri);
        // @ts-ignore
        setFileInfo(info);
      } catch (error) {
        console.error('Error getting file info:', error);
        Alert.alert('Error', 'Could not load file information');
      } finally {
        setIsLoadingFileInfo(false);
      }
    };
    if (fileUri) {
      loadFileInfo();
    } else {
      setIsLoadingFileInfo(false);
    }
  }, [fileUri]);

  const getFileExtension = (filename: string) => {
    return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2).toLowerCase();
  };

  const getOutputFileName = (inputFileName: string, outputFormatExt: string | undefined) => {
    const baseName = inputFileName.substring(0, inputFileName.lastIndexOf('.'));
    return `${baseName}.${outputFormatExt || 'out'}`;
  };

  const formatFileSize = (size: number): string => {
    if (size === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(size) / Math.log(k));
    return parseFloat((size / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleConvert = () => {
    if (files.length === 0) {
        Alert.alert("No files", "No files to convert.");
        return;
    }
    // For this task, we pass all files and the selected settings.
    // The progress screen would then handle them (e.g., one by one or in batch).
   navigation.navigate('GenericConversionProgress', {
     files: files.map((file: FileItem) => ({
       uri: file.uri,
       name: file.name,
        outputName: getOutputFileName(file.name, formatObj?.extension),
      })),
      outputFormatId: selectedFormat,
      outputFormatExtension: formatObj?.extension || '',
      quality: selectedQuality,
      conversionType
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar style={theme.dark ? "light" : "dark"} backgroundColor={theme.colors.background} />
      <Surface style={styles.header} elevation={0}>
        <View style={styles.headerRow}>
          <IconButton
            icon="arrow-left"
            size={24}
            onPress={() => navigation.goBack()}
            iconColor={theme.colors.onSurface}
          />
          <Text variant="titleLarge" style={[styles.title, { color: theme.colors.onSurface }]}>
            Conversion Settings
          </Text>
        </View>
      </Surface>

      <ScrollView style={styles.content}>
        <Card style={[styles.fileCard, {backgroundColor: theme.colors.surfaceVariant}]}>
          <Card.Content>
            <Text variant="labelLarge" style={[styles.labelText, {color: theme.colors.onSurfaceVariant}]}>
              Input File(s) ({files.length})
            </Text>
            {/* Displaying info for the first file for simplicity */}
            <Text variant="titleMedium" style={[styles.fileNameText, {color: theme.colors.onSurfaceVariant}]}>
              {fileName} {files.length > 1 ? `(+${files.length - 1} more)` : ''}
            </Text>
            <View style={styles.fileInfoRow}>
              <Chip
                icon={conversionType === 'image' ? 'image-outline' :
                     conversionType === 'audio' ? 'music-note-outline' :
                     conversionType === 'video' ? 'video-outline' : 'file-document-outline'}
                style={[styles.chip, {backgroundColor: theme.colors.secondaryContainer}]}
                textStyle={{color: theme.colors.onSecondaryContainer}}
              >
                {getFileExtension(fileName).toUpperCase()}
              </Chip>

              {isLoadingFileInfo ? (
                <ActivityIndicator size="small" style={styles.loader} color={theme.colors.primary} />
              ) : fileInfo ? (
                <Chip
                  icon="harddisk"
                  style={[styles.chip, {backgroundColor: theme.colors.secondaryContainer}]}
                  textStyle={{color: theme.colors.onSecondaryContainer}}
                >
                  {formatFileSize(fileInfo.size)}
                </Chip>
              ) : (
                <Chip
                  icon="alert-circle-outline"
                  style={[styles.chip, {backgroundColor: theme.colors.errorContainer}]}
                  textStyle={{color: theme.colors.onErrorContainer}}
                >
                  Info N/A
                </Chip>
              )}
            </View>
          </Card.Content>
        </Card>

        <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
          Output Format
        </Text>

        <Surface style={[styles.settingsCard, {backgroundColor: theme.colors.surfaceVariant}]} elevation={1}>
          <RadioButton.Group
            onValueChange={(value: string) => {
              setSelectedFormat(value);
              const newFormatObj: FormatOption | undefined = formats.find(f => f.id === value);
              if (newFormatObj?.quality) {
                if (Array.isArray(newFormatObj.quality) && newFormatObj.quality.length > 0) {
                  setSelectedQuality(newFormatObj.quality[0]); // Default to first bitrate/option
                } else if (typeof newFormatObj.quality === 'boolean') {
                  setSelectedQuality(75); // Default image quality
                } else {
                  setSelectedQuality(undefined); // Should not happen if quality is boolean or array
                }
              } else {
                setSelectedQuality(undefined); // No quality setting for this format
              }
            }}
            value={selectedFormat}
          >
            {formats.map((format: FormatOption) => (
              <RadioButton.Item
                key={format.id}
                label={`${format.name} (.${format.extension})`}
                value={format.id}
                style={styles.radioItem}
                labelStyle={{color: theme.colors.onSurfaceVariant}}
                color={theme.colors.primary}
                uncheckedColor={theme.colors.onSurfaceVariant}
              />
            ))}
          </RadioButton.Group>
        </Surface>

        {formatObj?.quality && (
          <>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
              {conversionType === 'audio' && Array.isArray(formatObj.quality) ? 'Audio Bitrate' :
               conversionType === 'image' && typeof formatObj.quality === 'boolean' ? 'Image Quality' :
               'Quality Settings'}
            </Text>

            <Surface style={[styles.settingsCard, {backgroundColor: theme.colors.surfaceVariant}]} elevation={1}>
              {conversionType === 'audio' && Array.isArray(formatObj.quality) && formatObj.quality.length > 0 && (
                <>
                  <Text variant="bodyMedium" style={[styles.sliderLabel, {color: theme.colors.onSurfaceVariant}]}>
                    Bitrate: {selectedQuality} kbps
                  </Text>
                  <RadioButton.Group
                    onValueChange={(value: string) => setSelectedQuality(parseInt(value, 10))}
                    value={selectedQuality?.toString() || formatObj.quality[0].toString()}
                  >
                    {formatObj.quality.map((bitrate: number) => (
                      <RadioButton.Item
                        key={bitrate}
                        label={`${bitrate} kbps`}
                        value={bitrate.toString()}
                        style={styles.radioItem}
                        labelStyle={{color: theme.colors.onSurfaceVariant}}
                        color={theme.colors.primary}
                        uncheckedColor={theme.colors.onSurfaceVariant}
                      />
                    ))}
                  </RadioButton.Group>
                </>
              )}

              {conversionType === 'image' && typeof formatObj.quality === 'boolean' && formatObj.quality === true && (
                <>
                  <Text variant="bodyMedium" style={[styles.sliderLabel, {color: theme.colors.onSurfaceVariant}]}>
                    Image Quality ({selectedQuality}%)
                  </Text>
                  <View style={styles.sliderContainer}>
                    <Slider
                      value={selectedQuality || 0}
                      minimumValue={0}
                      maximumValue={100}
                      step={1}
                      onValueChange={(value: number) => setSelectedQuality(Math.round(value))}
                      style={styles.slider}
                      minimumTrackTintColor={theme.colors.primary}
                      maximumTrackTintColor={theme.colors.outline}
                      thumbTintColor={theme.colors.primary}
                    />
                    <View style={styles.qualityLabels}>
                      <Text variant="labelSmall" style={{color: theme.colors.onSurfaceVariant}}>0</Text>
                      <Text variant="labelSmall" style={{color: theme.colors.onSurfaceVariant}}>100</Text>
                    </View>
                  </View>
                </>
              )}
              {/* Placeholder for other conversion types like video if they use a slider or specific options */}
            </Surface>
          </>
        )}

        <View style={styles.outputPreview}>
          <Text variant="labelLarge" style={[styles.labelText, {color: theme.colors.onBackground}]}>Output File Name (Example)</Text>
          <Text variant="titleMedium" style={[styles.fileNameText, {color: theme.colors.onBackground}]}>
            {getOutputFileName(fileName, formatObj?.extension)}
          </Text>
        </View>
      </ScrollView>

      {/* Fixed Convert Button at bottom */}
      <View style={[styles.bottomContainer, { backgroundColor: theme.colors.background }]}>
        <Button
          mode="contained"
          onPress={handleConvert}
          style={styles.convertButton}
          icon="sync"
          disabled={isLoadingFileInfo || files.length === 0}
        >
          Convert {files.length > 1 ? `${files.length} Files` : 'Now'}
        </Button>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'android' ? ReactNativeStatusBar.currentHeight : 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  title: {
    fontWeight: 'bold',
    marginLeft: 16,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  fileCard: {
    borderRadius: 12,
    marginBottom: 24,
  },
  chip: {
    marginTop: 8,
    marginRight: 8, // Added margin for spacing between chips
    alignSelf: 'flex-start',
  },
  labelText: {
    opacity: 0.7,
    marginBottom: 4,
  },
  fileNameText: {
    fontWeight: 'bold',
  },
  sectionTitle: {
    marginTop: 8, // Added for spacing from card above
    marginBottom: 12,
  },
  settingsCard: {
    borderRadius: 12,
    paddingVertical: 8, // Adjusted padding
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  radioItem: {
    paddingVertical: 4, // Reduced padding
  },
  sliderLabel: {
    marginTop: 8, // Added margin
    marginBottom: 16,
    textAlign: 'center',
  },
  sliderContainer: {
    paddingHorizontal: 8,
    marginBottom: 8, // Added margin
  },
  slider: {
    height: 40,
  },
  qualityLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8, // Added padding to align with slider
  },
  outputPreview: {
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
    // backgroundColor: theme.colors.surface, // Let theme handle it or set explicitly
  },
  bottomContainer: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 50 : 45, // More space for home indicator/navigation bar
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  convertButton: {
    paddingVertical: 8,
  },
  fileInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap', // Allow chips to wrap
  },
  loader: {
    marginLeft: 10, // Spacing for loader
  },
});

export default GenericConversionSettingsScreen;