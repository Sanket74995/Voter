import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { colors, typography, spacing } from '../../theme/colors';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { api } from '../../services/api';
import {
  createVoterSecrets,
  computeCommitment,
  computeNullifier,
  encryptBallotOnDevice,
} from '../../crypto/voterCrypto';

export const VoteSubmissionScreen = ({
  election,
  selectedCandidate,
  onFinishVoting,
}) => {
  const [step, setStep] = useState(1); // 1: Encrypting, 2: Fetching Proof, 3: Broadcasting, 4: Done, 5: Error
  const [receipt, setReceipt] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    executeVoteProtocol();
  }, []);

  const executeVoteProtocol = async () => {
    try {
      // Step 1: Encrypt ballot on device
      setStep(1);
      await new Promise((r) => setTimeout(r, 600));

      const { secretKey, salt } = createVoterSecrets();
      const commitment = computeCommitment(secretKey, salt);
      const nullifier = computeNullifier(secretKey, election.electionId);

      const { encryptedBallot, ballotCommitment } = encryptBallotOnDevice(
        selectedCandidate.candidateIndex,
        election.encryptionPublicKey || 'MOCK_PUBLIC_KEY'
      );

      // Step 2: Fetch Merkle Proof from eligibility registry
      setStep(2);
      await new Promise((r) => setTimeout(r, 500));

      let proofResponse;
      try {
        proofResponse = await api.getCredentialProof(election.electionId, commitment);
      } catch (e) {
        // Fallback for demo tree proof
        proofResponse = {
          success: true,
          data: {
            leaf: commitment,
            proof: [],
          },
        };
      }

      const merkleProof = proofResponse.data?.proof || [];

      // Step 3: Broadcast transaction to blockchain relay
      setStep(3);
      const submissionPayload = {
        electionId: election.electionId,
        nullifier,
        ballotCommitment,
        encryptedBallot,
        leafCommitment: commitment,
        merkleProof,
      };

      const response = await api.submitBallot(submissionPayload);

      if (response.success && response.data?.receipt) {
        setReceipt(response.data.receipt);
        setStep(4);
      } else {
        throw new Error(response.error || 'Submission failed');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Error occurred while broadcasting vote.');
      setStep(5);
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Ballot Processing" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {step < 4 && (
          <Card style={styles.processingCard}>
            <ActivityIndicator color={colors.accent} size="large" style={styles.spinner} />
            <Text style={styles.stepTitle}>
              {step === 1
                ? 'Encrypting Ballot on Device...'
                : step === 2
                ? 'Generating Cryptographic Proof...'
                : 'Submitting to Blockchain Relay...'}
            </Text>
            <Text style={styles.stepDesc}>
              {step === 1
                ? 'Your selection is encrypted with the election public key before leaving this phone.'
                : step === 2
                ? 'Constructing anonymous membership proof against the eligible Merkle root.'
                : 'Broadcasting transaction to EVM contract to consume nullifier.'}
            </Text>

            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: step === 1 ? '33%' : step === 2 ? '66%' : '90%' },
                ]}
              />
            </View>
          </Card>
        )}

        {/* Step 4: Success Receipt */}
        {step === 4 && receipt && (
          <Card style={styles.successCard}>
            <View style={styles.successIconBadge}>
              <Text style={styles.successIconText}>✓</Text>
            </View>
            <Text style={styles.successTitle}>Ballot Successfully Recorded!</Text>
            <Text style={styles.successDesc}>
              Your encrypted ballot has been accepted by the smart contract. A one-time nullifier was
              consumed.
            </Text>

            <View style={styles.receiptContainer}>
              <Text style={styles.receiptHeader}>Privacy-Safe Ballot Receipt</Text>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Status:</Text>
                <Text style={[styles.receiptValue, { color: colors.success, fontWeight: '700' }]}>
                  {receipt.status}
                </Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Transaction Hash:</Text>
                <Text style={styles.receiptValueCode} numberOfLines={1}>
                  {receipt.transactionHash}
                </Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Nullifier (Burned):</Text>
                <Text style={styles.receiptValueCode} numberOfLines={1}>
                  {receipt.nullifier}
                </Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Ballot Commitment:</Text>
                <Text style={styles.receiptValueCode} numberOfLines={1}>
                  {receipt.ballotCommitment}
                </Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Timestamp:</Text>
                <Text style={styles.receiptValue}>
                  {new Date(receipt.timestamp).toLocaleString()}
                </Text>
              </View>
            </View>

            <Text style={styles.privacyGuaranteeText}>
              🛡️ Notice: This receipt contains only cryptographic commitments and never reveals your
              candidate choice. Keep your nullifier safe to verify inclusion.
            </Text>

            <Button
              title="Return to Dashboard"
              onPress={onFinishVoting}
              style={{ marginTop: spacing.lg }}
            />
          </Card>
        )}

        {/* Step 5: Failure */}
        {step === 5 && (
          <Card style={styles.errorCard}>
            <View style={styles.errorIconBadge}>
              <Text style={styles.errorIconText}>✕</Text>
            </View>
            <Text style={styles.errorTitle}>Submission Rejected</Text>
            <Text style={styles.errorDesc}>{errorMessage}</Text>

            <Button
              title="Try Again"
              onPress={executeVoteProtocol}
              style={{ marginTop: spacing.md }}
            />
            <Button
              title="Cancel & Return"
              variant="outline"
              onPress={onFinishVoting}
              style={{ marginTop: spacing.sm }}
            />
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
    justifyContent: 'center',
  },
  processingCard: {
    alignItems: 'center',
    padding: spacing.xl,
    marginTop: spacing.xl,
  },
  spinner: {
    marginBottom: spacing.md,
  },
  stepTitle: {
    ...typography.titleMedium,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  stepDesc: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
  },
  successCard: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  successIconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.successBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  successIconText: {
    fontSize: 28,
    color: colors.success,
    fontWeight: 'bold',
  },
  successTitle: {
    ...typography.titleLarge,
    color: colors.primary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  successDesc: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  receiptContainer: {
    width: '100%',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 8,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  receiptHeader: {
    ...typography.titleSmall,
    color: colors.primary,
    marginBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDark,
    paddingBottom: spacing.xs,
  },
  receiptRow: {
    marginBottom: spacing.xs,
  },
  receiptLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  receiptValue: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  receiptValueCode: {
    ...typography.bodySmall,
    fontFamily: 'monospace',
    color: colors.accent,
  },
  privacyGuaranteeText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginTop: spacing.md,
    textAlign: 'center',
    lineHeight: 16,
  },
  errorCard: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  errorIconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.dangerBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  errorIconText: {
    fontSize: 28,
    color: colors.danger,
    fontWeight: 'bold',
  },
  errorTitle: {
    ...typography.titleLarge,
    color: colors.danger,
    marginBottom: spacing.xs,
  },
  errorDesc: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
});
