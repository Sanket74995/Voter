import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { colors, typography, spacing } from '../../theme/colors';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { api } from '../../services/api';

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

  const handleFreeze = async (electionId) => {
    setActionLoadingId(electionId);
    try {
      const res = await api.freezeElection(electionId);
      if (res.success) {
        Alert.alert('Configuration Frozen', 'Candidate options locked and Merkle commitment root registered.');
        fetchElections();
      }
    } catch (err) {
      Alert.alert('Freeze Failed', err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpen = async (electionId) => {
    setActionLoadingId(electionId);
    try {
      const res = await api.openElection(electionId);
      if (res.success) {
        Alert.alert('Election Opened', 'Voting window is now active.');
        fetchElections();
      }
    } catch (err) {
      Alert.alert('Open Failed', err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleClose = async (electionId) => {
    setActionLoadingId(electionId);
    try {
      const res = await api.closeElection(electionId);
      if (res.success) {
        Alert.alert('Election Closed', 'Voting window terminated. Ready for tally computation.');
        fetchElections();
      }
    } catch (err) {
      Alert.alert('Close Failed', err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleTally = async (electionId) => {
    setActionLoadingId(electionId);
    try {
      const res = await api.tallyAndPublish(electionId);
      if (res.success) {
        Alert.alert('Tally Certified & Published', 'Results published on-chain and registered in TallyRegistry.');
        fetchElections();
      }
    } catch (err) {
      Alert.alert('Tally Failed', err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Metrics
  const totalElections = elections.length;
  const activeElections = elections.filter((e) => e.status === 'OPEN').length;
  const totalTurnout = elections.reduce((sum, e) => sum + (e.turnoutCount || 0), 0);

  return (
    <View style={styles.container}>
      <Header
        title="Election Commission Admin"
        subtitle={`Admin: ${user?.voterId || ''}`}
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
        {/* Metrics Grid */}
        <View style={styles.metricsRow}>
          <Card style={styles.metricCard}>
            <Text style={styles.metricNumber}>{totalElections}</Text>
            <Text style={styles.metricLabel}>Total Elections</Text>
          </Card>
          <Card style={styles.metricCard}>
            <Text style={[styles.metricNumber, { color: colors.success }]}>{activeElections}</Text>
            <Text style={styles.metricLabel}>Active (Open)</Text>
          </Card>
          <Card style={styles.metricCard}>
            <Text style={[styles.metricNumber, { color: colors.accent }]}>{totalTurnout}</Text>
            <Text style={styles.metricLabel}>Ballots Cast</Text>
          </Card>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsBar}>
          <Button
            title="+ Create New Election"
            onPress={onCreateElection}
            style={{ flex: 1, marginRight: spacing.sm }}
          />
          <Button
            title="Voter Registry"
            variant="outline"
            onPress={onManageEligibility}
            style={{ flex: 1 }}
          />
        </View>

        {/* Elections Administrative Table / Cards */}
        <Text style={styles.sectionTitle}>Election Lifecycle Control</Text>

        {elections.map((election) => {
          const isActing = actionLoadingId === election.electionId;
          return (
            <Card key={election.electionId} style={styles.electionAdminCard}>
              <View style={styles.cardHeader}>
                <Badge label={election.status} variant={election.status} />
                <Text style={styles.electionIdCode}>{election.electionId}</Text>
              </View>

              <Text style={styles.electionTitle}>{election.title}</Text>
              <Text style={styles.timeInfo}>
                {new Date(election.startTime).toLocaleDateString()} -{' '}
                {new Date(election.endTime).toLocaleDateString()}
              </Text>

              <View style={styles.statsSummary}>
                <Text style={styles.summaryItem}>
                  Eligible: <Text style={styles.bold}>{election.totalEligibleVoters || 0}</Text>
                </Text>
                <Text style={styles.summaryItem}>
                  Turnout: <Text style={styles.bold}>{election.turnoutCount || 0}</Text>
                </Text>
                <Text style={styles.summaryItem}>
                  Config: <Text style={styles.bold}>v{election.configVersion || 1}</Text>
                </Text>
              </View>

              {/* State Machine Transition Controls */}
              <View style={styles.controlsRow}>
                {election.status === 'DRAFT' && (
                  <Button
                    title="Freeze Config (Commit Root)"
                    variant="outline"
                    loading={isActing}
                    onPress={() => handleFreeze(election.electionId)}
                    style={styles.controlBtn}
                  />
                )}
                {election.status === 'FROZEN' && (
                  <Button
                    title="Open Voting Window"
                    loading={isActing}
                    onPress={() => handleOpen(election.electionId)}
                    style={styles.controlBtn}
                  />
                )}
                {election.status === 'OPEN' && (
                  <Button
                    title="Close Voting Window"
                    variant="danger"
                    loading={isActing}
                    onPress={() => handleClose(election.electionId)}
                    style={styles.controlBtn}
                  />
                )}
                {election.status === 'CLOSED' && (
                  <Button
                    title="Execute Tally & Publish"
                    loading={isActing}
                    onPress={() => handleTally(election.electionId)}
                    style={styles.controlBtn}
                  />
                )}
                {election.status === 'PUBLISHED' && (
                  <Badge label="TALLY PUBLISHED ON-CHAIN" variant="SUCCESS" />
                )}
              </View>
            </Card>
          );
        })}
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
  metricsRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  metricCard: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 3,
    paddingVertical: spacing.md,
  },
  metricNumber: {
    ...typography.titleLarge,
    color: colors.primary,
  },
  metricLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
    fontSize: 11,
  },
  actionsBar: {
    flexDirection: 'row',
    marginVertical: spacing.sm,
  },
  sectionTitle: {
    ...typography.titleMedium,
    color: colors.primary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  electionAdminCard: {
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  electionIdCode: {
    ...typography.bodySmall,
    fontFamily: 'monospace',
    color: colors.textMuted,
  },
  electionTitle: {
    ...typography.titleMedium,
    color: colors.primary,
    marginBottom: 2,
  },
  timeInfo: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  statsSummary: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 6,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  summaryItem: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginRight: spacing.md,
  },
  bold: {
    fontWeight: '700',
    color: colors.primary,
  },
  controlsRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  controlBtn: {
    height: 38,
  },
});
