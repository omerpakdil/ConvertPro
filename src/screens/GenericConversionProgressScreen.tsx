import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Platform, Alert, ScrollView, StatusBar as ReactNativeStatusBar } from 'react-native';
import {
  Text,
  Button,
  useTheme,
  Surface,
  IconButton,
  ProgressBar,
  Card,
  Divider,
  List
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar'; // Kurulumu gerekebilir
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system'; // react-native-fs yerine expo-file-system kullanıyoruz
import * as MediaLibrary from 'expo-media-library';
import * as ImageManipulator from 'expo-image-manipulator'; // expo-image-manipulator import edildi
// @ts-ignore TODO: Define RootStackParamList and other types in types.ts
import { RootStackParamList, MediaType } from '../types';
import Animated, { useSharedValue, withTiming, useAnimatedStyle, Easing } from 'react-native-reanimated'; // Kurulumu gerekebilir

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

    let saveFormat: ImageManipulator.SaveFormat;
    switch (targetExtension.toLowerCase()) {
      case 'jpeg':
      case 'jpg':
        saveFormat = ImageManipulator.SaveFormat.JPEG;
        break;
      case 'png':
        saveFormat = ImageManipulator.SaveFormat.PNG;
        break;
      case 'webp':
        saveFormat = ImageManipulator.SaveFormat.WEBP;
        break;
      default:
        // Desteklenmeyen formatlar için (SVG, TIFF vb.)
        setCurrentStatusMessage(`Format ${targetExtension.toUpperCase()} is not supported for direct conversion. Skipping ${file.name}.`);
        // İsteğe bağlı olarak burada bir gecikme eklenebilir veya dosya kopyalama simülasyonu yapılabilir.
        // Şimdilik işlemi atlıyoruz ve hata olarak işaretliyoruz.
        await new Promise(resolve => setTimeout(resolve, 1000)); // Kullanıcıya mesajı göstermek için kısa bir bekleme
        return { ...file, success: false, error: `Unsupported format: ${targetExtension.toUpperCase()}`, outputName: newFileNameWithExtension };
    }

    const saveOptions: ImageManipulator.SaveOptions = {
      format: saveFormat,
      base64: false,
    };

    // Sadece kayıplı formatlar için kalite ayarını uygula
    if (saveFormat === ImageManipulator.SaveFormat.JPEG || saveFormat === ImageManipulator.SaveFormat.WEBP) {
      saveOptions.compress = qualitySetting / 100; // Kaliteyi 0-1 aralığına dönüştür
    }

    try {
      setCurrentStatusMessage(`Converting ${file.name} to ${targetExtension.toUpperCase()}...`);
      // İlerleme çubuğu için yapay bir ilerleme (manipulateAsync ilerleme sağlamıyor)
      setCurrentFileProgress(0.3);
      const manipResult = await ImageManipulator.manipulateAsync(
        file.uri,
        [], // Şimdilik action yok
        saveOptions
      );
      setCurrentFileProgress(0.7);

      if (isCancelledRef.current) {
        return { ...file, success: false, error: 'Cancelled by user', outputName: newFileNameWithExtension };
      }

      setCurrentStatusMessage(`Saving ${newFileNameWithExtension} to gallery...`);
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Media Library permission is needed to save files.');
        return { ...file, success: false, error: 'Media Library permission denied', outputName: newFileNameWithExtension };
      }

      const asset = await MediaLibrary.createAssetAsync(manipResult.uri);
      // Geçici dosyayı sil (isteğe bağlı, cacheDirectory genellikle OS tarafından yönetilir)
      // await FileSystem.deleteAsync(manipResult.uri, { idempotent: true });

      console.log('File saved to gallery:', asset.uri);
      setCurrentFileProgress(1);
      return { ...file, success: true, outputPath: asset.uri, outputName: newFileNameWithExtension };

    } catch (error: any) {
      console.error('Image processing error:', error);
      setCurrentFileProgress(1); // Hata durumunda da ilerlemeyi tamamla
      return { ...file, success: false, error: error.message || 'Image processing failed', outputName: newFileNameWithExtension };
    }
  };

  // Ses dosyası işleme fonksiyonu (simülasyon)
  const processAudioFile = async (file: FileToConvert, targetExtension: string /*, bitrate: number // TODO: Gelecekte kullanılacak */): Promise<ConvertedFileResult> => {
    setCurrentFileProgress(0);
    setCurrentStatusMessage(`Preparing ${file.name} for audio conversion...`);

    const originalFileName = file.uri.split('/').pop() || 'unknown_original_audio';
    const baseName = originalFileName.substring(0, originalFileName.lastIndexOf('.')) || originalFileName;
    const newFileNameWithExtension = `${baseName}_converted.${targetExtension}`;
    const tempDir = FileSystem.cacheDirectory + 'converted_audio/';

    try {
      // Geçici klasörün var olduğundan emin ol
      await FileSystem.makeDirectoryAsync(tempDir, { intermediates: true });
      const tempFilePath = `${tempDir}${newFileNameWithExtension}`;

      setCurrentStatusMessage(`Simulating conversion of ${file.name} to ${targetExtension.toUpperCase()}...`);
      // Simülasyon: Dosyayı kopyala
      await FileSystem.copyAsync({
        from: file.uri,
        to: tempFilePath,
      });
      setCurrentFileProgress(0.5); // Simülasyon ilerlemesi

      // TODO: Gerçek ses işleme (örn: ffmpeg ile) burada entegre edilecek.
      // Örneğin: await NativeModules.AudioProcessor.process(file.uri, tempFilePath, targetExtension, bitrate);
      // Şimdilik sadece bir gecikme ekleyelim
      await new Promise(resolve => setTimeout(resolve, 1500)); // Yapay işlem süresi

      if (isCancelledRef.current) {
        await FileSystem.deleteAsync(tempFilePath, { idempotent: true });
        return { ...file, success: false, error: 'Cancelled by user', outputName: newFileNameWithExtension };
      }

      setCurrentFileProgress(0.7);
      setCurrentStatusMessage(`Saving ${newFileNameWithExtension} to media library...`);

      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Media Library permission is needed to save audio files.');
        await FileSystem.deleteAsync(tempFilePath, { idempotent: true });
        return { ...file, success: false, error: 'Media Library permission denied', outputName: newFileNameWithExtension };
      }

      const asset = await MediaLibrary.createAssetAsync(tempFilePath);
      // Kopyalanan geçici dosya, createAssetAsync tarafından galeriye kopyalandıktan sonra silinebilir.
      // Ancak expo-file-system cache'i genellikle OS tarafından yönetildiği için zorunlu değil.
      // İsteğe bağlı: await FileSystem.deleteAsync(tempFilePath, { idempotent: true });

      console.log('Audio file saved to media library:', asset.uri);
      setCurrentFileProgress(1);
      return { ...file, success: true, outputPath: asset.uri, outputName: newFileNameWithExtension };

    } catch (error: any) {
      console.error('Audio processing simulation error:', error);
      setCurrentFileProgress(1); // Hata durumunda da ilerlemeyi tamamla
      return { ...file, success: false, error: error.message || 'Audio processing simulation failed', outputName: newFileNameWithExtension };
    }
  };

  const startOverallConversion = async () => {
    setConversionState('converting');
    const results: ConvertedFileResult[] = [];

    for (let i = 0; i < totalFiles; i++) {
      if (isCancelledRef.current) {
        setConversionState('cancelled');
        setCurrentStatusMessage('Conversion cancelled.');
        break;
      }
      setCurrentFileIndex(i);
      const currentFile = filesToConvert[i];

      let result: ConvertedFileResult;
      if (conversionType === 'image') {
        result = await processImageFile(currentFile, outputFormatExtension, quality);
      } else if (conversionType === 'audio') {
        // audioBitrate parametresi processAudioFile'a eklenebilir (TODO için)
        result = await processAudioFile(currentFile, outputFormatExtension /*, route.params.audioBitrate */);
      } else {
        setCurrentStatusMessage(`Conversion type '${conversionType}' is not yet implemented for ${currentFile.name}.`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        result = {
            ...currentFile,
            success: false,
            error: `Conversion type '${conversionType}' not implemented.`,
            outputName: `${currentFile.name.substring(0, currentFile.name.lastIndexOf('.')) || currentFile.name}_converted.${outputFormatExtension}`
        };
      }

      results.push(result);
      setProcessedFiles([...results]);
      setOverallProgress((i + 1) / totalFiles);
    }

    if (!isCancelledRef.current) {
        setConversionState(results.every(r => r.success) ? 'completed' : 'error');
        setCurrentStatusMessage(results.every(r => r.success) ? 'All conversions completed!' : 'Some conversions failed.');
        if (results.every(r => r.success)) {
            checkmarkScale.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.exp) });
            checkmarkOpacity.value = withTiming(1, { duration: 500 });
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
              icon={conversionType === 'image' ? 'image-sync' :
                   conversionType === 'audio' ? 'music-note-cog' :
                   conversionType === 'video' ? 'video-sync' : 'file-sync'}
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

            <Card style={[styles.resultCard, {backgroundColor: theme.colors.surfaceVariant}]}>
              <Card.Content>
                <Text variant="titleMedium" style={{color: theme.colors.onSurfaceVariant, marginBottom: 10}}>Results:</Text>
                {processedFiles.map((file, index) => (
                  <List.Item
                    key={index}
                    title={file.name}
                    description={file.success ? `Converted to ${file.outputName}` : `Error: ${file.error}`}
                    titleStyle={{color: file.success ? theme.colors.primary : theme.colors.error}}
                    descriptionStyle={{color: theme.colors.onSurfaceVariant}}
                    left={props => <List.Icon {...props} icon={file.success ? "check" : "alert-circle-outline"} color={file.success ? theme.colors.primary : theme.colors.error} />}
                    style={{borderBottomWidth: 1, borderBottomColor: theme.colors.outlineVariant}}
                  />
                ))}
                {processedFiles.length === 0 && conversionState === 'cancelled' && (
                    <Text style={{color: theme.colors.onSurfaceVariant, textAlign: 'center'}}>No files were processed.</Text>
                )}
              </Card.Content>
            </Card>

            <View style={styles.buttonContainer}>
              {/* Placeholder for "View Files" or "Share All" */}
              {processedFiles.some(f => f.success) && (
                <Button
                  mode="contained"
                  onPress={() => {
                    // TODO: Daha gelişmiş bir dosya görüntüleme/paylaşma özelliği eklenebilir.
                    // Şimdilik sadece bir log mesajı yazdırıyoruz ve başarılı dosyaların yollarını gösteriyoruz.
                    console.log("Open Output Folder (Demo) clicked.");
                    const successfulFiles = processedFiles.filter(f => f.success && f.outputPath);
                    if (successfulFiles.length > 0) {
                        Alert.alert(
                            "Converted Files",
                            `Successfully converted ${successfulFiles.length} file(s).\n\nPaths:\n${successfulFiles.map(f => `${f.outputName} (at ${f.outputPath})`).join('\n')}`,
                            [{ text: "OK" }]
                        );
                    } else {
                        Alert.alert("No Files Converted", "No files were successfully converted or saved to the gallery.", [{ text: "OK" }]);
                    }
                  }}
                  style={styles.actionButton}
                  icon="folder-open-outline"
                >
                  View Converted Files (Log)
                </Button>
              )}
              <Button
                mode="outlined"
                onPress={() => navigation.popToTop()}
                style={styles.actionButton}
                icon="home-outline"
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
    maxHeight: 300, // Added for scrollability if many files
  },
  buttonContainer: {
    width: '100%',
    marginTop: 16,
  },
  actionButton: {
    marginBottom: 16,
    paddingVertical: 6,
  },
});

export default GenericConversionProgressScreen;