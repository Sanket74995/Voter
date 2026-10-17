import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import { colors, typography, spacing, radius, shadows } from '../../theme/colors';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { api } from '../../services/api';

const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 0;

export const LoginScreen = ({ onLoginSuccess, onBack }) => {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  // Server Gateway configuration
  const [serverUrl, setServerUrl] = useState(api.baseUrl);
  const [showServerConfig, setShowServerConfig] = useState(false);

  // Registration fields
  const [voterId, setVoterId] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState('voter');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async () => {
    if (!identifier || !password) {
      setErrorMessage('Please enter your Voter ID or Email and password.');
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
      setErrorMessage(err.message || 'Incorrect credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!voterId || !fullName || !email || !password) {
      setErrorMessage('Please fill in all registration fields.');
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
      setErrorMessage(err.message || 'Registration failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  const applyDemoRole = (role) => {
    if (role === 'admin') {
      setIdentifier('commissioner@test.com');
      setPassword('AdminPassword123!');
    } else if (role === 'voter') {
      setIdentifier('VOTER-2026-101');
      setPassword('Password@123');
    } else if (role === 'party_rep') {
      setIdentifier('party_rep@test.com');
      setPassword('PartyRep123!');
    }
    setErrorMessage('');
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" translucent />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoBadgeContainer}>
          <Text style={styles.logoBadge}>🗳️</Text>
        </View>
        <Text style={styles.appTitle}>Civic Voting Portal</Text>
        <Text style={styles.screenSubtitle}>
          {isRegisterMode
            ? 'Create a new verified voter account'
            : 'Sign in to access elections and vote securely'}
        </Text>
      </View>

      {/* Error Notification */}
      {errorMessage ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorBoxText}>{errorMessage}</Text>
        </View>
      ) : null}

      {/* Form Card */}
      <Card variant="elevated" style={styles.formCard}>
        {isRegisterMode ? (
          <>
            <Input
              label="Voter ID"
              placeholder="e.g. VOTER-2026-120"
              value={voterId}
              onChangeText={setVoterId}
              autoCapitalize="characters"
            />
            <Input
              label="Full Name"
              placeholder="Your full name"
              value={fullName}
              onChangeText={setFullName}
            />
            <Input
              label="Email Address"
              placeholder="voter@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />
            <Input
              label="Password"
              placeholder="Create a password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <Text style={styles.roleLabel}>Account Type</Text>
            <View style={styles.roleToggleRow}>
              {[
                { key: 'voter', label: 'Voter' },
                { key: 'admin', label: 'Admin' },
                { key: 'party_rep', label: 'Candidate Rep' },
              ].map((item) => (
                <TouchableOpacity
                  key={item.key}
                  onPress={() => setSelectedRole(item.key)}
                  style={[
                    styles.roleChip,
                    selectedRole === item.key && styles.roleChipActive,
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.roleChipText,
                      selectedRole === item.key && styles.roleChipTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Button
              title="Create Account"
              onPress={handleRegister}
              loading={loading}
              style={{ marginTop: spacing.sm }}
            />
          </>
        ) : (
          <>
            <Input
              label="Voter ID or Email Address"
              placeholder="e.g. VOTER-2026-101 or email"
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
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
              style={{ marginTop: spacing.xs }}
            />
          </>
        )}

        <TouchableOpacity
          style={styles.switchModeButton}
          onPress={() => {
            setIsRegisterMode(!isRegisterMode);
            setErrorMessage('');
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.switchModeText}>
            {isRegisterMode
              ? 'Already registered? Sign In instead'
              : 'Need a new account? Register here'}
          </Text>
        </TouchableOpacity>
      </Card>

      {/* Quick-Fill Demo Accounts for Evaluation */}
      {!isRegisterMode && (
        <Card variant="subtle" style={styles.demoBox}>
          <Text style={styles.demoTitle}>Quick Fill (Test Accounts):</Text>
          <View style={styles.demoButtonRow}>
            <TouchableOpacity
              onPress={() => applyDemoRole('admin')}
              style={styles.demoChip}
              activeOpacity={0.7}
            >
              <Text style={styles.demoChipText}>👔 Admin</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => applyDemoRole('voter')}
              style={styles.demoChip}
              activeOpacity={0.7}
            >
              <Text style={styles.demoChipText}>🗳️ Voter (101)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => applyDemoRole('party_rep')}
              style={styles.demoChip}
              activeOpacity={0.7}
            >
              <Text style={styles.demoChipText}>📢 Party Rep</Text>
            </TouchableOpacity>
          </View>
        </Card>
      )}

      {/* Server Gateway Configuration */}
      <View style={styles.serverBox}>
        <TouchableOpacity
          onPress={() => setShowServerConfig(!showServerConfig)}
          style={styles.serverHeaderRow}
          activeOpacity={0.7}
        >
          <Text style={styles.serverInfoText} numberOfLines={1}>
            🌐 Server: {api.baseUrl}
          </Text>
          <Text style={styles.serverEditText}>{showServerConfig ? 'Close' : 'Change'}</Text>
        </TouchableOpacity>

        {showServerConfig && (
          <View style={styles.serverEditForm}>
            <Input
              label="Backend Server URL"
              placeholder="http://192.168.1.101:5000/api"
              value={serverUrl}
              onChangeText={setServerUrl}
            />
            <Button
              title="Save & Connect"
              variant="outline"
              onPress={() => {
                api.setBaseUrl(serverUrl.trim());
                setShowServerConfig(false);
                Alert.alert('Server Updated', `API endpoint set to: ${api.baseUrl}`);
              }}
              style={{ marginTop: spacing.xs }}
            />
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: STATUS_BAR_HEIGHT + spacing.md,
    paddingBottom: spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logoBadgeContainer: {
    width: 64,
    height: 64,
    borderRadius: radius.xl,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    ...shadows.sm,
  },
  logoBadge: {
    fontSize: 32,
  },
  appTitle: {
    ...typography.titleLarge,
    fontSize: 24,
    color: '#0F172A',
    fontWeight: '800',
  },
  screenSubtitle: {
    ...typography.bodyMedium,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
  formCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: radius.md,
    padding: spacing.md - 2,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#FECACA',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  errorIcon: {
    fontSize: 16,
  },
  errorBoxText: {
    ...typography.bodyMedium,
    color: '#B91C1C',
    flex: 1,
    fontWeight: '500',
  },
  roleLabel: {
    ...typography.labelMedium,
    color: '#475569',
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  roleToggleRow: {
    flexDirection: 'row',
    gap: spacing.xs + 2,
    marginBottom: spacing.md,
  },
  roleChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    backgroundColor: '#F1F5F9',
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  roleChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  roleChipText: {
    ...typography.labelSmall,
    color: '#64748B',
    fontWeight: '700',
  },
  roleChipTextActive: {
    color: colors.textInverse,
  },
  switchModeButton: {
    marginTop: spacing.md,
    alignItems: 'center',
    paddingVertical: 4,
  },
  switchModeText: {
    ...typography.labelMedium,
    color: '#2563EB',
    fontWeight: '700',
  },

  // Demo Credentials Box
  demoBox: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  demoTitle: {
    ...typography.labelSmall,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: spacing.sm,
    letterSpacing: 0.5,
  },
  demoButtonRow: {
    flexDirection: 'row',
    gap: spacing.xs + 2,
  },
  demoChip: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.sm,
  },
  demoChipText: {
    ...typography.labelSmall,
    fontWeight: '700',
    color: '#0F172A',
  },

  // Server Box
  serverBox: {
    padding: spacing.sm + 2,
    backgroundColor: '#F1F5F9',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  serverHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serverInfoText: {
    ...typography.bodySmall,
    color: '#64748B',
    flex: 1,
    fontSize: 11,
  },
  serverEditText: {
    ...typography.labelSmall,
    color: '#2563EB',
    fontWeight: '700',
    marginLeft: spacing.sm,
  },
  serverEditForm: {
    marginTop: spacing.sm,
  },
});
