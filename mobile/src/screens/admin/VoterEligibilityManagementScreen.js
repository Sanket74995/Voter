import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { colors, typography, spacing } from '../../theme/colors';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { api } from '../../services/api';

export const VoterEligibilityManagementScreen = ({ onBack }) => {
  const [electionId, setElectionId] = useState('');
  const [voterId, setVoterId] = useState('');
  const [revocationReason, setRevocationReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegisterEligibility = async () => {
    if (!electionId || !voterId) {
      Alert.alert('Missing Fields', 'Please enter Election ID and Voter ID.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.registerVoterEligibility(electionId.trim(), voterId.trim());
      if (res.success) {
        Alert.alert(
          'Eligibility Approved',
          `Voter '${voterId.toUpperCase()}' is now approved as ELIGIBLE for election '${electionId}'.`
        );
        setVoterId('');
      }
    } catch (err) {
      Alert.alert('Registration Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeCredential = async () => {
    if (!electionId || !voterId) {
      Alert.alert('Missing Fields', 'Please enter Election ID and Voter ID.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.revokeCredential(
        electionId.trim(),
        voterId.trim(),
        revocationReason || 'Revoked by Election Commission'
      );
      if (res.success) {
        Alert.alert(
          'Credential Revoked',
          `Unused credential for voter '${voterId.toUpperCase()}' was revoked according to policy.`
        );
        setVoterId('');
        setRevocationReason('');
      }
    } catch (err) {
      Alert.alert('Revocation Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Voter Eligibility & Registry" showBack onBack={onBack} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Approve Eligibility Card */}
        <Card>
          <Text style={styles.cardTitle}>Approve Voter Eligibility</Text>
          <Text style={styles.cardDesc}>
            Register an accredited voter identity as eligible for a specific election before the
            configuration is frozen.
          </Text>

          <Input
            label="Target Election ID"
            placeholder="e.g. ELEC-..."
            value={electionId}
            onChangeText={setElectionId}
          />
          <Input
            label="Voter Official Identifier"
            placeholder="e.g. VOTER-2026-001"
            value={voterId}
            onChangeText={setVoterId}
            autoCapitalize="characters"
          />

          <Button
            title="Register Voter as Eligible"
            onPress={handleRegisterEligibility}
            loading={loading}
          />
        </Card>

        {/* Revocation Policy Card */}
        <Card style={styles.revokeCard}>
          <Text style={styles.cardTitle}>Emergency Credential Revocation</Text>
          <Text style={styles.cardDesc}>
            In case of reported device loss or compromise prior to voting, an unused credential
            can be revoked under strict policy.
          </Text>

          <Input
            label="Reason for Revocation"
            placeholder="e.g. Lost device reported by accredited voter"
            value={revocationReason}
            onChangeText={setRevocationReason}
          />

          <Button
            title="Revoke Unused Credential"
            variant="danger"
            onPress={handleRevokeCredential}
            loading={loading}
          />
        </Card>

        {/* Security Rule Card */}
        <Card style={styles.policyCard}>
          <Text style={styles.policyTitle}>🛡️ Privacy & Audit Separation Rule</Text>
          <Text style={styles.policyText}>
            • The administrator dashboard never receives or displays raw credential secrets.
            {'\n'}• Approving or revoking an entitlement does not give administrators access to
            past or future ballot choices.
            {'\n'}• Double-voting is independently blocked on-chain by cryptographic nullifiers.
          </Text>
        </Card>
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
  cardTitle: {
    ...typography.titleMedium,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  cardDesc: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  revokeCard: {
    marginTop: spacing.sm,
    borderColor: '#FECACA',
  },
  policyCard: {
    marginTop: spacing.sm,
    backgroundColor: colors.surfaceSubtle,
  },
  policyTitle: {
    ...typography.titleSmall,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  policyText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
