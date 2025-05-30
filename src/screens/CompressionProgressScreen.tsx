import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Text,
  Button,
  Card,
  ProgressBar,
  Surface,
  IconButton,
  useTheme,
  Chip,
  Divider
} from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import CompressionService, { CompressionSettings, CompressionResult } from '../services/CompressionService';
import conversionHistoryManager from '../utils/conversionHistory';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';


type RootStackParamList = {
  CompressionProgress: {
    files: Array<{ uri: string; name: string }>;
    compressionSettings: CompressionSettings;
  };
  Home: undefined;
};

type CompressionProgressScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'CompressionProgress'>;
type CompressionProgressScreenRouteProp = RouteProp<RootStackParamList, 'CompressionProgress'>;

type CompressionProgressScreenProps = {
  navigation: CompressionProgressScreenNavigationProp;
  route: CompressionProgressScreenRouteProp;
};

interface FileProgress {
  file: { uri: string; name: string };
  status: 'pending' | 'processing' | 'completed' | 'error';
  result?: CompressionResult;
  error?: string;
}

export const CompressionProgressScreen = ({ navigation, route }: CompressionProgressScreenProps) => {
  const theme = useTheme();
  const { files, compressionSettings } = route.params;

  const [fileProgress, setFileProgress] = useState<FileProgress[]>(
    files.map(file => ({ file, status: 'pending' }))
  );
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [totalProgress, setTotalProgress] = useState(0);

  // Prevent back navigation during processing
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isProcessing && !isCompleted) {
        Alert.alert(
          'Compression in Progress',
          'Compression is still in progress. Are you sure you want to cancel?',
          [
            { text: 'Continue', style: 'cancel' },
            { text: 'Cancel', style: 'destructive', onPress: () => navigation.goBack() }
          ]
        );
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [isProcessing, isCompleted, navigation]);

  // Start compression when component mounts
  useEffect(() => {
    console.log('🎬 CompressionProgressScreen mounted, starting compression...');
    console.log('Files to compress:', files.length);
    console.log('Compression settings:', compressionSettings);
    startCompression();
  }, []);

  const startCompression = async () => {
    setIsProcessing(true);
    console.log(`🚀 Starting compression of ${files.length} files`);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setCurrentFileIndex(i);

      // Update status to processing
      setFileProgress(prev => prev.map((fp, index) =>
        index === i ? { ...fp, status: 'processing' } : fp
      ));

      // Update progress immediately for current file
      setTotalProgress(i / files.length);

      try {
        console.log(`🗜️ Compressing file ${i + 1}/${files.length}: ${file.name}`);

        const result = await CompressionService.compressImage(
          file.uri,
          compressionSettings,
          file.name
        );

        if (result.success && result.outputPath) {
          // Update status to completed
          setFileProgress(prev => prev.map((fp, index) =>
            index === i ? { ...fp, status: 'completed', result } : fp
          ));

          // Add to history
          await conversionHistoryManager.addConversion({
            inputFileName: file.name,
            outputFileName: file.name.replace(/\.[^/.]+$/, '_compressed$&'),
            inputFormat: file.name.split('.').pop()?.toLowerCase() || 'unknown',
            outputFormat: compressionSettings.format || 'jpeg',
            outputPath: result.outputPath,
            conversionType: 'image',
            fileSize: result.compressedSize,
            success: true
          });

          console.log(`✅ Compression completed: ${file.name}`);
          console.log(`📊 Progress: ${i + 1}/${files.length} (${Math.round(((i + 1) / files.length) * 100)}%)`);
        } else {
          throw new Error(result.error || 'Compression failed');
        }

      } catch (error: any) {
        console.error(`❌ Compression failed for ${file.name}:`, error);

        // Update status to error
        setFileProgress(prev => prev.map((fp, index) =>
          index === i ? { ...fp, status: 'error', error: error.message } : fp
        ));

        // Add failed conversion to history
        await conversionHistoryManager.addConversion({
          inputFileName: file.name,
          outputFileName: file.name.replace(/\.[^/.]+$/, '_compressed$&'),
          inputFormat: file.name.split('.').pop()?.toLowerCase() || 'unknown',
          outputFormat: compressionSettings.format || 'jpeg',
          conversionType: 'image',
          success: false
        });
      }

      // Update total progress after each file
      setTotalProgress((i + 1) / files.length);
    }

    setIsProcessing(false);
    setIsCompleted(true);
    console.log('🎉 All compressions completed!');
  };

  const getStatusIcon = (status: FileProgress['status']) => {
    switch (status) {
      case 'pending': return 'clock-outline';
      case 'processing': return 'loading';
      case 'completed': return 'check-circle';
      case 'error': return 'alert-circle';
      default: return 'help-circle';
    }
  };

  const getStatusColor = (status: FileProgress['status']) => {
    switch (status) {
      case 'pending': return '#757575';
      case 'processing': return '#2196F3';
      case 'completed': return '#4CAF50';
      case 'error': return '#F44336';
      default: return '#757575';
    }
  };

  const handleShareFile = async (result: CompressionResult) => {
    if (!result.outputPath) return;

    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Sharing not available', 'Sharing is not available on this device.');
        return;
      }

      // Check if file exists
      const fileInfo = await FileSystem.getInfoAsync(result.outputPath);
      if (!fileInfo.exists) {
        Alert.alert('Error', 'File not found. It may have been moved or deleted.');
        return;
      }

      await Sharing.shareAsync(result.outputPath, {
        mimeType: 'image/jpeg',
        dialogTitle: 'Share compressed image'
      });

    } catch (error) {
      console.error('Error sharing file:', error);
      Alert.alert('Error', 'Failed to share file. Please try again.');
    }
  };

  const handleGoHome = () => {
    navigation.navigate('Home');
  };

  const completedFiles = fileProgress.filter(fp => fp.status === 'completed');
  const errorFiles = fileProgress.filter(fp => fp.status === 'error');
  const totalSavings = completedFiles.reduce((sum, fp) => {
    if (fp.result) {
      return sum + (fp.result.originalSize - fp.result.compressedSize);
    }
    return sum;
  }, 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.innerContainer}>
        {/* Header */}
        <Surface style={styles.headerCard} elevation={1}>
          <Text variant="headlineSmall" style={styles.title}>
            {isCompleted ? 'Compression Complete!' : 'Compressing Images...'}
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            {isCompleted
              ? `${completedFiles.length} of ${files.length} files compressed successfully`
              : `Processing ${currentFileIndex + 1} of ${files.length} files`
            }
          </Text>
        </Surface>

        {/* Overall Progress */}
        <Card style={styles.card}>
          <Card.Title
            title="Overall Progress"
            left={(props) => <IconButton icon="chart-line" {...props} />}
          />
          <Card.Content>
            <ProgressBar
              progress={totalProgress}
              style={styles.progressBar}
              color={theme.colors.primary}
            />
            <Text variant="bodySmall" style={styles.progressText}>
              {Math.round(totalProgress * 100)}% Complete
            </Text>
          </Card.Content>
        </Card>

        {/* File Details */}
        <Card style={styles.card}>
          <Card.Title
            title="File Details"
            left={(props) => <IconButton icon="file-document" {...props} />}
          />
          <Card.Content>
            {fileProgress.map((fp, index) => (
              <View key={index} style={styles.fileDetailRow}>
                <View style={styles.fileHeader}>
                  <IconButton
                    icon={getStatusIcon(fp.status)}
                    iconColor={getStatusColor(fp.status)}
                    size={20}
                  />
                  <Text variant="bodyMedium" style={styles.fileName} numberOfLines={1}>
                    {fp.file.name}
                  </Text>
                </View>

                {fp.result && (
                  <View style={styles.sizeDetails}>
                    <Text variant="bodySmall" style={styles.sizeText}>
                      Original: {CompressionService.formatFileSize(fp.result.originalSize)}
                    </Text>
                    <Text variant="bodySmall" style={styles.arrow}>→</Text>
                    <Text variant="bodySmall" style={styles.sizeText}>
                      Compressed: {CompressionService.formatFileSize(fp.result.compressedSize)}
                    </Text>
                    <Text
                      variant="bodySmall"
                      style={[styles.reduction, { color: CompressionService.getCompressionRatioColor(fp.result.compressionRatio) }]}
                    >
                      -{fp.result.compressionRatio.toFixed(1)}%
                    </Text>
                  </View>
                )}

                {fp.error && (
                  <Text variant="bodySmall" style={styles.errorText}>
                    Error: {fp.error}
                  </Text>
                )}
              </View>
            ))}
          </Card.Content>
        </Card>

        {/* Summary Stats */}
        {isCompleted && (
          <Card style={styles.card}>
            <Card.Title
              title="Compression Summary"
              left={(props) => <IconButton icon="chart-box" {...props} />}
            />
            <Card.Content>
              <View style={styles.statsRow}>
                <Chip icon="check-circle" textStyle={styles.chipText}>
                  {completedFiles.length} Successful
                </Chip>
                {errorFiles.length > 0 && (
                  <Chip icon="alert-circle" textStyle={styles.chipText}>
                    {errorFiles.length} Failed
                  </Chip>
                )}
              </View>

              {totalSavings > 0 && (
                <View style={styles.savingsContainer}>
                  <Text variant="bodyMedium" style={styles.savingsText}>
                    Total space saved: {CompressionService.formatFileSize(totalSavings)}
                  </Text>
                </View>
              )}

              {completedFiles.length > 0 && (
                <View style={styles.successContainer}>
                  <Text variant="bodyMedium" style={styles.successText}>
                    ✅ Compressed images saved to your Photos app in "ConvertPro" album
                  </Text>
                </View>
              )}
            </Card.Content>
          </Card>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {isCompleted ? (
            <>
              <Button
                mode="outlined"
                onPress={handleGoHome}
                style={styles.button}
                icon="home"
              >
                Go Home
              </Button>
              {completedFiles.length > 0 && (
                <Button
                  mode="contained"
                  onPress={() => completedFiles[0].result && handleShareFile(completedFiles[0].result)}
                  style={styles.button}
                  icon="share"
                >
                  Share First
                </Button>
              )}
            </>
          ) : (
            <Button
              mode="outlined"
              onPress={() => {
                Alert.alert(
                  'Cancel Compression',
                  'Are you sure you want to cancel the compression?',
                  [
                    { text: 'Continue', style: 'cancel' },
                    { text: 'Cancel', style: 'destructive', onPress: () => navigation.goBack() }
                  ]
                );
              }}
              style={[styles.button, { flex: 1 }]}
              disabled={!isProcessing}
            >
              Cancel
            </Button>
          )}
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
    padding: 16,
    backgroundColor: '#1E1E1E',
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
    backgroundColor: '#1E1E1E',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  progressText: {
    textAlign: 'center',
    color: '#FFFFFF',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  chipText: {
    color: '#FFFFFF',
  },
  savingsContainer: {
    padding: 12,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  savingsText: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  actionButtons: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
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
  fileDetailRow: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
  },
  fileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  fileName: {
    flex: 1,
    marginLeft: 8,
    color: '#FFFFFF',
  },
  sizeDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sizeText: {
    color: '#FFFFFF',
    opacity: 0.8,
  },
  arrow: {
    color: '#FFFFFF',
    opacity: 0.5,
    marginHorizontal: 8,
  },
  reduction: {
    fontWeight: 'bold',
    minWidth: 50,
    textAlign: 'right',
  },
  errorText: {
    color: '#F44336',
    marginTop: 4,
  },
  successContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  successText: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
});

export default CompressionProgressScreen;
