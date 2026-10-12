import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { colors, typography, spacing } from '../../theme/colors';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';

export const BallotScreen = ({
  election,
  parties = [],
  onBack,
  onConfirmSelection,
}) => {
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [isReviewModalVisible, setReviewModalVisible] = useState(false);

  const handleReview = () => {
    if (!selectedCandidate) {
      Alert.alert('Selection Required', 'Please select one approved candidate option before proceeding.');
      return;
    }
    setReviewModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <Header
        title="Official Ballot"
        subtitle={election.title}
        showBack
        onBack={onBack}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.instructionsCard}>
          <Text style={styles.instructionTitle}>Voting Instructions</Text>
          <Text style={styles.instructionText}>
            Select exactly one approved party or candidate. You will review your selection before
            encrypting and submitting the ballot to the blockchain. Confirmed submissions cannot be altered.
          </Text>
        </Card>

        <Text style={styles.sectionTitle}>Candidates</Text>

        {parties.map((p) => {
          const isSelected = selectedCandidate?.partyId === p.partyId;
          return (
            <TouchableOpacity
              key={p.partyId}
              activeOpacity={0.8}
              onPress={() => setSelectedCandidate(p)}
            >
              <Card style={[styles.candidateOptionCard, isSelected && styles.selectedCandidateCard]}>
                <View style={styles.optionRow}>
                  <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                    {isSelected && <View style={styles.radioInnerCircle} />}
                  </View>

                  <View style={styles.candidateDetails}>
                    <Text style={[styles.partyName, isSelected && styles.selectedPartyName]}>
                      {p.name}
                    </Text>
                    <Text style={styles.candidatePerson}>Candidate: {p.candidateName}</Text>
                    {p.manifestoSummary ? (
                      <Text style={styles.manifestoText} numberOfLines={2}>
                        {p.manifestoSummary}
                      </Text>
                    ) : null}
                  </View>

                  <View style={styles.symbolBadge}>
                    <Text style={styles.symbolText}>{p.symbol}</Text>
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Review Modal / Bottom Confirmation Sheet */}
      {isReviewModalVisible && (
        <View style={styles.reviewModalOverlay}>
          <Card style={styles.reviewModalCard}>
            <Text style={styles.reviewHeader}>Confirm Your Choice</Text>
            <Text style={styles.reviewSubtitle}>
              Please verify your selected candidate before client-side encryption.
            </Text>

            <View style={styles.reviewSelectedBox}>
              <Text style={styles.reviewSelectedParty}>{selectedCandidate?.name}</Text>
              <Text style={styles.reviewSelectedPerson}>
                Candidate: {selectedCandidate?.candidateName} ({selectedCandidate?.symbol})
              </Text>
            </View>

            <Text style={styles.reviewWarning}>
              ⚠️ Under smart contract rules, exactly one accepted vote is permitted. Once
              broadcasted, this ballot cannot be changed or resubmitted.
            </Text>

            <View style={styles.reviewButtonsRow}>
              <Button
                title="Change Choice"
                variant="outline"
                onPress={() => setReviewModalVisible(false)}
                style={{ flex: 1, marginRight: spacing.sm }}
              />
              <Button
                title="Encrypt & Cast"
                onPress={() => {
                  setReviewModalVisible(false);
                  onConfirmSelection(selectedCandidate);
                }}
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        </View>
      )}

      {!isReviewModalVisible && (
        <View style={styles.bottomBar}>
          <Button
            title={selectedCandidate ? 'Review Selection' : 'Select a Candidate'}
            disabled={!selectedCandidate}
            onPress={handleReview}
          />
        </View>
      )}
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
    paddingBottom: spacing.xxl,
  },
  instructionsCard: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    marginBottom: spacing.md,
  },
  instructionTitle: {
    ...typography.titleSmall,
    color: colors.accent,
    marginBottom: spacing.xs,
  },
  instructionText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  sectionTitle: {
    ...typography.titleMedium,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  candidateOptionCard: {
    borderWidth: 2,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  selectedCandidateCard: {
    borderColor: colors.accent,
    backgroundColor: '#F8FAFF',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.borderDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  radioCircleSelected: {
    borderColor: colors.accent,
  },
  radioInnerCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.accent,
  },
  candidateDetails: {
    flex: 1,
  },
  partyName: {
    ...typography.titleSmall,
    color: colors.primary,
  },
  selectedPartyName: {
    color: colors.accent,
  },
  candidatePerson: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    marginTop: 2,
  },
  manifestoText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  symbolBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    marginLeft: spacing.sm,
  },
  symbolText: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: '#92400E',
  },
  bottomBar: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  reviewModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'flex-end',
    padding: spacing.md,
  },
  reviewModalCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: 16,
  },
  reviewHeader: {
    ...typography.titleLarge,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  reviewSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  reviewSelectedBox: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
  },
  reviewSelectedParty: {
    ...typography.titleSmall,
    color: colors.primary,
  },
  reviewSelectedPerson: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    marginTop: 2,
  },
  reviewWarning: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 18,
  },
  reviewButtonsRow: {
    flexDirection: 'row',
  },
});
