import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  StatusBar,
} from 'react-native';
import { colors, typography, spacing, radius, shadows } from '../../theme/colors';
import { Button } from '../../components/Button';

const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 0;

export const OnboardingScreen = ({ onGetStarted }) => {
  const features = [
    {
      icon: '🛡️',
      tag: 'ANONYMOUS',
      tagBg: '#ECFDF5',
      tagBorder: '#A7F3D0',
      tagColor: '#047857',
      iconBg: '#ECFDF5',
      title: '100% Anonymous & Secret',
      description:
        'Nobody can ever see who you voted for. Your identity is completely separated from your ballot before submission.',
    },
    {
      icon: '🔒',
      tag: 'ENCRYPTED',
      tagBg: '#EFF6FF',
      tagBorder: '#BFDBFE',
      tagColor: '#1D4ED8',
      iconBg: '#EFF6FF',
      title: 'Protected on Your Phone',
      description:
        'Your choices are locked right inside your phone. No one can peek at or alter your ballot along the way.',
    },
    {
      icon: '⛓️',
      tag: 'TAMPER-PROOF',
      tagBg: '#F5F3FF',
      tagBorder: '#DDD6FE',
      tagColor: '#6D28D9',
      iconBg: '#F5F3FF',
      title: 'Fair & Tamper-Proof',
      description:
        'Smart contracts strictly ensure each registered person can only vote once. No vote can be deleted or changed.',
    },
    {
      icon: '✅',
      tag: 'TRANSPARENT',
      tagBg: '#FFFBEB',
      tagBorder: '#FDE68A',
      tagColor: '#B45309',
      iconBg: '#FFFBEB',
      title: 'Verifiable Results',
      description:
        'Once voting ends, anyone can inspect the official results and verify that every vote was counted honestly.',
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" translucent />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Hero Area */}
        <View style={styles.headerArea}>
          <View style={styles.badgeRow}>
            <View style={styles.heroBadge}>
              <View style={styles.livePulseDot} />
              <Text style={styles.heroBadgeText}>SECURE CIVIC VOTING</Text>
            </View>
          </View>

          <Text style={styles.mainTitle}>
            Vote Privately.{'\n'}
            <Text style={styles.mainTitleAccent}>Trust Completely.</Text>
          </Text>

          <Text style={styles.subtitle}>
            A modern voting app built on tamper-proof blockchain technology. Your vote is completely
            secret, easy to cast, and counted with 100% accuracy.
          </Text>
        </View>

        {/* Feature Cards Grid */}
        <View style={styles.cardsArea}>
          {features.map((item, index) => (
            <View key={index} style={styles.featureCard}>
              <View style={styles.cardTopRow}>
                <View style={[styles.iconContainer, { backgroundColor: item.iconBg }]}>
                  <Text style={styles.featureIcon}>{item.icon}</Text>
                </View>
                <View
                  style={[
                    styles.tagBadge,
                    {
                      backgroundColor: item.tagBg,
                      borderColor: item.tagBorder,
                    },
                  ]}
                >
                  <Text style={[styles.tagText, { color: item.tagColor }]}>{item.tag}</Text>
                </View>
              </View>

              <Text style={styles.featureTitle}>{item.title}</Text>
              <Text style={styles.featureDesc}>{item.description}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Floating Bottom Action with Always-Visible Trust Guarantee */}
      <View style={styles.footer}>
        <Button
          title="Get Started — Sign In →"
          onPress={onGetStarted}
          style={styles.signInButton}
        />

        <View style={styles.trustBanner}>
          <Text style={styles.trustShield}>🔒</Text>
          <Text style={styles.trustText}>
            Protected by Blockchain & Zero-Knowledge Security
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: STATUS_BAR_HEIGHT + spacing.md,
    paddingBottom: 160, // Extra space so last card never gets covered by the footer
  },

  // Header Hero
  headerArea: {
    marginBottom: spacing.lg,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs + 2,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2563EB',
  },
  heroBadgeText: {
    ...typography.labelSmall,
    color: '#1D4ED8',
    fontWeight: '800',
    fontSize: 10,
    letterSpacing: 0.8,
  },
  mainTitle: {
    ...typography.displayLarge,
    fontSize: 32,
    lineHeight: 38,
    color: '#0F172A',
    fontWeight: '800',
    marginTop: spacing.xs,
    marginBottom: spacing.xs + 2,
  },
  mainTitleAccent: {
    color: '#2563EB',
  },
  subtitle: {
    ...typography.bodyMedium,
    color: '#64748B',
    lineHeight: 22,
    fontSize: 14,
  },

  // Feature Cards
  cardsArea: {
    gap: spacing.sm + 2,
  },
  featureCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.sm,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs + 2,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureIcon: {
    fontSize: 20,
  },
  tagBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  tagText: {
    ...typography.labelSmall,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  featureTitle: {
    ...typography.titleSmall,
    color: '#0F172A',
    fontWeight: '700',
    fontSize: 16,
    marginTop: 2,
    marginBottom: 4,
  },
  featureDesc: {
    ...typography.bodySmall,
    color: '#64748B',
    lineHeight: 19,
    fontSize: 13,
  },

  // Footer & Trust Banner
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: Platform.OS === 'android' ? spacing.md + 4 : spacing.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    ...shadows.lg,
  },
  signInButton: {
    height: 52,
    borderRadius: radius.lg,
  },
  trustBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.sm,
  },
  trustShield: {
    fontSize: 12,
  },
  trustText: {
    ...typography.labelSmall,
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
