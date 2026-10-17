import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { colors, typography, spacing, radius, shadows } from '../../theme/colors';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { api } from '../../services/api';

const STAGES = [
  { key: 'DRAFT', label: '1. Setup' },
  { key: 'FROZEN', label: '2. Locked' },
  { key: 'OPEN', label: '3. Voting Live' },
  { key: 'CLOSED', label: '4. Ended' },
  { key: 'PUBLISHED', label: '5. Results Out' },
];

export const AdminDashboardScreen = ({
  user,
  onCreateElection,
  onManageEligibility,
  onNavigateToSettings,
  onLogout,
}) => {
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchElections = async () => {
    setLoading(true);
    try {
      const res = await api.getElections();
      if (res.success && res.data?.elections) {
        setElections(res.data.elections);
      }
    } catch (err) {
      console.warn('Could not load elections:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchElections();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchElections();
  };

  const handleFreeze = async (electionId) => {
    setActionLoadingId(electionId);
    try {
      const res = await api.freezeElection(electionId);
      if (res.success) {
        Alert.alert(
          'Election Setup Locked',
          'Candidates and eligible voters are now locked in. You can now start voting whenever ready.'
        );
        fetchElections();
      }
    } catch (err) {
      Alert.alert('Could Not Lock Setup', err.message || 'Please make sure at least one candidate and voter is added.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpen = async (electionId) => {
    setActionLoadingId(electionId);
    try {
      const res = await api.openElection(electionId);
      if (res.success) {
        Alert.alert(
          'Voting is Now Live!',
          'Voters can now open their app and cast their vote.'
        );
        fetchElections();
      }
    } catch (err) {
      Alert.alert('Could Not Start Voting', err.message || 'Please check your connection and try again.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleClose = async (electionId) => {
    setActionLoadingId(electionId);
    try {
      const res = await api.closeElection(electionId);
      if (res.success) {
        Alert.alert(
          'Voting Ended',
          'No more votes can be cast. You can now tap "Count Votes & Announce Winner".'
        );
        fetchElections();
      }
    } catch (err) {
      Alert.alert('Could Not End Voting', err.message || 'Please try again.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleTally = async (electionId) => {
    setActionLoadingId(electionId);
    try {
      const res = await api.tallyAndPublish(electionId);
      if (res.success) {
        Alert.alert(
          'Results Announced!',
          'All votes have been accurately counted and published. Everyone can now view the results.'
        );
        fetchElections();
      }
    } catch (err) {
      Alert.alert('Could Not Count Votes', err.message || 'Please try again.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const totalElections = elections.length;
  const activeElections = elections.filter((e) => e.status === 'OPEN').length;
  const totalTurnout = elections.reduce((sum, e) => sum + (e.turnoutCount || 0), 0);

  const getStageIndex = (status) => {
    const idx = STAGES.findIndex((s) => s.key === status);
    return idx !== -1 ? idx : 0;
  };

  const getStatusFriendlyLabel = (status) => {
    switch (status) {
      case 'DRAFT': return 'Setup (Draft)';
      case 'FROZEN': return 'Ready to Vote';
      case 'OPEN': return 'Voting Live';
      case 'CLOSED': return 'Voting Ended';
      case 'PUBLISHED': return 'Results Out';
      default: return status;
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="Admin Control Center"
        subtitle={`Logged in as: ${user?.voterId || 'Admin'}`}
        rightAction={
          <TouchableOpacity
            onPress={onNavigateToSettings}
            style={styles.settingsBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Executive Banner */}
        <View style={styles.heroBanner}>
          <View style={styles.heroTopRow}>
            <View style={styles.networkBadge}>
              <View style={styles.networkPulse} />
              <Text style={styles.networkText}>SYSTEM ONLINE & SECURE</Text>
            </View>
            <View style={styles.adminRolePill}>
              <Text style={styles.adminRoleText}>ELECTION COMMISSION</Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>Manage Your Elections</Text>
          <Text style={styles.heroSub}>
            Follow the 5 easy steps below to launch elections, approve voters, start voting, and publish final results.
          </Text>

          {/* Quick Action Tiles in Banner */}
          <View style={styles.bannerActionsRow}>
            <TouchableOpacity
              style={styles.bannerActionBtnPrimary}
              onPress={onCreateElection}
              activeOpacity={0.8}
            >
              <Text style={styles.bannerActionBtnPrimaryText}>+ Create New Election</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.bannerActionBtnOutline}
              onPress={onManageEligibility}
              activeOpacity={0.8}
            >
              <Text style={styles.bannerActionBtnOutlineText}>👥 Add / Approve Voters</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Metrics Row */}
        <View style={styles.metricsRow}>
          <Card variant="elevated" style={styles.metricCard}>
            <Text style={styles.metricIcon}>🗳️</Text>
            <Text style={styles.metricNumber}>{totalElections}</Text>
            <Text style={styles.metricLabel}>Total Elections</Text>
          </Card>

          <Card variant="elevated" style={styles.metricCard}>
            <Text style={styles.metricIcon}>🟢</Text>
            <Text style={[styles.metricNumber, { color: '#10B981' }]}>{activeElections}</Text>
            <Text style={styles.metricLabel}>Voting Live Now</Text>
          </Card>

          <Card variant="elevated" style={styles.metricCard}>
            <Text style={styles.metricIcon}>✉️</Text>
            <Text style={[styles.metricNumber, { color: '#3B82F6' }]}>{totalTurnout}</Text>
            <Text style={styles.metricLabel}>Votes Cast</Text>
          </Card>
        </View>

        {/* Section Header */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Election List & Steps</Text>
          <Text style={styles.sectionCountBadge}>{elections.length} Elections</Text>
        </View>

        {elections.length === 0 ? (
          <Card variant="subtle" style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyTitle}>No Elections Created Yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap the "+ Create New Election" button above to get started.
            </Text>
          </Card>
        ) : (
          elections.map((election) => {
            const isActing = actionLoadingId === election.electionId;
            const currentStageIdx = getStageIndex(election.status);

            return (
              <Card key={election.electionId} variant="elevated" style={styles.electionAdminCard}>
                {/* Header: Title + Status */}
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1, marginRight: spacing.sm }}>
                    <Text style={styles.electionTitle}>{election.title}</Text>
                    <Text style={styles.electionIdCode}>ID: {election.electionId}</Text>
                  </View>
                  <Badge label={getStatusFriendlyLabel(election.status)} variant={election.status} />
                </View>

                {/* 5-Step Lifecycle Progress Stepper */}
                <View style={styles.stepperContainer}>
                  <View style={styles.stepperLineBg}>
                    <View
                      style={[
                        styles.stepperLineFill,
                        {
                          width: `${(currentStageIdx / (STAGES.length - 1)) * 100}%`,
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.stepperDotsRow}>
                    {STAGES.map((stage, idx) => {
                      const isPast = idx <= currentStageIdx;
                      const isCurrent = idx === currentStageIdx;
                      return (
                        <View key={stage.key} style={styles.stepperStep}>
                          <View
                            style={[
                              styles.stepperDot,
                              isPast && styles.stepperDotPast,
                              isCurrent && styles.stepperDotCurrent,
                            ]}
                          >
                            {isPast && <Text style={styles.stepperCheck}>✓</Text>}
                          </View>
                          <Text
                            style={[
                              styles.stepperLabel,
                              isCurrent && styles.stepperLabelCurrent,
                            ]}
                          >
                            {stage.label}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>

                {/* Stats Summary Bar */}
                <View style={styles.statsSummary}>
                  <View style={styles.statCol}>
                    <Text style={styles.statColLabel}>APPROVED VOTERS</Text>
                    <Text style={styles.statColValue}>{election.totalEligibleVoters || 0}</Text>
                  </View>
                  <View style={styles.statColDivider} />
                  <View style={styles.statCol}>
                    <Text style={styles.statColLabel}>VOTES CAST</Text>
                    <Text style={styles.statColValue}>{election.turnoutCount || 0}</Text>
                  </View>
                  <View style={styles.statColDivider} />
                  <View style={styles.statCol}>
                    <Text style={styles.statColLabel}>CANDIDATES</Text>
                    <Text style={styles.statColValue}>{election.candidates?.length || 0}</Text>
                  </View>
                </View>

                {/* Friendly Action Buttons for Next Step */}
                <View style={styles.controlsRow}>
                  {election.status === 'DRAFT' && (
                    <Button
                      title="🔒 Lock Election Setup (Ready for Voting)"
                      variant="primary"
                      loading={isActing}
                      onPress={() => handleFreeze(election.electionId)}
                      style={styles.actionBtnStyle}
                    />
                  )}
                  {election.status === 'FROZEN' && (
                    <Button
                      title="🟢 Start Voting (Open Election Now)"
                      variant="success"
                      loading={isActing}
                      onPress={() => handleOpen(election.electionId)}
                      style={styles.actionBtnStyle}
                    />
                  )}
                  {election.status === 'OPEN' && (
                    <Button
                      title="⏹️ End Voting (Close Election)"
                      variant="danger"
                      loading={isActing}
                      onPress={() => handleClose(election.electionId)}
                      style={styles.actionBtnStyle}
                    />
                  )}
                  {election.status === 'CLOSED' && (
                    <Button
                      title="📊 Count Votes & Announce Winner"
                      variant="primary"
                      loading={isActing}
                      onPress={() => handleTally(election.electionId)}
                      style={styles.actionBtnStyle}
                    />
                  )}
                  {election.status === 'PUBLISHED' && (
                    <View style={styles.publishedSuccessBox}>
                      <Text style={styles.publishedSuccessIcon}>🎉</Text>
                      <Text style={styles.publishedSuccessText}>
                        Voting complete! Official results are published for all voters.
                      </Text>
                    </View>
                  )}
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  settingsBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  settingsIcon: {
    fontSize: 18,
  },

  // Hero Banner
  heroBanner: {
    backgroundColor: '#0F172A',
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.lg,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs + 2,
  },
  networkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  networkPulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3B82F6',
  },
  networkText: {
    ...typography.labelSmall,
    color: '#93C5FD',
    letterSpacing: 0.8,
    fontSize: 9,
    fontWeight: '700',
  },
  adminRolePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  adminRoleText: {
    ...typography.labelSmall,
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: '700',
  },
  heroTitle: {
    ...typography.titleLarge,
    color: colors.textInverse,
    fontWeight: '800',
    marginTop: 4,
  },
  heroSub: {
    ...typography.bodySmall,
    color: '#94A3B8',
    lineHeight: 18,
    marginTop: 3,
    marginBottom: spacing.md,
  },
  bannerActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  bannerActionBtnPrimary: {
    flex: 1,
    backgroundColor: '#2563EB',
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  bannerActionBtnPrimaryText: {
    ...typography.titleSmall,
    color: colors.textInverse,
    fontWeight: '700',
    fontSize: 13,
  },
  bannerActionBtnOutline: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  bannerActionBtnOutlineText: {
    ...typography.titleSmall,
    color: colors.textInverse,
    fontWeight: '700',
    fontSize: 13,
  },

  // Metrics Row
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.xs + 2,
    marginBottom: spacing.md,
  },
  metricCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md - 2,
    paddingHorizontal: 4,
    marginBottom: 0,
  },
  metricIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  metricNumber: {
    ...typography.titleLarge,
    color: colors.primary,
    fontWeight: '800',
  },
  metricLabel: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },

  // Section Header
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.titleMedium,
    color: colors.primary,
    fontWeight: '800',
  },
  sectionCountBadge: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    backgroundColor: '#E2E8F0',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    fontWeight: '700',
  },

  // Election Admin Card
  electionAdminCard: {
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  electionTitle: {
    ...typography.titleMedium,
    color: colors.primary,
    fontWeight: '700',
  },
  electionIdCode: {
    ...typography.mono,
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },

  // Stepper
  stepperContainer: {
    marginVertical: spacing.sm + 2,
    position: 'relative',
  },
  stepperLineBg: {
    position: 'absolute',
    top: 9,
    left: 20,
    right: 20,
    height: 3,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
  },
  stepperLineFill: {
    height: 3,
    backgroundColor: '#10B981',
    borderRadius: 2,
  },
  stepperDotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepperStep: {
    alignItems: 'center',
    width: 62,
  },
  stepperDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepperDotPast: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  stepperDotCurrent: {
    borderColor: '#3B82F6',
    borderWidth: 3,
    backgroundColor: colors.surface,
  },
  stepperCheck: {
    color: colors.textInverse,
    fontSize: 10,
    fontWeight: '900',
  },
  stepperLabel: {
    ...typography.labelSmall,
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
  },
  stepperLabelCurrent: {
    color: colors.primary,
    fontWeight: '800',
  },

  // Stats Bar
  statsSummary: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statColDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E2E8F0',
  },
  statColLabel: {
    ...typography.labelSmall,
    color: '#64748B',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statColValue: {
    ...typography.titleSmall,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 13,
    marginTop: 1,
  },

  // Controls Row
  controlsRow: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: spacing.sm,
  },
  actionBtnStyle: {
    height: 48,
    borderRadius: radius.md,
  },
  publishedSuccessBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    gap: spacing.xs + 2,
  },
  publishedSuccessIcon: {
    fontSize: 20,
  },
  publishedSuccessText: {
    ...typography.labelMedium,
    color: '#047857',
    flex: 1,
    fontWeight: '600',
  },

  // Empty State
  emptyCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyEmoji: {
    fontSize: 36,
    marginBottom: spacing.xs,
  },
  emptyTitle: {
    ...typography.titleMedium,
    color: colors.primary,
    fontWeight: '700',
  },
  emptySubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 260,
  },
});
