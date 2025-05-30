import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Platform, StatusBar, Alert, Image } from 'react-native';
import {
  Text,
  Button,
  useTheme,
  Surface,
  SegmentedButtons,
  Divider,
  Card,
  IconButton,
  List,
  Chip
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../App'; // RootStackParamList App.tsx'den import edilecek
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { validateFiles, MediaType } from '../utils/fileValidation';
import { requestAllRequiredPermissions } from '../utils/permissions';
import { handleError } from '../utils/errors';
import ConversionHistoryManager, { ConversionHistoryItem } from '../utils/conversionHistory';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

type HomeScreenProps = {
  navigation: HomeScreenNavigationProp;
};

export const HomeScreen = ({ navigation }: HomeScreenProps) => {
  const theme = useTheme();
  const [operationType, setOperationType] = useState<'format' | 'compress'>('format');
  const [mediaType, setMediaType] = useState<'image' | 'audio' | 'video'>('image');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Array<{ uri: string; name: string }>>([]);
  const [recentConversions, setRecentConversions] = useState<ConversionHistoryItem[]>([]);



  // Request permissions using new permission system
  const requestPermissions = async (): Promise<boolean> => {
    try {
      // For compress operation, we need image permissions
      const permissionType = operationType === 'compress' ? 'image' : mediaType;
      const { allGranted } = await requestAllRequiredPermissions(permissionType, true);
      return allGranted;
    } catch (error) {
      const appError = handleError(error, 'requestPermissions');
      Alert.alert('Permission Error', appError.userMessage);
      return false;
    }
  };

  // Handle file selection - now supports multiple files
  const handleSelectFile = async () => {
    try {
      setIsLoading(true);

      // Request permissions
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        return;
      }

      let rawFiles: Array<{ uri: string; name: string }> = [];

      // File selection based on type
      const currentMediaType = operationType === 'compress' && mediaType === 'image' ? 'image' : mediaType;

      if (currentMediaType === 'image') {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: 'images',
          allowsEditing: false,
          quality: 1,
          allowsMultipleSelection: true, // Enable multiple selection for images
        });

        if (result.canceled || !result.assets || result.assets.length === 0) {
          return;
        }

        rawFiles = result.assets.map(asset => ({
          uri: asset.uri,
          name: asset.fileName || asset.uri.split('/').pop() || 'unknown.image'
        }));

      } else if (currentMediaType === 'audio') {
        // For audio files, use DocumentPicker
        const result = await DocumentPicker.getDocumentAsync({
          type: ['audio/*'],
          multiple: true,
          copyToCacheDirectory: false
        });

        if (result.canceled || !result.assets || result.assets.length === 0) {
          return;
        }

        rawFiles = result.assets.map((asset: any) => ({
          uri: asset.uri,
          name: asset.name || asset.uri.split('/').pop() || 'unknown.audio'
        }));

      } else if (currentMediaType === 'video') {
        // For video files, use ImagePicker
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: 'videos',
          allowsMultipleSelection: true,
          quality: 1,
        });

        if (result.canceled || !result.assets || result.assets.length === 0) {
          return;
        }

        rawFiles = result.assets.map(asset => ({
          uri: asset.uri,
          name: asset.uri.split('/').pop() || 'unknown.video'
        }));
      }

      // Validate selected files
      const { validFiles, invalidFiles } = await validateFiles(rawFiles, currentMediaType as MediaType);

      // Show errors for invalid files
      if (invalidFiles.length > 0) {
        const errorMessages = invalidFiles.map(({ file, error }) =>
          `${file.name}: ${error.userMessage}`
        ).join('\n');

        Alert.alert(
          'File Validation Error',
          `Some files could not be processed:\n\n${errorMessages}`,
          [{ text: 'OK' }]
        );
      }

      // Add valid files to selected files list
      if (validFiles.length > 0) {
        setSelectedFiles(prevFiles => [...prevFiles, ...validFiles]);
      } else if (invalidFiles.length > 0) {
        // All files were invalid
        Alert.alert(
          'No Valid Files',
          'None of the selected files could be processed. Please choose different files.',
          [{ text: 'OK' }]
        );
      }

    } catch (error) {
      const appError = handleError(error, 'handleSelectFile');
      Alert.alert('File Selection Error', appError.userMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Remove file from selected files
  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  };

  // Clear all selected files
  const handleClearFiles = () => {
    setSelectedFiles([]);
  };

  // Navigate to conversion settings
  const handleProceedToConversion = () => {
    if (selectedFiles.length === 0) {
      Alert.alert('No Files Selected', 'Please select at least one file to proceed.');
      return;
    }

    if (operationType === 'compress') {
      // Check if it's audio compression or image compression
      if (mediaType === 'audio') {
        navigation.navigate('AudioCompressionSettings', {
          files: selectedFiles
        });
      } else {
        // Default to image compression
        navigation.navigate('CompressionSettings', {
          files: selectedFiles
        });
      }
    } else {
      navigation.navigate('GenericConversionSettings', {
        files: selectedFiles,
        conversionType: mediaType
      });
    }
  };

  // Reset selected files when operation or media type changes
  const handleOperationTypeChange = (newType: 'format' | 'compress') => {
    setOperationType(newType);
    setSelectedFiles([]); // Clear selected files when type changes
  };

  const handleMediaTypeChange = (newType: 'image' | 'audio' | 'video') => {
    setMediaType(newType);
    setSelectedFiles([]); // Clear selected files when type changes
  };

  // Load recent conversions
  const loadRecentConversions = async () => {
    try {
      const recent = await ConversionHistoryManager.getRecentConversions(3);
      setRecentConversions(recent);
    } catch (error) {
      console.error('Error loading recent conversions:', error);
    }
  };

  // Handle file sharing from recent conversions
  const handleShareFromHistory = async (conversion: ConversionHistoryItem) => {
    try {
      if (!conversion.success || !conversion.outputPath) {
        Alert.alert('Share Error', 'This file cannot be shared because the conversion failed or the file path is not available.');
        return;
      }

      console.log('📤 Sharing file from history:', conversion.outputPath, conversion.outputFileName);

      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Share Not Available', 'Sharing is not available on this device.');
        return;
      }

      // For media library URIs, we need to copy to a temporary location first
      let shareUri = conversion.outputPath;

      if (conversion.outputPath.startsWith('ph://') || conversion.outputPath.startsWith('content://')) {
        // This is a media library URI, copy to temporary location
        const tempPath = `${FileSystem.cacheDirectory}${conversion.outputFileName}`;

        try {
          await FileSystem.copyAsync({
            from: conversion.outputPath,
            to: tempPath
          });
          shareUri = tempPath;
        } catch (copyError) {
          console.error('Error copying file for sharing:', copyError);
          Alert.alert('Share Error', 'Could not prepare file for sharing.');
          return;
        }
      }

      // Share the file
      await Sharing.shareAsync(shareUri, {
        mimeType: getMimeTypeFromExtension(conversion.outputFileName),
        dialogTitle: `Share ${conversion.outputFileName}`,
        UTI: getUTIFromExtension(conversion.outputFileName)
      });

    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Share Error', 'An error occurred while sharing the file.');
    }
  };

  // Helper function to get MIME type from file extension
  const getMimeTypeFromExtension = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'webp':
        return 'image/webp';
      case 'mp3':
        return 'audio/mpeg';
      case 'wav':
        return 'audio/wav';
      case 'aac':
        return 'audio/aac';
      case 'flac':
        return 'audio/flac';
      case 'mp4':
        return 'video/mp4';
      case 'avi':
        return 'video/avi';
      case 'mov':
        return 'video/quicktime';
      case 'mkv':
        return 'video/x-matroska';
      default:
        return 'application/octet-stream';
    }
  };

  // Helper function to get UTI from file extension (iOS)
  const getUTIFromExtension = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        return 'public.jpeg';
      case 'png':
        return 'public.png';
      case 'webp':
        return 'org.webmproject.webp';
      case 'mp3':
        return 'public.mp3';
      case 'wav':
        return 'com.microsoft.waveform-audio';
      case 'aac':
        return 'public.aac-audio';
      case 'flac':
        return 'org.xiph.flac';
      case 'mp4':
        return 'public.mpeg-4';
      case 'avi':
        return 'public.avi';
      case 'mov':
        return 'com.apple.quicktime-movie';
      case 'mkv':
        return 'org.matroska.mkv';
      default:
        return 'public.data';
    }
  };

  // Load recent conversions on component mount
  useEffect(() => {
    loadRecentConversions();
  }, []);

  // Clear selected files when screen comes into focus (user returns from other screens)
  useFocusEffect(
    React.useCallback(() => {
      // Clear selected files when returning to home screen
      setSelectedFiles([]);
      // Reload recent conversions when returning to home screen
      loadRecentConversions();
    }, [])
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ExpoStatusBar style={theme.dark ? "light" : "dark"} backgroundColor={theme.colors.background} />
      <Surface style={styles.header} elevation={0}>
        <View style={styles.headerContent}>
          <View style={styles.headerText}>
            <Text variant="headlineMedium" style={styles.title}>ConvertPro</Text>
            <Text variant="bodyMedium" style={styles.subtitle}>Convert media files offline</Text>
          </View>
          <IconButton
            icon="crown"
            iconColor="#FFD700"
            size={28}
            onPress={() => navigation.navigate('Subscription')}
            style={styles.premiumButton}
          />
        </View>
      </Surface>

      <ScrollView style={styles.content}>
        {/* Operation Type Selection */}
        <Surface style={styles.card} elevation={1}>
          <Text variant="titleMedium" style={styles.cardTitle}>
            Choose Operation
          </Text>
          <SegmentedButtons
            value={operationType}
            onValueChange={handleOperationTypeChange}
            buttons={[
              {
                value: 'format',
                icon: 'swap-horizontal',
                label: 'Format Conversion',
              },
              {
                value: 'compress',
                icon: 'archive-arrow-down',
                label: 'Compress Files',
              },
            ]}
            style={styles.segmentedButton}
          />
          <Text variant="bodySmall" style={styles.operationDescription}>
            {operationType === 'format'
              ? 'Convert files between different formats (JPEG, PNG, MP3, etc.)'
              : 'Reduce file size while maintaining quality'
            }
          </Text>
        </Surface>

        {/* Media Type Selection */}
        <Surface style={styles.card} elevation={1}>
          <Text variant="titleMedium" style={styles.cardTitle}>
            Choose Media Type
          </Text>
          <SegmentedButtons
            value={mediaType}
            onValueChange={handleMediaTypeChange}
            buttons={[
              {
                value: 'image',
                icon: 'image',
                label: 'Image',
              },
              {
                value: 'audio',
                icon: 'music-note',
                label: 'Audio',
              },
              {
                value: 'video',
                icon: 'video',
                label: 'Video',
              },
            ]}
            style={styles.segmentedButton}
          />
          <Text variant="bodySmall" style={styles.operationDescription}>
            {operationType === 'format'
              ? 'Select the type of media files you want to convert'
              : operationType === 'compress' && mediaType === 'image'
              ? 'Compress image files (JPEG, PNG, WebP)'
              : operationType === 'compress' && mediaType === 'audio'
              ? 'Compress audio files (MP3, AAC, FLAC)'
              : 'Select media type for compression'
            }
          </Text>
        </Surface>

        <Divider style={styles.divider} />

        {/* File Selection */}
        <Surface style={styles.card} elevation={1}>
          <Text variant="titleMedium" style={styles.cardTitle}>
            Select {mediaType} file(s) to {operationType === 'compress' ? 'compress' : 'convert'}
          </Text>
          <Text variant="bodyMedium" style={styles.cardText}>
            {operationType === 'compress' && mediaType === 'image' && 'Reduce file size while maintaining quality: JPEG, PNG, WebP'}
            {operationType === 'compress' && mediaType === 'audio' && 'Reduce file size while maintaining quality: MP3, AAC, FLAC'}
            {operationType === 'format' && mediaType === 'image' && 'Supported formats: WebP, HEIC, BMP, PNG, JPEG, TIFF, SVG, RAW'}
            {operationType === 'format' && mediaType === 'audio' && 'Supported formats: FLAC, WAV, MP3, AAC, OGG, M4A, ALAC'}
            {operationType === 'format' && mediaType === 'video' && 'Supported formats: AVI, MKV, MOV, MP4'}
          </Text>
          <View style={styles.buttonRow}>
            <Button
              mode="contained"
              onPress={handleSelectFile}
              icon="file-upload"
              style={[styles.button, styles.selectButton]}
              loading={isLoading}
              disabled={isLoading}
            >
              {isLoading ? 'Selecting...' : selectedFiles.length > 0 ? 'Add More Files' : 'Select Files'}
            </Button>
            {selectedFiles.length > 0 && (
              <Button
                mode="outlined"
                onPress={handleClearFiles}
                icon="delete"
                style={[styles.button, styles.clearButton]}
                disabled={isLoading}
              >
                Clear All
              </Button>
            )}
          </View>
        </Surface>

        {/* Selected Files Section */}
        {selectedFiles.length > 0 && (
          <Surface style={styles.selectedFilesCard} elevation={1}>
            <View style={styles.selectedFilesHeader}>
              <Text variant="titleMedium" style={styles.cardTitle}>
                Selected Files ({selectedFiles.length})
              </Text>
              <Chip icon="check-circle" style={styles.statusChip}>
                Ready to Convert
              </Chip>
            </View>

            <List.Section style={styles.filesList}>
              {selectedFiles.map((file, index) => (
                <List.Item
                  key={index}
                  title={file.name}
                  description={`File ${index + 1} of ${selectedFiles.length}`}
                  titleNumberOfLines={1}
                  descriptionNumberOfLines={1}
                  left={(props) => {
                    const currentMediaType = operationType === 'compress' && mediaType === 'image' ? 'image' : mediaType;
                    return currentMediaType === 'image' ? (
                      <Image source={{ uri: file.uri }} style={styles.fileThumbnail} />
                    ) : (
                      <List.Icon
                        {...props}
                        icon={
                          currentMediaType === 'audio' ? 'music-note' :
                          currentMediaType === 'video' ? 'video' : 'file'
                        }
                      />
                    );
                  }}
                  right={(props) => (
                    <IconButton
                      {...props}
                      icon="close-circle"
                      size={20}
                      onPress={() => handleRemoveFile(index)}
                      iconColor={theme.colors.error}
                    />
                  )}
                  style={styles.fileListItem}
                />
              ))}
            </List.Section>

            <Button
              mode="contained"
              onPress={handleProceedToConversion}
              icon="arrow-right-circle"
              style={styles.convertButton}
              disabled={selectedFiles.length === 0}
            >
              Convert {selectedFiles.length} File{selectedFiles.length > 1 ? 's' : ''}
            </Button>
          </Surface>
        )}

        <Text variant="titleMedium" style={styles.recentTitle}>Recent Conversions</Text>

        {recentConversions.length > 0 ? (
          recentConversions.map((conversion) => (
            <Card key={conversion.id} style={styles.recentCard}>
              <Card.Title
                title={`${conversion.inputFileName} → ${conversion.outputFileName}`}
                subtitle={`${conversion.conversionType.charAt(0).toUpperCase() + conversion.conversionType.slice(1)} • ${ConversionHistoryManager.formatRelativeTime(conversion.timestamp)}`}
                left={(props) => (
                  <IconButton
                    icon={
                      conversion.conversionType === 'image' ? 'image' :
                      conversion.conversionType === 'audio' ? 'music-note' : 'video'
                    }
                    {...props}
                  />
                )}
                right={(props) => (
                  conversion.success && conversion.outputPath ? (
                    <IconButton
                      icon="share"
                      {...props}
                      onPress={() => handleShareFromHistory(conversion)}
                    />
                  ) : (
                    <IconButton
                      icon="alert-circle"
                      {...props}
                      iconColor={theme.colors.error}
                    />
                  )
                )}
              />
            </Card>
          ))
        ) : (
          <Card style={styles.recentCard}>
            <Card.Content>
              <Text variant="bodyMedium" style={{ textAlign: 'center', opacity: 0.7 }}>
                No recent conversions yet. Start converting files to see them here!
              </Text>
            </Card.Content>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 20 : 70, // Daha fazla boşluk
    backgroundColor: 'transparent',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontWeight: 'bold',
  },
  subtitle: {
    marginTop: 4,
    opacity: 0.7,
  },
  premiumButton: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  segmentedButton: {
    marginBottom: 16
  },
  divider: {
    marginBottom: 16,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  cardTitle: {
    marginBottom: 8,
  },
  cardText: {
    marginBottom: 16,
    opacity: 0.7,
  },
  button: {
    marginTop: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  selectButton: {
    flex: 1,
  },
  clearButton: {
    flex: 0.6,
  },
  selectedFilesCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  selectedFilesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusChip: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  filesList: {
    marginBottom: 16,
  },
  fileListItem: {
    borderRadius: 8,
    marginBottom: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  fileThumbnail: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginLeft: 8,
    marginRight: 8,
  },
  convertButton: {
    marginTop: 8,
  },
  recentTitle: {
    marginBottom: 12,
  },
  recentCard: {
    marginBottom: 12,
    borderRadius: 12,
  },
  operationDescription: {
    marginTop: 8,
    opacity: 0.7,
    textAlign: 'center',
  },
});