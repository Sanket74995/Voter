import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { colors, typography, spacing } from '../../theme/colors';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { api } from '../../services/api';

export const CreateElectionWizardScreen = ({ onBack, onElectionCreated }) => {
  const [step, setStep] = useState(1);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDaysFromNow, setStartDaysFromNow] = useState('0');
  const [durationDays, setDurationDays] = useState('7');

  // Candidate setup (requires at least 2)
  const [candidates, setCandidates] = useState([
    { name: 'Progressive Alliance', candidateName: 'Dr. Evelyn Reed', symbol: 'Sun' },
    { name: 'National Reform Coalition', candidateName: 'Marcus Vance', symbol: 'Eagle' },
  ]);

  const [newPartyName, setNewPartyName] = useState('');
  const [newCandidateName, setNewCandidateName] = useState('');
  const [newSymbol, setNewSymbol] = useState('');

  const [loading, setLoading] = useState(false);

  const addCandidate = () => {
    if (!newPartyName || !newCandidateName || !newSymbol) {
      Alert.alert('Incomplete Fields', 'Please enter Party Name, Candidate Name, and Symbol.');
      return;
    }
    setCandidates([
      ...candidates,
      { name: newPartyName, candidateName: newCandidateName, symbol: newSymbol },
    ]);
    setNewPartyName('');
    setNewCandidateName('');
    setNewSymbol('');
  };

  const removeCandidate = (index) => {
    if (candidates.length <= 2) {
      Alert.alert('Requirement', 'An election must have at least 2 candidates.');
      return;
    }
    setCandidates(candidates.filter((_, i) => i !== index));
  };

  const handleCreateElection = async () => {
    if (!title) {
      Alert.alert('Title Required', 'Please enter an election title.');
      return;
    }

    setLoading(true);
    try {
      const startTime = new Date(Date.now() + Number(startDaysFromNow) * 86400000);
      const endTime = new Date(startTime.getTime() + Number(durationDays) * 86400000);

      // 1. Create election
      const elRes = await api.createElection(title, description, startTime, endTime);
      if (!elRes.success || !elRes.data?.election) {
        throw new Error(elRes.error || 'Failed to create election.');
      }

      const createdElectionId = elRes.data.election.electionId;

      // 2. Register candidates
      for (const c of candidates) {
        await api.registerParty(createdElectionId, c.name, c.candidateName, c.symbol);
      }

      Alert.alert(
        'Election Created',
        `Election '${title}' created successfully in DRAFT state with ${candidates.length} approved candidates.`,
        [{ text: 'OK', onPress: onElectionCreated }]
      );
    } catch (err) {
      Alert.alert('Creation Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Create Election Wizard" showBack onBack={onBack} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Step Indicator */}
        <View style={styles.stepperRow}>
          {[1, 2, 3].map((s) => (
            <View key={s} style={styles.stepperItem}>
              <View style={[styles.stepCircle, step >= s && styles.stepCircleActive]}>
                <Text style={[styles.stepNumber, step >= s && styles.stepNumberActive]}>{s}</Text>
              </View>
              <Text style={styles.stepLabel}>
                {s === 1 ? 'Details' : s === 2 ? 'Candidates' : 'Review'}
              </Text>
            </View>
          ))}
        </View>

        {/* Step 1: Election Information & Schedule */}
        {step === 1 && (
          <Card>
            <Text style={styles.cardTitle}>Election Details & Schedule</Text>
            <Input
              label="Election Title"
              placeholder="e.g. University Student Council 2026"
              value={title}
              onChangeText={setTitle}
            />
            <Input
              label="Description / Purpose"
              placeholder="State rules, constitutional quorum, and scope"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />
            <Input
              label="Start in (Days from now)"
              placeholder="0 (Starts immediately)"
              value={startDaysFromNow}
              onChangeText={setStartDaysFromNow}
              keyboardType="numeric"
            />
            <Input
              label="Voting Window Duration (Days)"
              placeholder="7"
              value={durationDays}
              onChangeText={setDurationDays}
              keyboardType="numeric"
            />

            <Button
              title="Next: Configure Candidates →"
              onPress={() => {
                if (!title) {
                  Alert.alert('Required', 'Please enter election title.');
                  return;
                }
                setStep(2);
              }}
              style={{ marginTop: spacing.md }}
            />
          </Card>
        )}

        {/* Step 2: Candidates Configuration */}
        {step === 2 && (
          <Card>
            <Text style={styles.cardTitle}>Configure Candidates ({candidates.length})</Text>
            <Text style={styles.cardSubtitle}>
              Rules require at least 2 distinct candidate options before an election can be frozen.
            </Text>

            {candidates.map((c, i) => (
              <View key={i} style={styles.candidateListItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.candidateListTitle}>{c.name}</Text>
                  <Text style={styles.candidateListSub}>
                    {c.candidateName} (Symbol: {c.symbol})
                  </Text>
                </View>
                <Button
                  title="Remove"
                  variant="outline"
                  onPress={() => removeCandidate(i)}
                  style={{ height: 32, paddingHorizontal: spacing.sm }}
                />
              </View>
            ))}

            <View style={styles.addForm}>
              <Text style={styles.addFormTitle}>+ Add Another Candidate</Text>
              <Input
                label="Party / Group Name"
                placeholder="Party Name"
                value={newPartyName}
                onChangeText={setNewPartyName}
              />
              <Input
                label="Candidate Name"
                placeholder="Full Name"
                value={newCandidateName}
                onChangeText={setNewCandidateName}
              />
              <Input
                label="Ballot Symbol"
                placeholder="Symbol (e.g. Star, Anchor)"
                value={newSymbol}
                onChangeText={setNewSymbol}
              />
              <Button title="Add Option to Ballot" variant="secondary" onPress={addCandidate} />
            </View>

            <View style={{ flexDirection: 'row', marginTop: spacing.lg }}>
              <Button
                title="← Back"
                variant="outline"
                onPress={() => setStep(1)}
                style={{ flex: 1, marginRight: spacing.sm }}
              />
              <Button
                title="Next: Review →"
                onPress={() => setStep(3)}
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        )}

        {/* Step 3: Review & Final Confirmation */}
        {step === 3 && (
          <Card>
            <Text style={styles.cardTitle}>Review Election Setup</Text>
            <View style={styles.reviewBox}>
              <Text style={styles.reviewLabel}>Title:</Text>
              <Text style={styles.reviewValue}>{title}</Text>

              <Text style={styles.reviewLabel}>Duration:</Text>
              <Text style={styles.reviewValue}>{durationDays} days window</Text>

              <Text style={styles.reviewLabel}>Candidates Count:</Text>
              <Text style={styles.reviewValue}>{candidates.length} options</Text>
            </View>

            <Text style={styles.securityWarning}>
              🛡️ Note: Once registered in DRAFT state, the Election Commission must import voter
              eligibility and freeze the configuration before opening the voting window.
            </Text>

            <View style={{ flexDirection: 'row', marginTop: spacing.md }}>
              <Button
                title="← Back"
                variant="outline"
                onPress={() => setStep(2)}
                style={{ flex: 1, marginRight: spacing.sm }}
              />
              <Button
                title="Confirm & Deploy"
                loading={loading}
                onPress={handleCreateElection}
                style={{ flex: 1 }}
              />
            </View>
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
  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.lg,
  },
  stepperItem: {
    alignItems: 'center',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1.5,
    borderColor: colors.borderDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepCircleActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  stepNumber: {
    ...typography.badge,
    color: colors.textSecondary,
  },
  stepNumberActive: {
    color: colors.textInverse,
  },
  stepLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  cardTitle: {
    ...typography.titleLarge,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  cardSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  candidateListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  candidateListTitle: {
    ...typography.titleSmall,
    color: colors.primary,
  },
  candidateListSub: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  addForm: {
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 8,
  },
  addFormTitle: {
    ...typography.titleSmall,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  reviewBox: {
    backgroundColor: colors.surfaceSubtle,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  reviewLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  reviewValue: {
    ...typography.titleSmall,
    color: colors.primary,
  },
  securityWarning: {
    ...typography.bodySmall,
    color: colors.textMuted,
    lineHeight: 18,
  },
});
