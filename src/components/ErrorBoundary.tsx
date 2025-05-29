import React, { Component, ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: string;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo: errorInfo.componentStack || undefined,
    });
  }

  handleRestart = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <ErrorFallback error={this.state.error} onRestart={this.handleRestart} />;
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error?: Error;
  onRestart: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, onRestart }) => {
  return (
    <SafeAreaView style={styles.container}>
      <Surface style={styles.surface} elevation={2}>
        <Text variant="headlineSmall" style={styles.title}>
          Oops! Something went wrong
        </Text>
        <Text variant="bodyMedium" style={styles.message}>
          The app encountered an unexpected error. Don't worry, your data is safe.
        </Text>
        {__DEV__ && error && (
          <View style={styles.errorDetails}>
            <Text variant="labelMedium" style={styles.errorTitle}>
              Error Details (Development Mode):
            </Text>
            <Text variant="bodySmall" style={styles.errorText}>
              {error.message}
            </Text>
          </View>
        )}
        <Button
          mode="contained"
          onPress={onRestart}
          style={styles.button}
          icon="restart"
        >
          Try Again
        </Button>
      </Surface>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  surface: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: 'bold',
  },
  message: {
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.8,
  },
  errorDetails: {
    width: '100%',
    marginBottom: 24,
    padding: 12,
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    borderRadius: 8,
  },
  errorTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#d32f2f',
  },
  errorText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#d32f2f',
  },
  button: {
    paddingHorizontal: 24,
  },
});

export default ErrorBoundary;
