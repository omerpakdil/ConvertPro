import React, { useState } from 'react';
import { SafeAreaView, StyleSheet, View, ScrollView, Platform, StatusBar, Alert } from 'react-native';
import {
  Text,
  Button,
  useTheme,
  Surface,
  SegmentedButtons,
  Divider,
  Card,
  IconButton,
  ActivityIndicator
} from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App'; // RootStackParamList App.tsx'den import edilecek
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

type HomeScreenProps = {
  navigation: HomeScreenNavigationProp;
};

export const HomeScreen = ({ navigation }: HomeScreenProps) => {
  const theme = useTheme();
  const [conversionType, setConversionType] = useState<'image' | 'audio' | 'video' | 'document'>('image');
  const [isLoading, setIsLoading] = useState(false);

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

  // Request permissions
  const requestPermissions = async () => {
    if (conversionType === 'image') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Sorry, we need camera roll permissions to make this work!');
        return false;
      }
    }
    return true;
  };

  // Handle file selection and navigate directly to settings
  const handleSelectFile = async () => {
    try {
      setIsLoading(true);

      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        setIsLoading(false);
        return;
      }

      let selectedFiles: Array<{ uri: string; name: string }> = [];

      if (conversionType === 'image') {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: 'images',
          allowsEditing: false,
          quality: 1,
        });

        if (result.canceled || !result.assets || result.assets.length === 0) {
          setIsLoading(false);
          return;
        }

        const newFile = {
          uri: result.assets[0].uri,
          name: result.assets[0].fileName || result.assets[0].uri.split('/').pop() || 'unknown.image'
        };
        selectedFiles = [newFile];

      } else {
        const result = await DocumentPicker.getDocumentAsync({
          type: getMimeTypes(),
          copyToCacheDirectory: true,
          multiple: true,
        });

        if (result.canceled || !result.assets || result.assets.length === 0) {
          setIsLoading(false);
          return;
        }

        selectedFiles = result.assets.map(asset => ({
          uri: asset.uri,
          name: asset.name || asset.uri.split('/').pop() || 'unknown.file'
        }));
      }

      // Navigate directly to conversion settings with selected files
      if (selectedFiles.length > 0) {
        navigation.navigate('GenericConversionSettings', {
          files: selectedFiles,
          conversionType
        });
      }

    } catch (error) {
      console.error('File selection error:', error);
      Alert.alert('Error', 'Failed to select file. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="light-content" />
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
          onValueChange={setConversionType}
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
            Select a {conversionType} file to convert
          </Text>
          <Text variant="bodyMedium" style={styles.cardText}>
            {conversionType === 'image' && 'Supported formats: WebP, HEIC, BMP, PNG, JPEG, TIFF, SVG, RAW'}
            {conversionType === 'audio' && 'Supported formats: FLAC, WAV, MP3, AAC, OGG, M4A, OPUS, ALAC'}
            {conversionType === 'video' && 'Supported formats: AVI, MKV, MOV, MP4, WebM, HEVC, 3GP'}
            {conversionType === 'document' && 'Supported formats: PDF, DOCX, TXT, EPUB, RTF, MD'}
          </Text>
          <Button
            mode="contained"
            onPress={handleSelectFile}
            icon="file-upload"
            style={styles.button}
            loading={isLoading}
            disabled={isLoading}
          >
            {isLoading ? 'Selecting...' : 'Select File'}
          </Button>
        </Surface>

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
  recentTitle: {
    marginBottom: 12,
  },
  recentCard: {
    marginBottom: 12,
    borderRadius: 12,
  },
});