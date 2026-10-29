import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { colors, typography, spacing } from '../../theme/colors';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Badge } from '../../components/Badge';
import { api } from '../../services/api';

export const SettingsScreen = ({ user, onBack, onLogout }) => {
  const [customApiUrl, setCustomApiUrl] = useState(api.baseUrl);

  const handleUpdateApiUrl = () => {
    api.setBaseUrl(customApiUrl.trim());
    Alert.alert('Network Updated', `API endpoint set to: ${api.baseUrl}`);
  };

  const handleLogout = async () => {
    try {
      await api.request('/auth/logout', { method: 'POST' }).catch(() => {});
    } finally {
      api.setToken(null);
      onLogout();
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Settings & Security" showBack onBack={onBack} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* User Account Info */}
        <Card>
          <Text style={styles.cardHeader}>Account Profile</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Identifier:</Text>
            <Text style={styles.infoValue}>{user?.voterId || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Name:</Text>
            <Text style={styles.infoValue}>{user?.fullName || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email:</Text>
            <Text style={styles.infoValue}>{user?.email || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Role:</Text>
            <Badge label={user?.role?.toUpperCase() || 'VOTER'} variant="PRIMARY" />
          </View>
        </Card>

        {/* Network & Node Configuration */}
        <Card>
          <Text style={styles.cardHeader}>Blockchain & API Gateway</Text>
          <Text style={styles.subtext}>
            Connect to local Hardhat node or remote EVM testnet RPC via backend gateway.
          </Text>

          <Input
            label="Backend Base URL"
            value={customApiUrl}
            onChangeText={setCustomApiUrl}
            placeholder="http://10.0.2.2:5000/api"
          />

          <Button
            title="Update Gateway URL"
            variant="outline"
            onPress={handleUpdateApiUrl}
            style={{ marginBottom: spacing.sm }}
          />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>EVM Network:</Text>
            <Text style={styles.infoValue}>Hardhat Local (ChainID: 31337)</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Cryptography:</Text>
            <Text style={styles.infoValue}>Keccak256 / Merkle Membership / Nullifiers</Text>
          </View>
        </Card>

        {/* App Version Info */}
        <Card style={styles.versionCard}>
          <Text style={styles.appName}>Blockchain-Based Voting System</Text>
          <Text style={styles.versionText}>Version 1.0.0 (Academic Final-Year Build)</Text>
          <Text style={styles.credits}>
            React Native CLI • Node.js • Solidity • Hardhat • MongoDB
          </Text>
        </Card>

        {/* Logout Action */}
        <Button
          title="Sign Out Securely"
          variant="danger"
          onPress={handleLogout}
          style={styles.logoutBtn}
        />
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
  cardHeader: {
    ...typography.titleMedium,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  infoLabel: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  infoValue: {
    ...typography.bodyMedium,
    fontWeight: '600',
    color: colors.primary,
  },
  subtext: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  versionCard: {
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  appName: {
    ...typography.titleSmall,
    color: colors.primary,
    marginBottom: 2,
  },
  versionText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  credits: {
    ...typography.bodySmall,
    color: colors.textMuted,
    fontSize: 11,
  },
  logoutBtn: {
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
});
