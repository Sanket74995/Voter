import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { colors, typography, spacing } from '../../theme/colors';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { api } from '../../services/api';

export const BallotVerificationScreen = ({ onBack }) => {
  const [electionId, setElectionId] = useState('');
  const [nullifier, setNullifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);

  const handleVerify = async () => {
    if (!electionId || !nullifier) {
      Alert.alert('Missing Parameters', 'Please enter both the Election ID and your Ballot Nullifier.');
      return;
    }

    setLoading(true);
    setVerificationResult(null);
    try {
      const res = await api.getBallotStatus(electionId.trim(), nullifier.trim());
      if (res.success) {
        setVerificationResult(res.data);
      }
    } catch (err) {
      Alert.alert('Verification Query Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Ballot Verification" showBack onBack={onBack} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.infoCard}>
          <Text style={styles.infoTitle}>Independent Inclusion Verification</Text>
          <Text style={styles.infoText}>
            Enter your ballot receipt nullifier to query the immutable EVM contract storage.
            This confirms that your vote was accepted into the tally without exposing who you voted for.
          </Text>
        </Card>

        <Card>
          <Input
            label="Election Identifier"
            placeholder="e.g. ELEC-174176..."
            value={electionId}
            onChangeText={setElectionId}
          />
          <Input
            label="Ballot Nullifier (From Receipt)"
            placeholder="0x..."
            value={nullifier}
            onChangeText={setNullifier}
            multiline
            numberOfLines={2}
          />

          <Button
            title="Verify Ballot on Blockchain"
            onPress={handleVerify}
            loading={loading}
          />
        </Card>

        {verificationResult && (
          <Card style={styles.resultCard}>
            <View style={styles.resultHeaderRow}>
              <Text style={styles.resultTitle}>Verification Report</Text>
              <Badge
                label={verificationResult.isRecordedOnChain ? 'CONFIRMED ON-CHAIN' : 'NOT FOUND'}
                variant={verificationResult.isRecordedOnChain ? 'SUCCESS' : 'DANGER'}
              />
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>On-Chain Nullifier:</Text>
              <Text style={styles.detailCode} numberOfLines={1}>
                {verificationResult.nullifier}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Ballot Inclusion Status:</Text>
              <Text style={styles.detailValue}>
                {verificationResult.isRecordedOnChain
                  ? 'Accepted & Permanently Stored in EVM'
                  : 'No ballot record found with this nullifier.'}
              </Text>
            </View>

            <Text style={styles.privacyNote}>
              🛡️ Zero-Knowledge Proof Invariant: Verifying inclusion confirms your ballot is part of the
              official count while preserving mathematical secrecy of your candidate selection.
            </Text>
          </Card>
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
  infoCard: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    marginBottom: spacing.md,
  },
  infoTitle: {
    ...typography.titleSmall,
    color: colors.accent,
    marginBottom: spacing.xs,
  },
  infoText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  resultCard: {
    marginTop: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
  },
  resultHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  resultTitle: {
    ...typography.titleMedium,
    color: colors.primary,
  },
  detailRow: {
    marginBottom: spacing.sm,
  },
  detailLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  detailValue: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  detailCode: {
    ...typography.bodySmall,
    fontFamily: 'monospace',
    color: colors.accent,
  },
  privacyNote: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    lineHeight: 16,
  },
});
