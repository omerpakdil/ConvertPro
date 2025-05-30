import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Platform, Alert, ScrollView, StatusBar as ReactNativeStatusBar, Image, Linking } from 'react-native';
import FFmpegService, { ConversionProgress } from '../services/FFmpegService';
import {
  Text,
  Button,
  useTheme,
  Surface,
  IconButton,
  ProgressBar,
  Card,
  Divider,
  Chip
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar'; // Kurulumu gerekebilir
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system'; // react-native-fs yerine expo-file-system kullanıyoruz
import * as MediaLibrary from 'expo-media-library';
import * as ImageManipulator from 'expo-image-manipulator'; // expo-image-manipulator import edildi
import * as Sharing from 'expo-sharing';
// @ts-ignore TODO: Define RootStackParamList and other types in types.ts
import { RootStackParamList } from '../types';
import Animated, { useSharedValue, withTiming, useAnimatedStyle, Easing } from 'react-native-reanimated'; // Kurulumu gerekebilir
import ConversionHistoryManager from '../utils/conversionHistory';


type ConversionProgressScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'GenericConversionProgress'
>;
type ConversionProgressScreenRouteProp = RouteProp<
  RootStackParamList,
  'GenericConversionProgress'
>;

interface FileToConvert {
  uri: string;
  name: string;
  outputName: string;
}

interface ConvertedFileResult extends FileToConvert {
  success: boolean;
  outputPath?: string;
  error?: string;
}

type ConversionProgressScreenProps = {
  navigation: ConversionProgressScreenNavigationProp;
  route: ConversionProgressScreenRouteProp;
};

type ConversionState = 'idle' | 'preparing' | 'converting' | 'finishing' | 'completed' | 'error' | 'cancelled';

export const GenericConversionProgressScreen = ({ navigation, route }: ConversionProgressScreenProps) => {
  const theme = useTheme();
  // @ts-ignore TODO: types.ts içinde tanımlanacak
  const { files: filesToConvert, outputFormatId, outputFormatExtension, quality, conversionType } = route.params;

  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [currentFileProgress, setCurrentFileProgress] = useState(0);
  const [overallProgress, setOverallProgress] = useState(0);
  const [conversionState, setConversionState] = useState<ConversionState>('preparing');
  const [processedFiles, setProcessedFiles] = useState<ConvertedFileResult[]>([]);
  const [currentStatusMessage, setCurrentStatusMessage] = useState('Preparing files...');

  const totalFiles = filesToConvert.length;
  const isCancelledRef = useRef(false);

  const checkmarkScale = useSharedValue(0);
  const checkmarkOpacity = useSharedValue(0);
  const checkmarkStyle = useAnimatedStyle(() => ({
    opacity: checkmarkOpacity.value,
    transform: [{ scale: checkmarkScale.value }],
  }));

  // Helper function to get supported image format
  const getSupportedImageFormat = (extension: string): { supported: boolean; format?: ImageManipulator.SaveFormat } => {
    switch (extension.toLowerCase()) {
      case 'jpeg':
      case 'jpg':
        return { supported: true, format: ImageManipulator.SaveFormat.JPEG };
      case 'png':
        return { supported: true, format: ImageManipulator.SaveFormat.PNG };
      case 'webp':
        return { supported: true, format: ImageManipulator.SaveFormat.WEBP };
      case 'heic':
      case 'heif':
        // HEIC/HEIF can be read by expo-image-manipulator but saved as JPEG for compatibility
        return { supported: true, format: ImageManipulator.SaveFormat.JPEG };
      default:
        return { supported: false };
    }
  };

  // Enhanced error handling for image processing
  const handleImageProcessingError = (error: any, fileName: string): string => {
    console.error('Image processing error:', error);

    if (error.message?.includes('permission')) {
      return 'Permission denied. Please check app permissions.';
    }
    if (error.message?.includes('memory') || error.message?.includes('size')) {
      return 'File too large or insufficient memory.';
    }
    if (error.message?.includes('format') || error.message?.includes('corrupt')) {
      return 'Invalid or corrupted image file.';
    }
    if (error.message?.includes('network') || error.message?.includes('timeout')) {
      return 'Network error or operation timeout.';
    }

    return error.message || 'Unknown error occurred during image processing.';
  };

  // Function to open gallery app
  const openGalleryApp = async () => {
    try {
      if (Platform.OS === 'android') {
        // Android - try different approaches to open gallery
        const galleryUrls = [
          'content://media/external/images/media', // Generic gallery
          'market://details?id=com.google.android.apps.photos', // Google Photos in Play Store
          'https://play.google.com/store/apps/details?id=com.google.android.apps.photos', // Google Photos web
        ];

        // Try to open gallery with content URI
        try {
          await Linking.openURL('content://media/external/images/media');
          return;
        } catch (contentError) {
          console.log('Content URI failed, trying alternatives...');
        }

        // Try to open Google Photos app directly
        try {
          await Linking.openURL('googlephoto://');
          return;
        } catch (photosError) {
          console.log('Google Photos app not found, trying web version...');
        }

        // Try to open Google Photos web version
        try {
          await Linking.openURL('https://photos.google.com/');
          return;
        } catch (webError) {
          console.log('Web version failed, opening settings...');
        }

        // Final fallback - open app settings
        await Linking.openSettings();

      } else if (Platform.OS === 'ios') {
        // iOS - open Photos app
        try {
          await Linking.openURL('photos-redirect://');
          return;
        } catch (photosError) {
          // Fallback to Settings
          await Linking.openSettings();
        }
      }
    } catch (error) {
      console.error('Error opening gallery:', error);
      Alert.alert(
        'Cannot Open Gallery',
        'Unable to open the gallery app automatically. Please open your Photos/Gallery app manually to view the converted files.',
        [{ text: 'OK' }]
      );
    }
  };

  // Handle file sharing
  const handleShareFile = async (filePath: string, fileName: string) => {
    try {
      console.log('📤 Sharing file:', filePath, fileName);

      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Share Not Available', 'Sharing is not available on this device.');
        return;
      }

      // For media library URIs, we need to copy to a temporary location first
      let shareUri = filePath;

      if (filePath.startsWith('ph://') || filePath.startsWith('content://')) {
        // This is a media library URI, copy to temporary location
        const tempPath = `${FileSystem.cacheDirectory}${fileName}`;

        try {
          await FileSystem.copyAsync({
            from: filePath,
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
        mimeType: getMimeTypeFromExtension(fileName),
        dialogTitle: `Share ${fileName}`,
        UTI: getUTIFromExtension(fileName)
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

  useEffect(() => {
    isCancelledRef.current = false;
    startOverallConversion();
    return () => {
      isCancelledRef.current = true; // Mark as cancelled if component unmounts
    };
  }, []);

  const processImageFile = async (file: FileToConvert, targetExtension: string, qualitySetting: number): Promise<ConvertedFileResult> => {
    setCurrentFileProgress(0);
    setCurrentStatusMessage(`Processing ${file.name}...`);

    const originalFileName = file.uri.split('/').pop() || 'unknown_original';
    const baseName = originalFileName.substring(0, originalFileName.lastIndexOf('.')) || originalFileName;
    const newFileNameWithExtension = `${baseName}_converted.${targetExtension}`;

    // Validate and get save format
    const formatResult = getSupportedImageFormat(targetExtension);
    if (!formatResult.supported) {
      setCurrentStatusMessage(`Format ${targetExtension.toUpperCase()} is not supported. Skipping ${file.name}.`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return {
        ...file,
        success: false,
        error: `Unsupported format: ${targetExtension.toUpperCase()}. Supported formats: JPG, PNG, WebP, HEIC`,
        outputName: newFileNameWithExtension
      };
    }

    const saveFormat = formatResult.format!;

    const saveOptions: ImageManipulator.SaveOptions = {
      format: saveFormat,
      base64: false,
    };

    // Sadece kayıplı formatlar için kalite ayarını uygula
    if (saveFormat === ImageManipulator.SaveFormat.JPEG || saveFormat === ImageManipulator.SaveFormat.WEBP) {
      saveOptions.compress = qualitySetting / 100; // Kaliteyi 0-1 aralığına dönüştür
    }

    try {
      // Step 1: Validate file access
      setCurrentStatusMessage(`Validating ${file.name}...`);
      setCurrentFileProgress(0.1);

      // Check if file still exists and is accessible
      try {
        const fileInfo = await FileSystem.getInfoAsync(file.uri);
        if (!fileInfo.exists) {
          return { ...file, success: false, error: 'File no longer exists or is not accessible', outputName: newFileNameWithExtension };
        }
      } catch (fileError) {
        return { ...file, success: false, error: 'Cannot access file. It may have been moved or deleted.', outputName: newFileNameWithExtension };
      }

      // Step 2: Start conversion
      setCurrentStatusMessage(`Converting ${file.name} to ${targetExtension.toUpperCase()}...`);
      setCurrentFileProgress(0.2);

      const manipResult = await ImageManipulator.manipulateAsync(
        file.uri,
        [], // No transformations for now
        saveOptions
      );
      setCurrentFileProgress(0.6);

      if (isCancelledRef.current) {
        return { ...file, success: false, error: 'Cancelled by user', outputName: newFileNameWithExtension };
      }

      // Step 3: Request permissions
      setCurrentStatusMessage(`Requesting permissions...`);
      setCurrentFileProgress(0.7);

      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Media Library permission is needed to save files.');
        return { ...file, success: false, error: 'Media Library permission denied', outputName: newFileNameWithExtension };
      }

      // Step 4: Save to gallery
      setCurrentStatusMessage(`Saving ${newFileNameWithExtension} to gallery...`);
      setCurrentFileProgress(0.8);

      const asset = await MediaLibrary.createAssetAsync(manipResult.uri);
      setCurrentFileProgress(0.95);

      // Step 5: Cleanup and finish
      setCurrentStatusMessage(`Finalizing ${newFileNameWithExtension}...`);
      // Optional: Clean up temporary files
      // await FileSystem.deleteAsync(manipResult.uri, { idempotent: true });

      console.log('File saved to gallery:', asset.uri);
      setCurrentFileProgress(1);
      return { ...file, success: true, outputPath: asset.uri, outputName: newFileNameWithExtension };

    } catch (error: any) {
      const errorMessage = handleImageProcessingError(error, file.name);
      setCurrentFileProgress(1); // Hata durumunda da ilerlemeyi tamamla
      return { ...file, success: false, error: errorMessage, outputName: newFileNameWithExtension };
    }
  };

  // Process audio file using FFmpeg
  const processAudioFile = async (file: FileToConvert, targetExtension: string, quality?: number): Promise<ConvertedFileResult> => {
    setCurrentFileProgress(0);
    setCurrentStatusMessage(`Preparing ${file.name} for audio conversion...`);

    const originalFileName = file.uri.split('/').pop() || 'unknown_original_audio';
    const baseName = originalFileName.substring(0, originalFileName.lastIndexOf('.')) || originalFileName;
    const newFileNameWithExtension = `${baseName}_converted.${targetExtension}`;

    try {
      setCurrentFileProgress(0.1);
      setCurrentStatusMessage(`Converting ${file.name} to ${targetExtension.toUpperCase()}...`);

      // Determine quality level
      let qualityLevel: 'low' | 'medium' | 'high' | 'ultra' = 'medium';
      if (quality) {
        if (quality <= 128) qualityLevel = 'low';
        else if (quality <= 192) qualityLevel = 'medium';
        else if (quality <= 256) qualityLevel = 'high';
        else qualityLevel = 'ultra';
      }

      setCurrentFileProgress(0.2);

      // Convert using FFmpeg
      const result = await FFmpegService.convertAudio(
        file.uri,
        targetExtension,
        {
          outputFormat: targetExtension,
          quality: qualityLevel,
          bitrate: quality ? `${quality}k` : undefined
        },
        (progress: ConversionProgress) => {
          // Update progress
          const progressPercent = Math.min(0.2 + (progress.progress / 100) * 0.6, 0.8);
          setCurrentFileProgress(progressPercent);
          console.log('Audio conversion progress:', progress);
        }
      );

      if (isCancelledRef.current) {
        return { ...file, success: false, error: 'Cancelled by user', outputName: newFileNameWithExtension };
      }

      setCurrentFileProgress(0.9);

      if (result.success) {
        console.log('Audio file converted and saved:', result.outputPath);
        setCurrentFileProgress(1);
        return {
          ...file,
          success: true,
          outputPath: result.outputPath!,
          outputName: newFileNameWithExtension
        };
      } else {
        setCurrentFileProgress(1);
        return {
          ...file,
          success: false,
          error: result.error || 'Audio conversion failed',
          outputName: newFileNameWithExtension
        };
      }
    } catch (error: any) {
      console.error('Audio conversion error:', error);
      setCurrentFileProgress(1);
      return {
        ...file,
        success: false,
        error: error.message || 'Audio conversion failed',
        outputName: newFileNameWithExtension
      };
    }
  };

  // Process video file using FFmpeg
  const processVideoFile = async (file: FileToConvert, targetExtension: string, quality?: number): Promise<ConvertedFileResult> => {
    setCurrentFileProgress(0);
    setCurrentStatusMessage(`Preparing ${file.name} for video conversion...`);

    const originalFileName = file.uri.split('/').pop() || 'unknown_original_video';
    const baseName = originalFileName.substring(0, originalFileName.lastIndexOf('.')) || originalFileName;
    const newFileNameWithExtension = `${baseName}_converted.${targetExtension}`;

    try {
      setCurrentFileProgress(0.1);
      setCurrentStatusMessage(`Converting ${file.name} to ${targetExtension.toUpperCase()}...`);

      // Determine quality level and resolution
      let qualityLevel: 'low' | 'medium' | 'high' | 'ultra' = 'medium';
      let resolution: string | undefined;

      if (quality) {
        if (quality <= 480) {
          qualityLevel = 'low';
          resolution = '480p';
        } else if (quality <= 720) {
          qualityLevel = 'medium';
          resolution = '720p';
        } else if (quality <= 1080) {
          qualityLevel = 'high';
          resolution = '1080p';
        } else {
          qualityLevel = 'ultra';
          resolution = '4k';
        }
      }

      setCurrentFileProgress(0.2);

      // Convert using FFmpeg
      const result = await FFmpegService.convertVideo(
        file.uri,
        targetExtension,
        {
          outputFormat: targetExtension,
          quality: qualityLevel,
          resolution: resolution
        },
        (progress: ConversionProgress) => {
          // Update progress
          const progressPercent = Math.min(0.2 + (progress.progress / 100) * 0.6, 0.8);
          setCurrentFileProgress(progressPercent);
          console.log('Video conversion progress:', progress);
        }
      );

      if (isCancelledRef.current) {
        return { ...file, success: false, error: 'Cancelled by user', outputName: newFileNameWithExtension };
      }

      setCurrentFileProgress(0.9);

      if (result.success) {
        console.log('Video file converted and saved:', result.outputPath);
        setCurrentFileProgress(1);
        return {
          ...file,
          success: true,
          outputPath: result.outputPath!,
          outputName: newFileNameWithExtension
        };
      } else {
        setCurrentFileProgress(1);
        return {
          ...file,
          success: false,
          error: result.error || 'Video conversion failed',
          outputName: newFileNameWithExtension
        };
      }
    } catch (error: any) {
      console.error('Video conversion error:', error);
      setCurrentFileProgress(1);
      return {
        ...file,
        success: false,
        error: error.message || 'Video conversion failed',
        outputName: newFileNameWithExtension
      };
    }
  };



  const startOverallConversion = async () => {
    setConversionState('converting');
    const results: ConvertedFileResult[] = [];

    // Process files sequentially for better user experience and resource management
    for (let i = 0; i < totalFiles; i++) {
      if (isCancelledRef.current) {
        setConversionState('cancelled');
        setCurrentStatusMessage('Conversion cancelled.');
        break;
      }

      setCurrentFileIndex(i);
      const currentFile = filesToConvert[i];
      setCurrentStatusMessage(`Processing file ${i + 1} of ${totalFiles}: ${currentFile.name}`);

      let result: ConvertedFileResult;

      try {
        if (conversionType === 'image') {
          result = await processImageFile(currentFile, outputFormatExtension, quality || 75);
        } else if (conversionType === 'audio') {
          result = await processAudioFile(currentFile, outputFormatExtension, quality);
        } else if (conversionType === 'video') {
          result = await processVideoFile(currentFile, outputFormatExtension, quality);
        } else {
          // Unsupported conversion type
          setCurrentStatusMessage(`Conversion type '${conversionType}' is not yet implemented for ${currentFile.name}.`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          result = {
            ...currentFile,
            success: false,
            error: `Conversion type '${conversionType}' not implemented yet. Coming soon!`,
            outputName: `${currentFile.name.substring(0, currentFile.name.lastIndexOf('.')) || currentFile.name}_converted.${outputFormatExtension}`
          };
        }
      } catch (error: any) {
        // Catch any unexpected errors during processing
        console.error('Unexpected error during file processing:', error);
        result = {
          ...currentFile,
          success: false,
          error: `Unexpected error: ${error.message || 'Unknown error occurred'}`,
          outputName: `${currentFile.name.substring(0, currentFile.name.lastIndexOf('.')) || currentFile.name}_converted.${outputFormatExtension}`
        };
      }

      results.push(result);
      setProcessedFiles([...results]);
      setOverallProgress((i + 1) / totalFiles);

      // Save to conversion history
      try {
        const inputExtension = currentFile.name.split('.').pop() || '';
        await ConversionHistoryManager.addConversion({
          inputFileName: currentFile.name,
          outputFileName: result.outputName || `${currentFile.name}_converted.${outputFormatExtension}`,
          inputFormat: inputExtension.toUpperCase(),
          outputFormat: outputFormatExtension.toUpperCase(),
          conversionType: conversionType as 'image' | 'audio' | 'video',
          success: result.success,
          outputPath: result.outputPath,
        });
      } catch (historyError) {
        console.error('Error saving to conversion history:', historyError);
        // Don't fail the conversion if history saving fails
      }

      // Small delay between files for better UX
      if (i < totalFiles - 1 && !isCancelledRef.current) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Final state update
    if (!isCancelledRef.current) {
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      if (successCount === totalFiles) {
        setConversionState('completed');
        setCurrentStatusMessage(`All ${totalFiles} file(s) converted successfully!`);
        checkmarkScale.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.exp) });
        checkmarkOpacity.value = withTiming(1, { duration: 500 });
      } else if (successCount > 0) {
        setConversionState('error');
        setCurrentStatusMessage(`${successCount} file(s) converted, ${failureCount} failed.`);
      } else {
        setConversionState('error');
        setCurrentStatusMessage('All conversions failed. Please check your files and try again.');
      }
    }

    setCurrentFileProgress(0); // Reset for next or end
  };

  const handleCancelConversion = () => {
    isCancelledRef.current = true;
    setConversionState('cancelled');
    setCurrentStatusMessage('Cancelling conversion...');
    // Further cleanup or navigation can be added here
    // navigation.goBack(); // Or navigate to Home
  };

  const getOverallStatusMessage = () => {
    if (conversionState === 'converting') {
      return `Processing file ${currentFileIndex + 1} of ${totalFiles}: ${filesToConvert[currentFileIndex]?.name || ''}`;
    }
    return currentStatusMessage;
  };

  const allDone = conversionState === 'completed' || conversionState === 'error' || conversionState === 'cancelled';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar style={theme.dark ? "light" : "dark"} backgroundColor={theme.colors.background} />
      <Surface style={styles.header} elevation={0}>
        <View style={styles.headerRow}>
          {allDone ? (
            <IconButton
              icon="close"
              size={24}
              onPress={() => navigation.popToTop()} // Go to Home or first screen
              iconColor={theme.colors.onSurface}
            />
          ) : (
            <IconButton
              icon="arrow-left" // Or "close" if cancellation is the primary back action
              size={24}
              onPress={handleCancelConversion} // Or navigation.goBack() if preferred
              iconColor={theme.colors.onSurface}
            />
          )}
          <Text variant="titleLarge" style={[styles.title, { color: theme.colors.onSurface }]}>
            {allDone ? 'Conversion Summary' : 'Converting...'}
          </Text>
        </View>
      </Surface>

      <ScrollView contentContainerStyle={styles.content}>
        {!allDone && (
          <View style={styles.progressContainer}>
            <IconButton
              icon={conversionType === 'image' ? 'image-edit' :
                   conversionType === 'audio' ? 'music-note' : 'video'}
              size={80}
              iconColor={theme.colors.primary}
              style={styles.typeIcon}
            />
            <Text variant="titleMedium" style={[styles.statusText, { color: theme.colors.onBackground }]}>
              {getOverallStatusMessage()}
            </Text>

            {filesToConvert[currentFileIndex] && (
                <Text variant="bodySmall" style={{color: theme.colors.onSurfaceVariant, marginBottom: 10}}>
                    Current: {filesToConvert[currentFileIndex].name}
                </Text>
            )}

            <ProgressBar
              progress={currentFileProgress}
              style={styles.progressBar}
              color={theme.colors.primary}
              visible={conversionState === 'converting'}
            />
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4, marginBottom: 16 }}>
              File Progress: {Math.round(currentFileProgress * 100)}%
            </Text>

            <Text variant="labelLarge" style={{ color: theme.colors.onBackground, marginTop: 20, marginBottom: 4 }}>
              Overall Progress
            </Text>
            <ProgressBar
              progress={overallProgress}
              style={styles.overallProgressBar}
              color={theme.colors.tertiary}
            />
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
              {Math.round(overallProgress * 100)}% ({processedFiles.length}/{totalFiles} files)
            </Text>

            <Button
              mode="outlined"
              onPress={handleCancelConversion}
              style={styles.cancelButton}
              icon="cancel"
              textColor={theme.colors.error}
            >
              Cancel All
            </Button>
          </View>
        )}

        {allDone && (
          <View style={styles.summaryContainer}>
            {conversionState === 'completed' && (
              <Animated.View style={[styles.checkmarkContainer, checkmarkStyle]}>
                <IconButton
                  icon="check-circle"
                  size={80}
                  iconColor={theme.colors.primary}
                />
              </Animated.View>
            )}
            {conversionState === 'error' && (
                 <IconButton
                  icon="alert-circle"
                  size={80}
                  iconColor={theme.colors.error}
                  style={styles.checkmarkContainer} // Re-use style for spacing
                />
            )}
             {conversionState === 'cancelled' && (
                 <IconButton
                  icon="cancel"
                  size={80}
                  iconColor={theme.colors.onSurfaceVariant}
                  style={styles.checkmarkContainer}
                />
            )}

            <Text variant="headlineSmall" style={[styles.summaryTitle, { color: theme.colors.onBackground }]}>
              {currentStatusMessage}
            </Text>

            {/* Conversion Results */}
            <Card style={[styles.resultCard, {backgroundColor: theme.colors.surfaceVariant}]}>
              <Card.Content>
                <View style={styles.resultHeader}>
                  <Text variant="titleMedium" style={{color: theme.colors.onSurfaceVariant}}>
                    Conversion Results
                  </Text>
                  <View style={styles.resultStats}>
                    {processedFiles.filter(f => f.success).length > 0 && (
                      <Chip
                        icon="check-circle"
                        style={[styles.statChip, {backgroundColor: theme.colors.primaryContainer}]}
                        textStyle={{color: theme.colors.onPrimaryContainer}}
                      >
                        {processedFiles.filter(f => f.success).length} Success
                      </Chip>
                    )}
                    {processedFiles.filter(f => !f.success).length > 0 && (
                      <Chip
                        icon="alert-circle"
                        style={[styles.statChip, {backgroundColor: theme.colors.errorContainer}]}
                        textStyle={{color: theme.colors.onErrorContainer}}
                      >
                        {processedFiles.filter(f => !f.success).length} Failed
                      </Chip>
                    )}
                  </View>
                </View>

                <Divider style={{marginVertical: 16}} />

                {/* File Results - Show all files */}
                <View style={styles.fileResultsContainer}>
                  {processedFiles.map((file, index) => (
                    <View key={index} style={[styles.fileResultItem, {borderColor: theme.colors.outline}]}>
                      <View style={styles.fileResultLeft}>
                        {/* Thumbnail for images */}
                        {conversionType === 'image' && file.success && file.outputPath ? (
                          <Image
                            source={{ uri: file.outputPath }}
                            style={[styles.resultThumbnail, {borderColor: theme.colors.outline}]}
                            resizeMode="cover"
                          />
                        ) : (
                          <Surface style={[styles.resultIconContainer, {backgroundColor: file.success ? theme.colors.primaryContainer : theme.colors.errorContainer}]} elevation={0}>
                            <IconButton
                              icon={
                                file.success ? (
                                  conversionType === 'image' ? 'image' :
                                  conversionType === 'audio' ? 'music-note' : 'video'
                                ) : 'alert-circle'
                              }
                              iconColor={file.success ? theme.colors.onPrimaryContainer : theme.colors.onErrorContainer}
                              size={24}
                            />
                          </Surface>
                        )}
                      </View>

                      <View style={styles.fileResultContent}>
                        <Text
                          variant="bodyMedium"
                          style={[styles.fileResultTitle, {color: file.success ? theme.colors.onSurface : theme.colors.error}]}
                          numberOfLines={1}
                        >
                          {file.name}
                        </Text>
                        <Text
                          variant="bodySmall"
                          style={[styles.fileResultDescription, {color: theme.colors.onSurfaceVariant}]}
                          numberOfLines={2}
                        >
                          {file.success ? `✓ Converted` : `✗ ${file.error}`}
                        </Text>
                        {file.success && file.outputPath && (
                          <Text
                            variant="bodySmall"
                            style={[styles.fileLocationText, {color: theme.colors.onSurfaceVariant}]}
                            numberOfLines={1}
                          >
                            📁 {file.outputPath.includes('Downloads') ? 'Downloads' : 'Gallery'}
                          </Text>
                        )}
                        {file.success && (
                          <Chip
                            icon="check"
                            style={[styles.successChip, {backgroundColor: 'rgba(76, 175, 80, 0.2)'}]}
                            textStyle={{color: theme.colors.primary, fontSize: 10}}
                            compact
                          >
                            Saved to {file.outputPath?.includes('Downloads') ? 'Downloads' : 'Gallery'}
                          </Chip>
                        )}
                      </View>

                      <View style={styles.fileResultActions}>
                        {file.success && file.outputPath && (
                          <IconButton
                            icon="share"
                            iconColor={theme.colors.primary}
                            size={20}
                            onPress={() => handleShareFile(file.outputPath!, file.outputName || file.name)}
                          />
                        )}
                        <IconButton
                          icon={file.success ? "check-circle" : "alert-circle"}
                          iconColor={file.success ? theme.colors.primary : theme.colors.error}
                          size={20}
                        />
                      </View>
                    </View>
                  ))}
                </View>

                {processedFiles.length === 0 && conversionState === 'cancelled' && (
                  <View style={styles.emptyState}>
                    <IconButton icon="cancel" size={48} iconColor={theme.colors.onSurfaceVariant} />
                    <Text style={{color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 8}}>
                      No files were processed.
                    </Text>
                  </View>
                )}
              </Card.Content>
            </Card>

            <View style={styles.buttonContainer}>
              {processedFiles.some(f => f.success) && (
                <View style={styles.actionButtonRow}>


                  <Button
                    mode="outlined"
                    onPress={() => {
                      // Navigate back to conversion settings to convert more files
                      navigation.goBack();
                    }}
                    style={[styles.actionButton, styles.secondaryButton]}
                    icon="plus"
                  >
                    Convert More
                  </Button>
                </View>
              )}

              <Button
                mode={processedFiles.some(f => f.success) ? "text" : "contained"}
                onPress={() => navigation.popToTop()}
                style={styles.actionButton}
                icon="home"
              >
                Back to Home
              </Button>
            </View>
          </View>
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
    flexGrow: 1,
    padding: 16,
    justifyContent: 'center',
  },
  progressContainer: {
    alignItems: 'center',
    padding: 16,
  },
  typeIcon: {
    marginBottom: 24,
  },
  statusText: {
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  progressBar: {
    width: '90%',
    height: 10,
    borderRadius: 5,
    marginBottom: 0, // Adjusted
  },
  overallProgressBar: {
    width: '90%',
    height: 12,
    borderRadius: 6,
    marginBottom: 0, // Adjusted
  },
  cancelButton: {
    marginTop: 32,
    borderColor: 'transparent', // Make it look like a text button if desired, or keep outlined
  },
  summaryContainer: {
    alignItems: 'center',
    padding: 16,
  },
  checkmarkContainer: {
    marginBottom: 16,
  },
  summaryTitle: {
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  resultCard: {
    width: '100%',
    borderRadius: 12,
    marginBottom: 32,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultStats: {
    flexDirection: 'row',
    gap: 8,
  },
  statChip: {
    borderRadius: 16,
  },
  fileResultsContainer: {
    // No height limit - show all files
  },
  fileResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  fileResultLeft: {
    marginRight: 12,
  },
  resultThumbnail: {
    width: 50,
    height: 50,
    borderRadius: 8,
    borderWidth: 1,
  },
  resultIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileResultContent: {
    flex: 1,
    marginRight: 8,
  },
  fileResultTitle: {
    fontWeight: '600',
    marginBottom: 4,
  },
  fileResultDescription: {
    marginBottom: 6,
  },
  fileLocationText: {
    marginBottom: 6,
    fontSize: 11,
    opacity: 0.8,
  },
  successChip: {
    alignSelf: 'flex-start',
    borderRadius: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  buttonContainer: {
    width: '100%',
    marginTop: 16,
  },
  actionButtonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    paddingVertical: 6,
  },
  primaryButton: {
    flex: 1,
  },
  secondaryButton: {
    flex: 1,
  },
  fileResultActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default GenericConversionProgressScreen;