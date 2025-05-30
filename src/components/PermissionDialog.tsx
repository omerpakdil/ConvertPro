import React from 'react';
import { StyleSheet } from 'react-native';
import {
  Dialog,
  Portal,
  Text,
  Button,
  Surface,
  useTheme
} from 'react-native-paper';

interface PermissionDialogProps {
  visible: boolean;
  onDismiss: () => void;
  onAllow: () => void;
  onDeny: () => void;
  title: string;
  message: string;
  icon?: string;
}

export const PermissionDialog: React.FC<PermissionDialogProps> = ({
  visible,
  onDismiss,
  onAllow,
  onDeny,
  title,
  message,
  icon = 'shield-check'
}) => {
  const theme = useTheme();

  return (
    <Portal>
      <Dialog 
        visible={visible} 
        onDismiss={onDismiss}
        style={[styles.dialog, { backgroundColor: theme.colors.surface }]}
      >
        <Surface style={styles.header} elevation={0}>
          <Text variant="headlineSmall" style={styles.title}>
            {title}
          </Text>
        </Surface>
        
        <Dialog.Content style={styles.content}>
          <Text variant="bodyMedium" style={styles.message}>
            {message}
          </Text>
          
          <Text variant="bodySmall" style={styles.note}>
            This permission is required to save your compressed images to your Photos app where you can easily find and share them.
          </Text>
        </Dialog.Content>
        
        <Dialog.Actions style={styles.actions}>
          <Button 
            mode="outlined" 
            onPress={onDeny}
            style={styles.button}
          >
            Not Now
          </Button>
          <Button 
            mode="contained" 
            onPress={onAllow}
            style={styles.button}
          >
            Allow Access
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const styles = StyleSheet.create({
  dialog: {
    borderRadius: 16,
    marginHorizontal: 20,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    backgroundColor: 'transparent',
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#FFFFFF',
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  message: {
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
    color: '#FFFFFF',
  },
  note: {
    textAlign: 'center',
    opacity: 0.7,
    fontStyle: 'italic',
    color: '#FFFFFF',
  },
  actions: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    marginHorizontal: 4,
  },
});

export default PermissionDialog;
