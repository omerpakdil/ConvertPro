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

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

type HomeScreenProps = {
  navigation: HomeScreenNavigationProp;
};

export const HomeScreen = ({ navigation }: HomeScreenProps) => {
  const theme = useTheme();
  const [conversionType, setConversionType] = useState<'image' | 'audio' | 'video' | 'document'>('image');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Array<{ uri: string; name: string }>>([]);

  // Get appropriate MIME types for file selection
  const getMimeTypes = () => {
    switch (conversionType) {
      case 'image':
        return ['image/webp', 'image/heic', 'image/heif', 'image/tiff', 'image/svg+xml', 'image/png', 'image/jpeg'];
      case 'audio':
        return ['audio/flac', 'audio/wav', 'audio/mpeg', 'audio/aac', 'audio/ogg', 'audio/mp4'];
      case 'video':
        return ['video/avi', 'video/x-matroska', 'video/mp4', 'video/quicktime'];
      case 'document':
        return ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/html', 'application/epub+zip', 'application/rtf', 'text/markdown'];
      default:
        return ['*/*'];
    }
  };

  // Request permissions using new permission system
  const requestPermissions = async (): Promise<boolean> => {
    try {
      const { allGranted } = await requestAllRequiredPermissions(conversionType, true);
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
      if (conversionType === 'image') {
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

      } else {
        const result = await DocumentPicker.getDocumentAsync({
          type: getMimeTypes(),
          copyToCacheDirectory: true,
          multiple: true,
        });

        if (result.canceled || !result.assets || result.assets.length === 0) {
          return;
        }

        rawFiles = result.assets.map(asset => ({
          uri: asset.uri,
          name: asset.name || asset.uri.split('/').pop() || 'unknown.file'
        }));
      }

      // Validate selected files
      const { validFiles, invalidFiles } = await validateFiles(rawFiles, conversionType as MediaType);

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
    navigation.navigate('GenericConversionSettings', {
      files: selectedFiles,
      conversionType
    });
  };

  // Reset selected files when conversion type changes
  const handleConversionTypeChange = (newType: 'image' | 'audio' | 'video' | 'document') => {
    setConversionType(newType);
    setSelectedFiles([]); // Clear selected files when type changes
  };

  // Clear selected files when screen comes into focus (user returns from other screens)
  useFocusEffect(
    React.useCallback(() => {
      // Clear selected files when returning to home screen
      setSelectedFiles([]);
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
        <SegmentedButtons
          value={conversionType}
          onValueChange={handleConversionTypeChange}
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
            {
              value: 'document',
              icon: 'file-document',
              label: 'Document',
            },
          ]}
          style={styles.segmentedButton}
        />

        <Divider style={styles.divider} />

        <Surface style={styles.card} elevation={1}>
          <Text variant="titleMedium" style={styles.cardTitle}>
            Select {conversionType} file(s) to convert
          </Text>
          <Text variant="bodyMedium" style={styles.cardText}>
            {conversionType === 'image' && 'Supported formats: WebP, HEIC, BMP, PNG, JPEG, TIFF, SVG, RAW'}
            {conversionType === 'audio' && 'Supported formats: FLAC, WAV, MP3, AAC, OGG, M4A, ALAC'}
            {conversionType === 'video' && 'Supported formats: AVI, MKV, MOV, MP4'}
            {conversionType === 'document' && 'Supported formats: PDF, DOCX, TXT, HTML, EPUB, RTF, MD'}
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
                  left={(props) =>
                    conversionType === 'image' ? (
                      <Image source={{ uri: file.uri }} style={styles.fileThumbnail} />
                    ) : (
                      <List.Icon
                        {...props}
                        icon={
                          conversionType === 'audio' ? 'music-note' :
                          conversionType === 'video' ? 'video' : 'file-document'
                        }
                      />
                    )
                  }
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

        <Card style={styles.recentCard}>
          <Card.Title
            title="beach.webp → beach.jpg"
            subtitle="Image • 2 minutes ago"
            left={(props) => <IconButton icon="image" {...props} />}
            right={(props) => <IconButton icon="share" {...props} />}
          />
        </Card>

        <Card style={styles.recentCard}>
          <Card.Title
            title="lecture.flac → lecture.mp3"
            subtitle="Audio • Yesterday"
            left={(props) => <IconButton icon="music-note" {...props} />}
            right={(props) => <IconButton icon="share" {...props} />}
          />
        </Card>

        <Card style={styles.recentCard}>
          <Card.Title
            title="report.docx → report.pdf"
            subtitle="Document • 3 days ago"
            left={(props) => <IconButton icon="file-document" {...props} />}
            right={(props) => <IconButton icon="share" {...props} />}
          />
        </Card>
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
});