import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { colors, typography, spacing } from '../../theme/colors';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { api } from '../../services/api';

export const PartyRepDashboardScreen = ({ user, onNavigateToSettings, onLogout }) => {
  const [elections, setElections] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedElectionId, setSelectedElectionId] = useState('');
  const [partyName, setPartyName] = useState('');
  const [candidateName, setCandidateName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [manifesto, setManifesto] = useState('');
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    try {
      const res = await api.getElections();
      if (res.success && res.data?.elections) {
        setElections(res.data.elections);
        if (res.data.elections.length > 0 && !selectedElectionId) {
          setSelectedElectionId(res.data.elections[0].electionId);
        }
      }
    } catch (err) {
      console.warn('Error loading data:', err.message);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRegisterParty = async () => {
    if (!selectedElectionId || !partyName || !candidateName || !symbol) {
      Alert.alert('Required Fields', 'Please fill in all candidate registration fields.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.registerParty(
        selectedElectionId,
        partyName,
        candidateName,
        symbol,
        '',
        manifesto
      );
      if (res.success) {
        Alert.alert(
          'Candidate Submitted',
          'Candidate submitted for administrator review and approval.'
        );
        setPartyName('');
        setCandidateName('');
        setSymbol('');
        setManifesto('');
      }
    } catch (err) {
      Alert.alert('Registration Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="Party Representative"
        subtitle={`Rep: ${user?.voterId || ''}`}
        rightAction={
          <Button
            title="Settings"
            variant="outline"
            onPress={onNavigateToSettings}
            style={{ height: 32, paddingHorizontal: spacing.sm }}
          />
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} />}
      >
        <Card style={styles.repInfoCard}>
          <Text style={styles.cardTitle}>Authorized Representative Account</Text>
          <Text style={styles.cardDesc}>
            Logged in as accredited party agent for election monitoring and official candidate registration.
          </Text>
        </Card>

        {/* Register Candidate for Election */}
        <Card>
          <Text style={styles.sectionTitle}>Submit Candidate for Election</Text>
          <Text style={styles.cardDesc}>
            Candidate profiles can only be registered before the election configuration is frozen.
          </Text>

          <Input
            label="Target Election ID"
            placeholder="e.g. ELEC-..."
            value={selectedElectionId}
            onChangeText={setSelectedElectionId}
          />
          <Input
            label="Political Party / Alliance Name"
            placeholder="Official Party Name"
            value={partyName}
            onChangeText={setPartyName}
          />
          <Input
            label="Candidate Legal Name"
            placeholder="Candidate Name"
            value={candidateName}
            onChangeText={setCandidateName}
          />
          <Input
            label="Authorized Party Symbol"
            placeholder="e.g. Lotus, Torch, Elephant, Arrow"
            value={symbol}
            onChangeText={setSymbol}
          />
          <Input
            label="Manifesto Key Policy Summary"
            placeholder="Short summary of key pledges"
            value={manifesto}
            onChangeText={setManifesto}
            multiline
            numberOfLines={2}
          />

          <Button
            title="Submit Candidate for Commission Review"
            onPress={handleRegisterParty}
            loading={loading}
          />
        </Card>

        {/* Confidentiality Invariant */}
        <Card style={styles.privacyNote}>
          <Text style={styles.privacyNoteTitle}>⚖️ Electoral Impartiality Notice</Text>
          <Text style={styles.privacyNoteText}>
            • Party representatives are granted equal access to public blockchain audit records.
            {'\n'}• Neither representatives nor administrators can view or deduce individual voter choices.
            {'\n'}• All ballot submissions remain encrypted until verified tally publication.
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
  repInfoCard: {
    backgroundColor: colors.surfaceSubtle,
    marginBottom: spacing.md,
  },
  cardTitle: {
    ...typography.titleMedium,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  cardDesc: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  sectionTitle: {
    ...typography.titleMedium,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  privacyNote: {
    backgroundColor: '#F8FAFC',
    borderColor: colors.borderDark,
    marginTop: spacing.md,
  },
  privacyNoteTitle: {
    ...typography.titleSmall,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  privacyNoteText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
