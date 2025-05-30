import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Text,
  Button,
  Card,
  ProgressBar,
  Surface,
  IconButton,
  useTheme
} from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import AudioCompressionService, { AudioCompressionSettings, AudioCompressionResult } from '../services/AudioCompressionService';
import conversionHistoryManager from '../utils/conversionHistory';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

type RootStackParamList = {
  AudioCompressionProgress: {
    files: Array<{ uri: string; name: string }>;
    compressionSettings: AudioCompressionSettings;
  };
  Home: undefined;
};

type AudioCompressionProgressScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AudioCompressionProgress'>;
  route: RouteProp<RootStackParamList, 'AudioCompressionProgress'>;
};

interface FileProgress {
  file: { uri: string; name: string };
  status: 'pending' | 'processing' | 'completed' | 'error';
  result?: AudioCompressionResult;
  error?: string;
  progress: number; // 0-100
}

export const AudioCompressionProgressScreen = ({ navigation, route }: AudioCompressionProgressScreenProps) => {
  const theme = useTheme();
  const { files, compressionSettings } = route.params;

  const [fileProgress, setFileProgress] = useState<FileProgress[]>(
    files.map(file => ({ file, status: 'pending', progress: 0 }))
  );
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [totalProgress, setTotalProgress] = useState(0);

  // Start compression when component mounts
  useEffect(() => {
    console.log('🎵 AudioCompressionProgressScreen mounted');
    console.log('Files to compress:', files.length);
    console.log('Settings:', compressionSettings);
    
    startCompression();
  }, []);

  const startCompression = async () => {
    console.log('🎵 Starting compression process...');
    setIsProcessing(true);
    
    for (let i = 0; i < files.length; i++) {
      console.log(`🎵 Processing file ${i + 1}/${files.length}: ${files[i].name}`);
      
      setCurrentFileIndex(i);
      
      // Update file status to processing
      setFileProgress(prev => prev.map((fp, index) => 
        index === i ? { ...fp, status: 'processing', progress: 0 } : fp
      ));

      // Start progress simulation for current file
      let currentProgress = 0;
      const progressInterval = setInterval(() => {
        currentProgress += 15; // Increase by 15% every 300ms
        if (currentProgress > 90) currentProgress = 90; // Cap at 90%
        
        console.log(`📊 File ${i + 1} progress: ${currentProgress}%`);
        
        // Update current file progress
        setFileProgress(prev => prev.map((fp, index) => 
          index === i ? { ...fp, progress: currentProgress } : fp
        ));
        
        // Update total progress
        const completedFiles = i;
        const totalFiles = files.length;
        const overallProgress = (completedFiles + (currentProgress / 100)) / totalFiles;
        setTotalProgress(overallProgress);
        
        console.log(`📊 Total progress: ${(overallProgress * 100).toFixed(1)}%`);
      }, 300);

      try {
        // Actual compression
        const result = await AudioCompressionService.getInstance().compressAudio(
          files[i].uri,
          compressionSettings,
          files[i].name
        );

        // Clear progress interval
        clearInterval(progressInterval);
        
        console.log(`✅ Compression result for ${files[i].name}:`, result);

        // Update file progress to completed
        setFileProgress(prev => prev.map((fp, index) => 
          index === i ? { 
            ...fp, 
            status: result.success ? 'completed' : 'error',
            progress: 100,
            result: result.success ? result : undefined,
            error: result.success ? undefined : result.error
          } : fp
        ));

        // Save to history if successful
        if (result.success) {
          await conversionHistoryManager.addConversion({
            inputFileName: files[i].name,
            outputFileName: result.outputPath?.split('/').pop() || 'compressed_audio',
            inputFormat: files[i].name.split('.').pop() || 'unknown',
            outputFormat: compressionSettings.format,
            conversionType: 'audio',
            success: true,
            outputPath: result.outputPath
          });
        }

      } catch (error) {
        console.error(`❌ Compression failed for ${files[i].name}:`, error);
        
        // Clear progress interval
        clearInterval(progressInterval);
        
        setFileProgress(prev => prev.map((fp, index) => 
          index === i ? { 
            ...fp, 
            status: 'error',
            progress: 0,
            error: error instanceof Error ? error.message : 'Unknown error'
          } : fp
        ));
      }

      // Update total progress for completed file
      const completedFiles = i + 1;
      const totalFiles = files.length;
      setTotalProgress(completedFiles / totalFiles);
      
      console.log(`📊 File ${i + 1}/${files.length} completed. Total progress: ${((completedFiles / totalFiles) * 100).toFixed(1)}%`);
    }

    setIsProcessing(false);
    setIsCompleted(true);
    console.log('🎉 All files processed!');
  };

  const handleShareFile = async (result: AudioCompressionResult) => {
    if (!result.outputPath) return;

    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Sharing not available', 'Sharing is not available on this device.');
        return;
      }

      const fileInfo = await FileSystem.getInfoAsync(result.outputPath);
      if (!fileInfo.exists) {
        Alert.alert('Error', 'File not found. It may have been moved or deleted.');
        return;
      }

      await Sharing.shareAsync(result.outputPath, {
        mimeType: 'audio/mpeg',
        dialogTitle: 'Share compressed audio'
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.innerContainer}>
        {/* Header */}
        <Surface style={styles.headerCard} elevation={1}>
          <Text variant="headlineSmall" style={styles.title}>
            {isCompleted ? 'Compression Complete!' : 'Compressing Audio...'}
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

        {/* Current File Progress */}
        {isProcessing && (
          <Card style={styles.card}>
            <Card.Title
              title={`Current File: ${files[currentFileIndex]?.name || 'Unknown'}`}
              left={(props) => <IconButton icon="music-note" {...props} />}
            />
            <Card.Content>
              <ProgressBar
                progress={fileProgress[currentFileIndex]?.progress / 100 || 0}
                style={styles.progressBar}
                color={theme.colors.secondary}
              />
              <Text variant="bodySmall" style={styles.progressText}>
                {fileProgress[currentFileIndex]?.progress || 0}% Complete
              </Text>
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
  actionButtons: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#121212',
    borderTopWidth: 1,
    borderTopColor: '#333333',
    gap: 12,
  },
  button: {
    flex: 1,
  },
});

export default AudioCompressionProgressScreen;
