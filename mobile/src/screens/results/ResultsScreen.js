import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { colors, typography, spacing } from '../../theme/colors';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { api } from '../../services/api';

export const ResultsScreen = ({ election, onBack }) => {
  const [resultsData, setResultsData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResults();
  }, [election.electionId]);

  const fetchResults = async () => {
    setLoading(true);
    try {
      const res = await api.getResults(election.electionId);
      if (res.success && res.data) {
        setResultsData(res.data);
      }
    } catch (err) {
      console.warn('Error fetching results:', err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  const isPublished = resultsData?.status === 'PUBLISHED';

  return (
    <View style={styles.container}>
      <Header title="Election Results" subtitle={election.title} showBack onBack={onBack} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Overview Card */}
        <Card>
          <View style={styles.statusRow}>
            <Badge label={resultsData?.status || 'UNKNOWN'} variant={resultsData?.status} />
            <Text style={styles.publishedDate}>
              {resultsData?.publishedAt
                ? new Date(resultsData.publishedAt).toLocaleDateString()
                : 'Pending Publication'}
            </Text>
          </View>

          <Text style={styles.electionTitle}>{resultsData?.title || election.title}</Text>

          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{resultsData?.totalEligibleVoters || 0}</Text>
              <Text style={styles.statLabel}>Eligible Voters</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>
                {resultsData?.totalBallotsCounted || resultsData?.turnoutCount || 0}
              </Text>
              <Text style={styles.statLabel}>Ballots Cast</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>
                {resultsData?.turnoutPercentage ? `${resultsData.turnoutPercentage}%` : 'N/A'}
              </Text>
              <Text style={styles.statLabel}>Turnout</Text>
            </View>
          </View>
        </Card>

        {/* If Results Are Withheld */}
        {!isPublished ? (
          <Card style={styles.withheldCard}>
            <Text style={styles.withheldIcon}>🔒</Text>
            <Text style={styles.withheldTitle}>Results Withheld</Text>
            <Text style={styles.withheldText}>
              In accordance with civic election rules, individual and candidate totals are strictly
              withheld until voting concludes, ballots are aggregated, and the threshold tally is
              cryptographically verified by election trustees.
            </Text>
          </Card>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Certified Candidate Tallies</Text>

            {(resultsData?.candidateResults || []).map((candidate, idx) => (
              <Card key={candidate.candidateIndex || idx} style={styles.candidateCard}>
                <View style={styles.candidateRow}>
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankText}>#{idx + 1}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: spacing.sm }}>
                    <Text style={styles.partyName}>{candidate.partyName}</Text>
                    <Text style={styles.candidatePerson}>{candidate.candidateName}</Text>
                  </View>
                  <View style={styles.votesCol}>
                    <Text style={styles.voteCount}>{candidate.voteCount} votes</Text>
                    <Text style={styles.votePct}>{candidate.percentage}%</Text>
                  </View>
                </View>

                {/* Percentage Bar */}
                <View style={styles.progressContainer}>
                  <View style={[styles.progressBar, { width: `${candidate.percentage}%` }]} />
                </View>
              </Card>
            ))}

            {/* Cryptographic Proof Verification Card */}
            <Card style={styles.proofCard}>
              <Text style={styles.proofHeader}>On-Chain Verifiable Artifacts</Text>
              <View style={styles.proofItem}>
                <Text style={styles.proofLabel}>Tally Commitment:</Text>
                <Text style={styles.proofCode} numberOfLines={1}>
                  {resultsData?.tallyCommitment || 'N/A'}
                </Text>
              </View>
              <View style={styles.proofItem}>
                <Text style={styles.proofLabel}>Trustee Proof URI:</Text>
                <Text style={styles.proofCode} numberOfLines={1}>
                  {resultsData?.trusteeProofReference || 'N/A'}
                </Text>
              </View>
            </Card>
          </>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  publishedDate: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  electionTitle: {
    ...typography.titleLarge,
    color: colors.primary,
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    ...typography.titleLarge,
    color: colors.accent,
  },
  statLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  withheldCard: {
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.surfaceSubtle,
    marginTop: spacing.md,
  },
  withheldIcon: {
    fontSize: 40,
    marginBottom: spacing.sm,
  },
  withheldTitle: {
    ...typography.titleMedium,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  withheldText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  sectionTitle: {
    ...typography.titleMedium,
    color: colors.primary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  candidateCard: {
    marginBottom: spacing.sm,
  },
  candidateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    ...typography.badge,
    color: colors.primary,
  },
  partyName: {
    ...typography.titleSmall,
    color: colors.primary,
  },
  candidatePerson: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  votesCol: {
    alignItems: 'flex-end',
  },
  voteCount: {
    ...typography.titleSmall,
    color: colors.primary,
  },
  votePct: {
    ...typography.bodySmall,
    color: colors.accent,
    fontWeight: '600',
  },
  progressContainer: {
    height: 8,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.accent,
  },
  proofCard: {
    marginTop: spacing.md,
    backgroundColor: '#F8FAFC',
    borderColor: colors.borderDark,
  },
  proofHeader: {
    ...typography.titleSmall,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  proofItem: {
    marginBottom: spacing.xs,
  },
  proofLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  proofCode: {
    ...typography.bodySmall,
    fontFamily: 'monospace',
    color: colors.accent,
  },
});
