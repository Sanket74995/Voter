import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors, typography, spacing } from '../../theme/colors';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';

export const OnboardingScreen = ({ onGetStarted }) => {
  const principles = [
    {
      icon: '🛡️',
      title: 'One-Time Anonymous Credentials',
      description: 'Your voter identity is decoupled from your ballot choice using single-use cryptographic nullifiers.',
    },
    {
      icon: '🔒',
      title: 'End-to-End Encrypted Ballots',
      description: 'Selections are encrypted on your phone before submission. No individual choice is readable prior to tallying.',
    },
    {
      icon: '⛓️',
      title: 'Smart Contract Enforcement',
      description: 'Transactions are permanently anchored on EVM smart contracts, preventing double-voting and tampering.',
    },
    {
      icon: '🔍',
      title: 'Independent Public Verifiability',
      description: 'Anyone can independently audit published election tallies and verify inclusion of valid ballots.',
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerArea}>
          <Text style={styles.welcomeText}>Welcome to</Text>
          <Text style={styles.mainTitle}>Decentralized Civic Voting</Text>
          <Text style={styles.subtitle}>
            A verified blockchain architecture engineered for academic integrity, zero coercion, and privacy.
          </Text>
        </View>

        <View style={styles.cardsArea}>
          {principles.map((item, index) => (
            <Card key={index} style={styles.principleCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.principleIcon}>{item.icon}</Text>
                <Text style={styles.principleTitle}>{item.title}</Text>
              </View>
              <Text style={styles.principleDesc}>{item.description}</Text>
            </Card>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button title="Continue to Sign In" onPress={onGetStarted} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  headerArea: {
    marginBottom: spacing.xl,
  },
  welcomeText: {
    ...typography.bodyMedium,
    color: colors.accent,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  mainTitle: {
    ...typography.titleLarge,
    color: colors.primary,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  cardsArea: {
    marginBottom: spacing.lg,
  },
  principleCard: {
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  principleIcon: {
    fontSize: 22,
    marginRight: spacing.sm,
  },
  principleTitle: {
    ...typography.titleSmall,
    color: colors.primary,
    flex: 1,
  },
  principleDesc: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    marginLeft: 30,
  },
  footer: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
