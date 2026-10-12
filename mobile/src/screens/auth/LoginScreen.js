import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { colors, typography, spacing } from '../../theme/colors';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { api } from '../../services/api';

export const LoginScreen = ({ onLoginSuccess }) => {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  
  // Registration fields
  const [voterId, setVoterId] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState('voter');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async () => {
    if (!identifier || !password) {
      setErrorMessage('Please provide your Voter ID/Email and password.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    try {
      const response = await api.login(identifier, password);
      if (response.success && response.data?.token) {
        api.setToken(response.data.token);
        onLoginSuccess(response.data.user);
      }
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!voterId || !fullName || !email || !password) {
      setErrorMessage('All registration fields are required.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    try {
      const response = await api.register(voterId, fullName, email, password, selectedRole);
      if (response.success && response.data?.token) {
        api.setToken(response.data.token);
        onLoginSuccess(response.data.user);
      }
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const applyDemoRole = (role) => {
    if (role === 'admin') {
      setIdentifier('commissioner@test.com');
      setPassword('AdminPassword123!');
    } else if (role === 'voter') {
      setIdentifier('alice@test.com');
      setPassword('VoterPassword123!');
    } else if (role === 'party_rep') {
      setIdentifier('party_rep@test.com');
      setPassword('PartyRep123!');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.logoBadge}>🗳️</Text>
        <Text style={styles.appTitle}>Civic Voting Portal</Text>
        <Text style={styles.screenSubtitle}>
          {isRegisterMode ? 'Register an identity record' : 'Access your secure voting profile'}
        </Text>
      </View>

      {errorMessage ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorBoxText}>{errorMessage}</Text>
        </View>
      ) : null}

      <Card style={styles.formCard}>
        {isRegisterMode ? (
          <>
            <Input
              label="Official Voter ID"
              placeholder="e.g. VOTER-2026-001"
              value={voterId}
              onChangeText={setVoterId}
              autoCapitalize="characters"
            />
            <Input
              label="Full Name"
              placeholder="Your Legal Name"
              value={fullName}
              onChangeText={setFullName}
            />
            <Input
              label="Email Address"
              placeholder="voter@example.edu"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />
            <Input
              label="Password"
              placeholder="Create strong password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <Text style={styles.roleLabel}>Account Role</Text>
            <View style={styles.roleToggleRow}>
              {['voter', 'admin', 'party_rep'].map((role) => (
                <TouchableOpacity
                  key={role}
                  onPress={() => setSelectedRole(role)}
                  style={[styles.roleChip, selectedRole === role && styles.roleChipActive]}
                >
                  <Text style={[styles.roleChipText, selectedRole === role && styles.roleChipTextActive]}>
                    {role.replace('_', ' ').toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Button
              title="Create Account"
              onPress={handleRegister}
              loading={loading}
              style={{ marginTop: spacing.md }}
            />
          </>
        ) : (
          <>
            <Input
              label="Voter ID or Registered Email"
              placeholder="Enter ID or email"
              value={identifier}
              onChangeText={setIdentifier}
            />
            <Input
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <Button
              title="Sign In Securely"
              onPress={handleLogin}
              loading={loading}
              style={{ marginTop: spacing.sm }}
            />
          </>
        )}

        <TouchableOpacity
          style={styles.switchModeButton}
          onPress={() => {
            setIsRegisterMode(!isRegisterMode);
            setErrorMessage('');
          }}
        >
          <Text style={styles.switchModeText}>
            {isRegisterMode
              ? 'Already registered? Sign In'
              : "Don't have an approved account? Register here"}
          </Text>
        </TouchableOpacity>
      </Card>

      {/* Demo Credentials Quick-Filler for Evaluation */}
      {!isRegisterMode && (
        <View style={styles.demoBox}>
          <Text style={styles.demoTitle}>Examiner Quick Fill (Demo Accounts):</Text>
          <View style={styles.demoButtonRow}>
            <TouchableOpacity onPress={() => applyDemoRole('admin')} style={styles.demoChip}>
              <Text style={styles.demoChipText}>👔 Admin</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => applyDemoRole('voter')} style={styles.demoChip}>
              <Text style={styles.demoChipText}>🗳️ Voter</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => applyDemoRole('party_rep')} style={styles.demoChip}>
              <Text style={styles.demoChipText}>📢 Party Rep</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingTop: spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoBadge: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  appTitle: {
    ...typography.titleLarge,
    color: colors.primary,
  },
  screenSubtitle: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  formCard: {
    padding: spacing.lg,
  },
  errorBox: {
    backgroundColor: colors.dangerBg,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  errorBoxText: {
    ...typography.bodyMedium,
    color: colors.danger,
    fontWeight: '500',
  },
  roleLabel: {
    ...typography.bodyMedium,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  roleToggleRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  roleChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roleChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  roleChipText: {
    ...typography.badge,
    color: colors.textSecondary,
  },
  roleChipTextActive: {
    color: colors.textInverse,
  },
  switchModeButton: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  switchModeText: {
    ...typography.bodyMedium,
    color: colors.accent,
    fontWeight: '600',
  },
  demoBox: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  demoTitle: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  demoButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  demoChip: {
    flex: 1,
    backgroundColor: colors.surfaceSubtle,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    marginHorizontal: spacing.xs,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  demoChipText: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.primary,
  },
});
