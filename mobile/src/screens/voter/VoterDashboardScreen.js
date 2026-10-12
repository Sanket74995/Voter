import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { colors, typography, spacing } from '../../theme/colors';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { api } from '../../services/api';

export const VoterDashboardScreen = ({
  user,
  onSelectElection,
  onNavigateToVerification,
  onNavigateToSettings,
  onLogout,
}) => {
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('ALL'); // 'ALL', 'OPEN', 'CLOSED'

  const fetchElections = async () => {
    setLoading(true);
    try {
      const res = await api.getElections();
      if (res.success && res.data?.elections) {
        setElections(res.data.elections);
      }
    } catch (err) {
      console.warn('Error fetching elections:', err.message);
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

  const filteredElections = elections.filter((e) => {
    if (filter === 'OPEN') return e.status === 'OPEN';
    if (filter === 'CLOSED') return e.status === 'CLOSED' || e.status === 'PUBLISHED';
    return true;
  });

  return (
    <View style={styles.container}>
      <Header
        title="Voter Dashboard"
        subtitle={`ID: ${user?.voterId || ''}`}
        rightAction={
          <TouchableOpacity onPress={onNavigateToSettings} style={styles.settingsBtn}>
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Welcome Profile Banner */}
        <Card style={styles.profileCard}>
          <View style={styles.profileRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {user?.fullName ? user.fullName[0].toUpperCase() : 'V'}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.fullName || 'Registered Voter'}</Text>
              <Text style={styles.profileEmail}>{user?.email || ''}</Text>
            </View>
            <Badge label="APPROVED" variant="ELIGIBLE" />
          </View>
        </Card>

        {/* Quick Action: Independent Verification */}
        <Card style={styles.verifyBanner} onPress={onNavigateToVerification}>
          <View style={styles.verifyRow}>
            <Text style={styles.verifyIcon}>🔍</Text>
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Text style={styles.verifyTitle}>Verify Ballot Inclusion</Text>
              <Text style={styles.verifySubtitle}>
                Check your cryptographic receipt against on-chain logs.
              </Text>
            </View>
            <Text style={styles.verifyArrow}>→</Text>
          </View>
        </Card>

        {/* Elections Section Header & Filter Tabs */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Elections</Text>
          <View style={styles.filterTabs}>
            {['ALL', 'OPEN', 'CLOSED'].map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setFilter(tab)}
                style={[styles.filterTab, filter === tab && styles.filterTabActive]}
              >
                <Text style={[styles.filterTabText, filter === tab && styles.filterTabTextActive]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {filteredElections.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🗳️</Text>
            <Text style={styles.emptyTitle}>No Elections Found</Text>
            <Text style={styles.emptyDesc}>
              There are currently no elections matching the selected filter.
            </Text>
          </Card>
        ) : (
          filteredElections.map((election) => (
            <Card
              key={election.electionId}
              style={styles.electionCard}
              onPress={() => onSelectElection(election)}
            >
              <View style={styles.cardTopRow}>
                <Badge label={election.status} variant={election.status} />
                <Text style={styles.dateText}>
                  Ends: {new Date(election.endTime).toLocaleDateString()}
                </Text>
              </View>

              <Text style={styles.electionTitle}>{election.title}</Text>
              <Text style={styles.electionDesc} numberOfLines={2}>
                {election.description || 'Official democratic election scheduled on smart contract.'}
              </Text>

              <View style={styles.cardFooter}>
                <Text style={styles.turnoutInfo}>
                  Turnout: {election.turnoutCount || 0} cast
                </Text>
                <Button
                  title={
                    election.status === 'OPEN'
                      ? 'Cast Ballot'
                      : election.status === 'PUBLISHED'
                      ? 'View Results'
                      : 'View Details'
                  }
                  variant={election.status === 'OPEN' ? 'primary' : 'outline'}
                  onPress={() => onSelectElection(election)}
                  style={styles.actionBtn}
                />
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.md,
  },
  settingsBtn: {
    padding: spacing.xs,
  },
  settingsIcon: {
    fontSize: 20,
  },
  profileCard: {
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    ...typography.titleMedium,
    color: colors.textInverse,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    ...typography.titleSmall,
    color: colors.primary,
  },
  profileEmail: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  verifyBanner: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    marginBottom: spacing.lg,
  },
  verifyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifyIcon: {
    fontSize: 24,
  },
  verifyTitle: {
    ...typography.titleSmall,
    color: colors.accent,
  },
  verifySubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  verifyArrow: {
    fontSize: 18,
    color: colors.accent,
    fontWeight: 'bold',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.titleMedium,
    color: colors.primary,
  },
  filterTabs: {
    flexDirection: 'row',
  },
  filterTab: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 6,
    marginLeft: spacing.xs,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
  },
  filterTabText: {
    ...typography.badge,
    color: colors.textSecondary,
  },
  filterTabTextActive: {
    color: colors.textInverse,
  },
  electionCard: {
    marginBottom: spacing.md,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  dateText: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  electionTitle: {
    ...typography.titleMedium,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  electionDesc: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  turnoutInfo: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  actionBtn: {
    height: 36,
    paddingHorizontal: spacing.md,
  },
  emptyCard: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    ...typography.titleSmall,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  emptyDesc: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
