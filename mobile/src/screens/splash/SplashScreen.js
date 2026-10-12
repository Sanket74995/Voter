import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, typography, spacing } from '../../theme/colors';

export const SplashScreen = ({ onFinish }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 1200);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <View style={styles.container}>
      <View style={styles.badgeIcon}>
        <Text style={styles.badgeIconText}>🗳️</Text>
      </View>
      <Text style={styles.title}>Blockchain Voting</Text>
      <Text style={styles.tagline}>
        Verifiable. Privacy-Preserving. Immutable.
      </Text>
      <View style={styles.indicatorContainer}>
        <ActivityIndicator color={colors.accent} size="small" />
        <Text style={styles.loadingText}>Initializing cryptographic workspace...</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  badgeIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  badgeIconText: {
    fontSize: 40,
  },
  title: {
    ...typography.titleLarge,
    color: colors.textInverse,
    marginBottom: spacing.xs,
  },
  tagline: {
    ...typography.bodyMedium,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  indicatorContainer: {
    position: 'absolute',
    bottom: spacing.xxl,
    alignItems: 'center',
  },
  loadingText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
});
