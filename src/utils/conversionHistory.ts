import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

export interface ConversionHistoryItem {
  id: string;
  inputFileName: string;
  outputFileName: string;
  inputFormat: string;
  outputFormat: string;
  conversionType: 'image' | 'audio' | 'video';
  timestamp: number;
  success: boolean;
  outputPath?: string;
  fileSize?: number;
}

const STORAGE_KEY = 'conversion_history';
const MAX_HISTORY_ITEMS = 50; // Keep last 50 conversions

// Storage wrapper to handle both AsyncStorage and SecureStore
class StorageWrapper {
  // Check if we're in Expo Go environment
  private static isExpoGo(): boolean {
    try {
      // Check if we're in Expo Go by looking at the execution environment
      return Constants.executionEnvironment === 'storeClient';
    } catch {
      // If Constants is not available, assume we're in a development build
      return false;
    }
  }

  static async setItem(key: string, value: string): Promise<void> {
    if (this.isExpoGo()) {
      // Use SecureStore for Expo Go
      try {
        await SecureStore.setItemAsync(key, value);
      } catch (error) {
        console.error('SecureStore error:', error);
        throw error;
      }
    } else {
      // Use AsyncStorage for development/production builds
      try {
        await AsyncStorage.setItem(key, value);
      } catch (error) {
        console.error('AsyncStorage error:', error);
        // Fallback to SecureStore if AsyncStorage fails
        try {
          await SecureStore.setItemAsync(key, value);
        } catch (secureError) {
          console.error('SecureStore fallback error:', secureError);
          throw secureError;
        }
      }
    }
  }

  static async getItem(key: string): Promise<string | null> {
    if (this.isExpoGo()) {
      // Use SecureStore for Expo Go
      try {
        return await SecureStore.getItemAsync(key);
      } catch (error) {
        console.error('SecureStore error:', error);
        return null;
      }
    } else {
      // Use AsyncStorage for development/production builds
      try {
        return await AsyncStorage.getItem(key);
      } catch (error) {
        console.error('AsyncStorage error:', error);
        // Fallback to SecureStore if AsyncStorage fails
        try {
          return await SecureStore.getItemAsync(key);
        } catch (secureError) {
          console.error('SecureStore fallback error:', secureError);
          return null;
        }
      }
    }
  }

  static async removeItem(key: string): Promise<void> {
    if (this.isExpoGo()) {
      // Use SecureStore for Expo Go
      try {
        await SecureStore.deleteItemAsync(key);
      } catch (error) {
        console.error('SecureStore error:', error);
        throw error;
      }
    } else {
      // Use AsyncStorage for development/production builds
      try {
        await AsyncStorage.removeItem(key);
      } catch (error) {
        console.error('AsyncStorage error:', error);
        // Fallback to SecureStore if AsyncStorage fails
        try {
          await SecureStore.deleteItemAsync(key);
        } catch (secureError) {
          console.error('SecureStore fallback error:', secureError);
          throw secureError;
        }
      }
    }
  }
}

class ConversionHistoryManager {
  // Add a new conversion to history
  async addConversion(item: Omit<ConversionHistoryItem, 'id' | 'timestamp'>): Promise<void> {
    try {
      const history = await this.getHistory();

      const newItem: ConversionHistoryItem = {
        ...item,
        id: Date.now().toString() + Math.random().toString(36).substring(2, 11),
        timestamp: Date.now(),
      };

      // Add to beginning of array (most recent first)
      history.unshift(newItem);

      // Keep only the most recent items
      const trimmedHistory = history.slice(0, MAX_HISTORY_ITEMS);

      await StorageWrapper.setItem(STORAGE_KEY, JSON.stringify(trimmedHistory));
    } catch (error) {
      console.error('Error adding conversion to history:', error);
    }
  }

  // Get all conversion history
  async getHistory(): Promise<ConversionHistoryItem[]> {
    try {
      const historyJson = await StorageWrapper.getItem(STORAGE_KEY);
      if (historyJson) {
        return JSON.parse(historyJson);
      }
      return [];
    } catch (error) {
      console.error('Error getting conversion history:', error);
      return [];
    }
  }

  // Get recent conversions (last N items)
  async getRecentConversions(limit: number = 5): Promise<ConversionHistoryItem[]> {
    try {
      const history = await this.getHistory();
      return history.slice(0, limit);
    } catch (error) {
      console.error('Error getting recent conversions:', error);
      return [];
    }
  }

  // Get conversions by type
  async getConversionsByType(type: 'image' | 'audio' | 'video'): Promise<ConversionHistoryItem[]> {
    try {
      const history = await this.getHistory();
      return history.filter(item => item.conversionType === type);
    } catch (error) {
      console.error('Error getting conversions by type:', error);
      return [];
    }
  }

  // Get successful conversions only
  async getSuccessfulConversions(): Promise<ConversionHistoryItem[]> {
    try {
      const history = await this.getHistory();
      return history.filter(item => item.success);
    } catch (error) {
      console.error('Error getting successful conversions:', error);
      return [];
    }
  }

  // Clear all history
  async clearHistory(): Promise<void> {
    try {
      await StorageWrapper.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing conversion history:', error);
    }
  }

  // Remove specific conversion
  async removeConversion(id: string): Promise<void> {
    try {
      const history = await this.getHistory();
      const filteredHistory = history.filter(item => item.id !== id);
      await StorageWrapper.setItem(STORAGE_KEY, JSON.stringify(filteredHistory));
    } catch (error) {
      console.error('Error removing conversion from history:', error);
    }
  }

  // Get conversion statistics
  async getStats(): Promise<{
    totalConversions: number;
    successfulConversions: number;
    failedConversions: number;
    imageConversions: number;
    audioConversions: number;
    videoConversions: number;
  }> {
    try {
      const history = await this.getHistory();

      return {
        totalConversions: history.length,
        successfulConversions: history.filter(item => item.success).length,
        failedConversions: history.filter(item => !item.success).length,
        imageConversions: history.filter(item => item.conversionType === 'image').length,
        audioConversions: history.filter(item => item.conversionType === 'audio').length,
        videoConversions: history.filter(item => item.conversionType === 'video').length,
      };
    } catch (error) {
      console.error('Error getting conversion stats:', error);
      return {
        totalConversions: 0,
        successfulConversions: 0,
        failedConversions: 0,
        imageConversions: 0,
        audioConversions: 0,
        videoConversions: 0,
      };
    }
  }

  // Format relative time
  formatRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) {
      return 'Just now';
    } else if (minutes < 60) {
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (hours < 24) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (days < 7) {
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else {
      return new Date(timestamp).toLocaleDateString();
    }
  }
}

export default new ConversionHistoryManager();
