import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { colors, typography, spacing } from '../../theme/colors';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { api } from '../../services/api';
import { createVoterSecrets, computeCommitment, saveVoterCredential } from '../../crypto/voterCrypto';

export const ElectionDetailsScreen = ({
  election,
  user,
  onBack,
  onProceedToVote,
  onViewResults,
}) => {
  const [parties, setParties] = useState([]);
  const [eligibilityData, setEligibilityData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [issuingCredential, setIssuingCredential] = useState(false);

  useEffect(() => {
    loadDetails();
  }, [election.electionId]);

  const loadDetails = async () => {
    setLoading(true);
    try {
      // 1. Fetch parties
      const pRes = await api.getElectionParties(election.electionId);
      if (pRes.success) {
        setParties(pRes.data.parties || []);
      }

      // 2. Fetch voter eligibility
      const elRes = await api.checkMyEligibility(election.electionId);
      if (elRes.success) {
        setEligibilityData(elRes.data);
      }
    } catch (err) {
      console.warn('Error loading details:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleIssueCredential = async () => {
    setIssuingCredential(true);
    try {
      // Voter client generates secret & salt locally
      const { secretKey, salt } = createVoterSecrets();
      const commitment = computeCommitment(secretKey, salt);

      const res = await api.issueCredential(election.electionId, commitment);
      if (res.success) {
        saveVoterCredential(user.voterId, election.electionId, { secretKey, salt, commitment });
        Alert.alert(
          'Credential Issued',
          'Your cryptographic commitment has been registered into the election Merkle tree. Your secret key is stored locally on this device.',
          [{ text: 'OK', onPress: () => loadDetails() }]
        );
      }
    } catch (err) {
      Alert.alert('Issuance Failed', err.message);
    } finally {
      setIssuingCredential(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  const isEligible = eligibilityData?.isEligible;
  const hasCredential = eligibilityData?.hasActiveCredential;
  const isOpen = election.status === 'OPEN';
  const isPublished = election.status === 'PUBLISHED';

  return (
    <View style={styles.container}>
      <Header title="Election Details" showBack onBack={onBack} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Status & Title Card */}
        <Card>
          <View style={styles.statusRow}>
            <Badge label={election.status} variant={election.status} />
            <Text style={styles.timeWindow}>
              {new Date(election.startTime).toLocaleDateString()} -{' '}
              {new Date(election.endTime).toLocaleDateString()}
            </Text>
          </View>
          <Text style={styles.title}>{election.title}</Text>
          <Text style={styles.description}>
            {election.description || 'Verified academic election running on EVM smart contracts.'}
          </Text>
        </Card>

        {/* Voter Eligibility Card */}
        <Card style={styles.eligibilityCard}>
          <Text style={styles.sectionHeader}>Your Voting Entitlement</Text>
          <View style={styles.eligibilityRow}>
            <Text style={styles.eligibilityLabel}>Eligibility Status:</Text>
            <Badge
              label={isEligible ? 'ELIGIBLE' : 'INELIGIBLE'}
              variant={isEligible ? 'SUCCESS' : 'DANGER'}
            />
          </View>
          <View style={styles.eligibilityRow}>
            <Text style={styles.eligibilityLabel}>Credential Issuance:</Text>
            <Badge
              label={hasCredential ? 'ACTIVE CREDENTIAL' : 'NOT ISSUED'}
              variant={hasCredential ? 'SUCCESS' : 'WARNING'}
            />
          </View>

          {isEligible && !hasCredential && election.status === 'DRAFT' && (
            <Button
              title="Obtain Digital Credential"
              onPress={handleIssueCredential}
              loading={issuingCredential}
              style={{ marginTop: spacing.md }}
            />
          )}
          {isEligible && !hasCredential && election.status !== 'DRAFT' && (
            <Text style={styles.credentialNotice}>
              Obtain your digital credential before the administrator freezes this election. Credentials cannot be added after voting setup is locked.
            </Text>
          )}
        </Card>

        {/* Approved Candidates List */}
        <Text style={styles.sectionTitle}>Approved Candidates ({parties.length})</Text>
        {parties.map((p, idx) => (
          <Card key={p.partyId || idx} style={styles.candidateCard}>
            <View style={styles.candidateHeader}>
              <View style={styles.candidateIndexBadge}>
                <Text style={styles.indexText}>{p.candidateIndex + 1}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <Text style={styles.partyName}>{p.name}</Text>
                <Text style={styles.candidateName}>Candidate: {p.candidateName}</Text>
              </View>
              <View style={styles.symbolBadge}>
                <Text style={styles.symbolText}>{p.symbol}</Text>
              </View>
            </View>
          </Card>
        ))}

        {/* Privacy Invariant Card */}
        <Card style={styles.privacyNote}>
          <Text style={styles.privacyNoteTitle}>🛡️ Cryptographic Guarantee</Text>
          <Text style={styles.privacyNoteText}>
            Your ballot is encrypted client-side with the election public key before submission.
            Neither the Election Commission nor database operators can associate your name with your vote.
          </Text>
        </Card>
      </ScrollView>

      {/* Sticky Bottom Actions */}
      <View style={styles.bottomBar}>
        {isOpen && isEligible && hasCredential ? (
          <Button
            title="Proceed to Cast Ballot"
            onPress={() => onProceedToVote(election, parties)}
          />
        ) : isPublished ? (
          <Button
            title="View Final Results"
            variant="secondary"
            onPress={() => onViewResults(election)}
          />
        ) : !isOpen ? (
          <Button
            title={`Voting is ${election.status}`}
            disabled
            onPress={() => {}}
          />
        ) : !hasCredential ? (
          <Button
            title="Credential Required to Vote"
            disabled
            onPress={() => {}}
          />
        ) : null}
      </View>
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
    paddingBottom: spacing.xxl,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  timeWindow: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  title: {
    ...typography.titleLarge,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  description: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  eligibilityCard: {
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.borderDark,
  },
  credentialNotice: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.md,
    lineHeight: 18,
  },
  sectionHeader: {
    ...typography.titleSmall,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  eligibilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  eligibilityLabel: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  sectionTitle: {
    ...typography.titleMedium,
    color: colors.primary,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  candidateCard: {
    marginBottom: spacing.sm,
  },
  candidateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  candidateIndexBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexText: {
    color: colors.textInverse,
    ...typography.badge,
  },
  partyName: {
    ...typography.titleSmall,
    color: colors.primary,
  },
  candidateName: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  symbolBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
  },
  symbolText: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: '#92400E',
  },
  privacyNote: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    marginTop: spacing.md,
  },
  privacyNoteTitle: {
    ...typography.titleSmall,
    color: colors.success,
    marginBottom: spacing.xs,
  },
  privacyNoteText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  bottomBar: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
