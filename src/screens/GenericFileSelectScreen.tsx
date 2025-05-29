import React, { useState } from 'react';
import { View, StyleSheet, Platform, Alert, Image, StatusBar as ReactNativeStatusBar } from 'react-native';
import {
  Text,
  Button,
  useTheme,
  Surface,
  IconButton,
  ActivityIndicator,
  Divider,
  List
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
// @ts-ignore TODO: Define RootStackParamList and MediaType in types.ts
import { RootStackParamList, MediaType } from '../types'; // Varsayılan yol, gerekirse güncellenmeli
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import RNFS from 'react-native-fs'; // Kullanılmıyor gibi ama referansta var

type GenericFileSelectScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'GenericFileSelect'>;
type GenericFileSelectScreenRouteProp = RouteProp<RootStackParamList, 'GenericFileSelect'>;

type GenericFileSelectScreenProps = {
  navigation: GenericFileSelectScreenNavigationProp;
  route: GenericFileSelectScreenRouteProp;
};

export const GenericFileSelectScreen = ({ navigation, route }: GenericFileSelectScreenProps) => {
  const theme = useTheme();
  // @ts-ignore TODO: conversionType HomeScreen'den gelecek
  const { conversionType } = route.params; // conversionType olarak güncellendi
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Array<{ uri: string; name: string }>>([]);


  // Get appropriate MIME types for file selection
  const getMimeTypes = () => {
    switch (conversionType) {
      case 'image':
        return ['image/webp', 'image/heic', 'image/heif', 'image/tiff', 'image/svg+xml', 'image/png', 'image/jpeg'];
      case 'audio':
        return ['audio/flac', 'audio/wav', 'audio/mpeg', 'audio/aac', 'audio/ogg', 'audio/mp4', 'audio/opus'];
      case 'video':
        return ['video/avi', 'video/x-matroska', 'video/mp4', 'video/webm', 'video/3gpp', 'video/quicktime'];
      case 'document':
        return ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'application/epub+zip', 'application/rtf', 'text/markdown'];
      default:
        return ['*/*'];
    }
  };

  // Request necessary permissions
  const requestPermissions = async () => {
    if (conversionType === 'image' || conversionType === 'video') {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'This app needs access to your media library to select files.');
        return false;
      }
    }
    // For DocumentPicker, permissions are generally handled by the system picker itself on Android.
    // On iOS, DocumentPicker doesn't require explicit permissions to access files via UIDocumentPickerViewController.
    return true;
  };

  // Handle file selection
  const handleSelectFile = async () => {
    try {
      setIsLoading(true);

      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        setIsLoading(false);
        return;
      }

      if (conversionType === 'image') {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: false, // Birden fazla dosya seçimi için false olmalı
          quality: 1,
          // allowsMultipleSelection: true, // expo-image-picker v13+
        });

        if (result.canceled || !result.assets || result.assets.length === 0) {
          setIsLoading(false);
          return;
        }

        // @ts-ignore TODO: result.assets null olabilir
        const newFile = { uri: result.assets[0].uri, name: result.assets[0].fileName || result.assets[0].uri.split('/').pop() || 'unknown.image' };
        // Kullanıcının birden fazla dosya eklemesine izin ver
        setSelectedFiles(prevFiles => [...prevFiles, newFile]);

      } else {
        const result = await DocumentPicker.getDocumentAsync({
          type: getMimeTypes(),
          copyToCacheDirectory: true,
          multiple: true, // Birden fazla dosya seçimi için
        });

        // @ts-ignore TODO: result.assets null olabilir
        if (result.canceled || !result.assets || result.assets.length === 0) {
          setIsLoading(false);
          return;
        }
        // @ts-ignore TODO: result.assets null olabilir
        const files = result.assets.map(asset => ({ uri: asset.uri, name: asset.name || asset.uri.split('/').pop() || 'unknown.file' }));
        setSelectedFiles(files);
      }
    } catch (error) {
      console.error('File selection error:', error);
      Alert.alert('Error', 'Failed to select file. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNavigateToSettings = () => {
    if (selectedFiles.length === 0) {
      Alert.alert('No Files Selected', 'Please select at least one file to proceed.');
      return;
    }
    navigation.navigate('GenericConversionSettings', {
      files: selectedFiles,
      conversionType
    });
  };

  // Mock file selection for demonstration
  const handleMockSelectFile = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      let mockFile = { uri: 'file:///mock/path/', name: '' };
      if (conversionType === 'image') mockFile.name = 'sample.webp';
      else if (conversionType === 'audio') mockFile.name = 'sample.flac';
      else if (conversionType === 'video') mockFile.name = 'sample.avi';
      else if (conversionType === 'document') mockFile.name = 'sample.docx';
      mockFile.uri += mockFile.name;
      setSelectedFiles([mockFile]);
    }, 1000);
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
            Select {conversionType} File(s)
          </Text>
        </View>
      </Surface>

      <View style={styles.content}>
        <Surface style={[styles.uploadCard, { backgroundColor: theme.colors.surfaceVariant }]} elevation={1}>
          <View style={styles.uploadContent}>
            <IconButton
              icon={conversionType === 'image' ? 'image-multiple' :
                   conversionType === 'audio' ? 'music-note-multiple' :
                   conversionType === 'video' ? 'video-multiple' : 'file-multiple'}
              size={64}
              iconColor={theme.colors.primary}
              style={styles.uploadIcon}
            />
            <Text variant="titleMedium" style={[styles.uploadText, { color: theme.colors.onSurfaceVariant }]}>
              {isLoading ? 'Loading...' : `Tap to select ${conversionType} file(s)`}
            </Text>
            {isLoading ? (
              <ActivityIndicator animating={true} size="large" style={styles.loader} color={theme.colors.primary} />
            ) : (
              <View style={styles.buttonContainer}>
                <Button
                  mode="contained"
                  onPress={handleSelectFile}
                  style={styles.actionButton}
                  icon="file-upload-outline"
                  disabled={isLoading}
                >
                  Browse Files
                </Button>
                <Button
                  mode="outlined"
                  onPress={handleMockSelectFile}
                  style={styles.actionButton}
                  icon="file-check-outline"
                  disabled={isLoading}
                >
                  Use Demo File
                </Button>
              </View>
            )}
          </View>
        </Surface>

        {selectedFiles.length > 0 && (
          <View style={styles.fileListContainer}>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>Selected Files:</Text>
            <List.Section>
              {selectedFiles.map((file, index) => (
                <List.Item
                  key={index}
                  title={file.name}
                  description={file.uri}
                  descriptionNumberOfLines={1}
                  titleStyle={{color: theme.colors.onSurfaceVariant}}
                  descriptionStyle={{color: theme.colors.onSurfaceVariant}}
                  left={props =>
                    conversionType === 'image' && file.uri ?
                    <Image source={{ uri: file.uri }} style={styles.thumbnail} /> :
                    <List.Icon {...props} icon="file-outline" color={theme.colors.primary} />
                  }
                  right={props =>
                    <IconButton
                      {...props}
                      icon="close-circle"
                      size={20}
                      onPress={() => setSelectedFiles(files => files.filter((_, i) => i !== index))}
                      iconColor={theme.colors.error}
                    />
                  }
                  style={[styles.listItem, {backgroundColor: theme.colors.surfaceVariant}]}
                />
              ))}
            </List.Section>
            <Button
              mode="contained"
              onPress={handleNavigateToSettings}
              style={styles.nextButton}
              icon="arrow-right-circle-outline"
              disabled={selectedFiles.length === 0 || isLoading}
            >
              Next
            </Button>
          </View>
        )}

        {selectedFiles.length === 0 && (
          <>
            <Divider style={[styles.divider, {backgroundColor: theme.colors.outline}] } />
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
              Supported Input Formats
            </Text>
            <List.Section>
              {conversionType === 'image' && (
                <>
                  <List.Item title=".webp, .heic, .heif, .tiff, .svg, .png, .jpg, .jpeg" titleStyle={{color: theme.colors.onSurfaceVariant}} left={props => <List.Icon {...props} icon="image" color={theme.colors.primary} />} />
                </>
              )}
              {conversionType === 'audio' && (
                <>
                  <List.Item title=".flac, .wav, .mp3, .aac, .ogg, .m4a, .opus" titleStyle={{color: theme.colors.onSurfaceVariant}} left={props => <List.Icon {...props} icon="music-note" color={theme.colors.primary} />} />
                </>
              )}
              {conversionType === 'video' && (
                <>
                  <List.Item title=".avi, .mkv, .mp4, .webm, .3gp, .mov" titleStyle={{color: theme.colors.onSurfaceVariant}} left={props => <List.Icon {...props} icon="video" color={theme.colors.primary} />} />
                </>
              )}
              {conversionType === 'document' && (
                <>
                  <List.Item title=".pdf, .docx, .txt, .epub, .rtf, .md" titleStyle={{color: theme.colors.onSurfaceVariant}} left={props => <List.Icon {...props} icon="file-document" color={theme.colors.primary} />} />
                </>
              )}
            </List.Section>
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    // backgroundColor: 'transparent', // Temadan alacak
    paddingTop: Platform.OS === 'android' ? ReactNativeStatusBar.currentHeight : 20, // Adjusted for status bar
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8, // Added padding
  },
  title: {
    fontWeight: 'bold',
    marginLeft: 16, // Added margin
  },
  content: {
    flex: 1,
    padding: 16,
  },
  uploadCard: {
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
  },
  uploadContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadIcon: {
    marginBottom: 16,
  },
  uploadText: {
    marginBottom: 24,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around', // Changed to space-around for better spacing
    width: '100%', // Ensure buttons take full width
  },
  actionButton: {
    marginTop: 8,
    flex: 1, // Allow buttons to share space
    marginHorizontal: 4, // Add some space between buttons
  },
  loader: {
    marginTop: 16,
  },
  fileListContainer: {
    marginTop: 16,
  },
  listItem: {
    borderRadius: 8,
    marginBottom: 8,
    // backgroundColor will be set from theme
  },
  thumbnail: {
    width: 40,
    height: 40,
    borderRadius: 4,
    marginRight: 16,
    marginLeft: 8, // Align with List.Icon default margin
  },
  nextButton: {
    marginTop: 24,
  },
  divider: {
    marginVertical: 24,
  },
  sectionTitle: {
    marginBottom: 8, // Reduced margin
    // color will be set from theme
  },
});

export default GenericFileSelectScreen;