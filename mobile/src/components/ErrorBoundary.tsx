import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { designTokens } from '../theme/designTokens';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Catches render errors anywhere in the subtree and shows a friendly
 * fallback instead of a red screen / dead app. Tap "Try again" to reset.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log for diagnostics; never crash the app over logging.
    try {
      // eslint-disable-next-line no-console
      console.error('[ErrorBoundary]', error.message, info.componentStack?.slice(0, 500));
    } catch {
      /* noop */
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.root}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.sub}>
            The app hit an unexpected error. Your data is safe — try again.
          </Text>
          <TouchableOpacity style={styles.btn} onPress={this.handleRetry} activeOpacity={0.8}>
            <Text style={styles.btnText}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const C = designTokens.colors;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: C.background,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: C.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  sub: {
    fontSize: 14,
    color: C.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  btn: {
    backgroundColor: C.primary,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
