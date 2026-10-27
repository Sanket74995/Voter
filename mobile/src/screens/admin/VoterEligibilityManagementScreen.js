import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Modal,
  FlatList,
  Animated,
  TextInput,
  ActivityIndicator,
  BackHandler,
} from 'react-native';
import { colors, typography, spacing, radius, shadows } from '../../theme/colors';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { api } from '../../services/api';

const GENERATED_VOTERS = [
  'VOTER-2026-101',
  'VOTER-2026-102',
  'VOTER-2026-103',
  'VOTER-2026-104',
  'VOTER-2026-105',
  'VOTER-2026-106',
  'VOTER-2026-107',
  'VOTER-2026-108',
  'VOTER-2026-109',
  'VOTER-2026-110',
  'VOTER-2026-111',
  'VOTER-2026-112',
  'VOTER-2026-113',
  'VOTER-2026-114',
  'VOTER-2026-115',
];

export const VoterEligibilityManagementScreen = ({ onBack }) => {
  // Election picker state
  const [elections, setElections] = useState([]);
  const [selectedElection, setSelectedElection] = useState(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [electionsLoading, setElectionsLoading] = useState(true);

  // Voter input & viewing mode state ('chips' vs 'text')
  const [voterIds, setVoterIds] = useState('');
  const [viewMode, setViewMode] = useState('chips'); // 'chips' or 'text'

  // Registry voter picker modal state
  const [registryModalVisible, setRegistryModalVisible] = useState(false);
  const [registryVoters, setRegistryVoters] = useState([]);
  const [registryLoading, setRegistryLoading] = useState(false);
  const [selectedVoterIds, setSelectedVoterIds] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  // Revocation state
  const [revocationVoterId, setRevocationVoterId] = useState('');
  const [revocationReason, setRevocationReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [revokeLoading, setRevokeLoading] = useState(false);

  // Registration results
  const [results, setResults] = useState([]);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Android hardware / gesture back button handler
  useEffect(() => {
    const handleHardwareBack = () => {
      if (registryModalVisible) {
        setRegistryModalVisible(false);
        return true;
      }
      if (pickerVisible) {
        setPickerVisible(false);
        return true;
      }
      if (onBack) {
        onBack();
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      handleHardwareBack
    );
    return () => subscription.remove();
  }, [registryModalVisible, pickerVisible, onBack]);

  useEffect(() => {
    fetchElections();
  }, []);

  useEffect(() => {
    if (results.length > 0) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }).start();
    }
  }, [results]);

  const fetchElections = async () => {
    setElectionsLoading(true);
    try {
      const res = await api.getElections();
      if (res.success && res.data?.elections) {
        const draftAndFrozen = res.data.elections.filter(
          (e) => e.status === 'DRAFT' || e.status === 'FROZEN' || e.status === 'OPEN'
        );
        setElections(draftAndFrozen);
        const firstDraft = draftAndFrozen.find((e) => e.status === 'DRAFT');
        if (firstDraft && !selectedElection) {
          setSelectedElection(firstDraft);
        } else if (draftAndFrozen.length > 0 && !selectedElection) {
          setSelectedElection(draftAndFrozen[0]);
        }
      }
    } catch (err) {
      console.warn('Could not load elections:', err.message);
    } finally {
      setElectionsLoading(false);
    }
  };

  const parseVoterIds = (text) => {
    if (!text) return [];
    const lines = text.split(/[\r\n]+/);
    const ids = new Set();

    lines.forEach((line) => {
      const tokens = line.split(/[,;\t]+/);
      tokens.forEach((token) => {
        let clean = token.trim().replace(/^["']|["']$/g, '');
        if (clean.length > 0) {
          const lower = clean.toLowerCase();
          if (
            lower === 'voter id' ||
            lower === 'voterid' ||
            lower === 'id' ||
            lower === 's.no' ||
            lower === 'full name'
          ) {
            return;
          }
          if (clean.toUpperCase().startsWith('VOTER-') || clean.length >= 3) {
            ids.add(clean.toUpperCase());
          }
        }
      });
    });

    return Array.from(ids);
  };

  const currentParsedIds = parseVoterIds(voterIds);

  const handleRemoveSingleChip = (idToRemove) => {
    const nextIds = currentParsedIds.filter((id) => id !== idToRemove);
    setVoterIds(nextIds.join('\n'));
  };

  const handleLoadGeneratedVoters = async () => {
    try {
      const res = await api.getRegisteredVoters();
      if (!res.success || !res.data?.voters) {
        throw new Error(res.error || 'The voter directory response was invalid.');
      }

      const registeredIds = new Set(res.data.voters.map((voter) => voter.voterId));
      const availableIds = GENERATED_VOTERS.filter((id) => registeredIds.has(id));
      if (availableIds.length === 0) {
        Alert.alert(
          'Demo Accounts Not Found',
          'These demo voter IDs are not accounts in the database yet. Start MongoDB, then run "npm --prefix backend run seed:voters" from the project folder.'
        );
        return;
      }

      setVoterIds(availableIds.join('\n'));
      Alert.alert(
        'Ready to Register',
        `${availableIds.length} registered demo voter account(s) added to the list. Tap the button below to approve them for this election.`
      );
    } catch (err) {
      Alert.alert(
        'Could Not Load Demo Voters',
        `${err.message} Check that the backend and database are running.`
      );
    }
  };

  const handleOpenRegistryModal = async () => {
    setRegistryModalVisible(true);
    setRegistryLoading(true);
    try {
      if (api.getRegisteredVoters) {
        const res = await api.getRegisteredVoters();
        if (!res.success || !res.data?.voters) {
          throw new Error(res.error || 'The voter directory response was invalid.');
        }
        setRegistryVoters(res.data.voters);
        const allIds = new Set(res.data.voters.map((v) => v.voterId));
        setSelectedVoterIds(allIds);
      }
    } catch (err) {
      console.warn('Failed to load registered voters:', err.message);
      setRegistryVoters([]);
      setSelectedVoterIds(new Set());
      Alert.alert(
        'Could Not Load Voter Directory',
        `${err.message} Check that the backend and database are running.`
      );
    } finally {
      setRegistryLoading(false);
    }
  };

  const toggleSelectVoter = (voterId) => {
    setSelectedVoterIds((prev) => {
      const next = new Set(prev);
      if (next.has(voterId)) {
        next.delete(voterId);
      } else {
        next.add(voterId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedVoterIds.size === filteredRegistryVoters.length) {
      setSelectedVoterIds(new Set());
    } else {
      setSelectedVoterIds(new Set(filteredRegistryVoters.map((v) => v.voterId)));
    }
  };

  const handleApplyRegistrySelection = () => {
    if (selectedVoterIds.size === 0) {
      Alert.alert('No Voters Selected', 'Please check at least one voter to add.');
      return;
    }
    const ids = Array.from(selectedVoterIds);
    setVoterIds(ids.join('\n'));
    setRegistryModalVisible(false);
  };

  const handleBulkRegister = async () => {
    if (!selectedElection) {
      Alert.alert('Please Select an Election', 'Pick an election from the dropdown list first.');
      return;
    }

    if (selectedElection.status !== 'DRAFT') {
      Alert.alert(
        'Election is Locked',
        `This election is currently "${selectedElection.status}". You can only add voters to an election that is still in Draft mode.`
      );
      return;
    }

    const ids = parseVoterIds(voterIds);
    if (ids.length === 0) {
      Alert.alert('No Voters Listed', 'Please select or type at least one Voter ID to add.');
      return;
    }

    setLoading(true);
    setResults([]);

    try {
      if (api.bulkRegisterVoterEligibility) {
        try {
          const res = await api.bulkRegisterVoterEligibility(selectedElection.electionId, ids);
          if (res.success && res.data?.results) {
            setResults(res.data.results);
            const successCount = res.data.registeredCount || 0;
            const failCount = res.data.failedCount || 0;

            if (failCount === 0) {
              Alert.alert(
                'Success!',
                `All ${successCount} voter(s) can now vote in "${selectedElection.title}".`
              );
              setVoterIds('');
            } else {
              Alert.alert(
                'Done with Some Notices',
                `${successCount} voter(s) added successfully. ${failCount} were already added or not found. Details below.`
              );
            }
            fetchElections();
            setLoading(false);
            return;
          }
        } catch (apiErr) {
          console.warn('Bulk endpoint failed, falling back to sequential:', apiErr.message);
        }
      }

      // Sequential fallback
      const batchResults = [];
      for (const id of ids) {
        try {
          await api.registerVoterEligibility(selectedElection.electionId, id);
          batchResults.push({
            voterId: id.toUpperCase(),
            success: true,
            message: 'Added successfully',
          });
        } catch (err) {
          batchResults.push({
            voterId: id.toUpperCase(),
            success: false,
            message: err.message?.includes('already')
              ? 'Already registered for this election'
              : err.message?.includes('exist')
              ? 'Voter ID not found in system'
              : 'Could not register voter',
          });
        }
      }

      setResults(batchResults);
      const successCount = batchResults.filter((r) => r.success).length;
      const failCount = batchResults.length - successCount;

      if (failCount === 0) {
        Alert.alert(
          'Success!',
          `All ${successCount} voter(s) can now vote in "${selectedElection.title}".`
        );
        setVoterIds('');
      } else {
        Alert.alert(
          'Registration Completed',
          `${successCount} added successfully. ${failCount} need review. Check details below.`
        );
      }
    } catch (globalErr) {
      Alert.alert('Could Not Complete', globalErr.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
      fetchElections();
    }
  };

  const handleRevokeCredential = async () => {
    if (!selectedElection) {
      Alert.alert('Please Select an Election', 'Pick the election where this voter is registered.');
      return;
    }
    if (!revocationVoterId.trim()) {
      Alert.alert('Missing Voter ID', 'Please enter the Voter ID you want to remove.');
      return;
    }

    setRevokeLoading(true);
    try {
      const res = await api.revokeCredential(
        selectedElection.electionId,
        revocationVoterId.trim(),
        revocationReason || 'Removed by administrator'
      );
      if (res.success) {
        Alert.alert(
          'Voter Removed',
          `Voting permission for '${revocationVoterId.toUpperCase()}' has been safely cancelled.`
        );
        setRevocationVoterId('');
        setRevocationReason('');
      }
    } catch (err) {
      Alert.alert('Could Not Remove Voter', err.message || 'Please check the ID and try again.');
    } finally {
      setRevokeLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'DRAFT': return colors.warning;
      case 'FROZEN': return colors.accent;
      case 'OPEN': return colors.success;
      default: return colors.textMuted;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'DRAFT': return 'Setup (Draft)';
      case 'FROZEN': return 'Ready (Locked)';
      case 'OPEN': return 'Voting Live';
      case 'CLOSED': return 'Ended';
      case 'PUBLISHED': return 'Results Announced';
      default: return status;
    }
  };

  const renderElectionPickerItem = ({ item }) => {
    const isSelected = selectedElection?.electionId === item.electionId;
    return (
      <TouchableOpacity
        style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
        onPress={() => {
          setSelectedElection(item);
          setPickerVisible(false);
          setResults([]);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.pickerItemLeft}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
          <View style={styles.pickerItemInfo}>
            <Text style={[styles.pickerItemTitle, isSelected && styles.pickerItemTitleSelected]}>
              {item.title}
            </Text>
            <Text style={styles.pickerItemSubtitle}>
              {item.totalEligibleVoters || 0} registered voters · {getStatusLabel(item.status)}
            </Text>
          </View>
        </View>
        <Badge label={getStatusLabel(item.status)} variant={item.status} />
      </TouchableOpacity>
    );
  };

  const filteredRegistryVoters = registryVoters.filter((v) => {
    const q = searchQuery.toLowerCase();
    return (
      v.voterId.toLowerCase().includes(q) ||
      (v.fullName && v.fullName.toLowerCase().includes(q)) ||
      (v.email && v.email.toLowerCase().includes(q))
    );
  });

  const voterCount = currentParsedIds.length;
  const isDraftElection = selectedElection?.status === 'DRAFT';

  return (
    <View style={styles.container}>
      <Header
        title="Voter Registration"
        subtitle="Approve who can vote in this election"
        showBack
        onBack={onBack}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* User-Friendly Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroShieldBadge}>
              <Text style={styles.heroShieldIcon}>🛡️</Text>
              <Text style={styles.heroShieldText}>100% PRIVATE VOTING</Text>
            </View>
            <View style={styles.zkStatusBadge}>
              <View style={styles.livePulseDot} />
              <Text style={styles.zkStatusText}>Secure & Verified</Text>
            </View>
          </View>

          <Text style={styles.heroHeading}>Approve Voters for Election</Text>
          <Text style={styles.heroSub}>
            Only voters approved here will be able to cast a vote. Every vote is completely
            anonymous — no administrator can ever see who voted for whom.
          </Text>

          {/* Quick Metrics Bar */}
          <View style={styles.heroMetricsBar}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>CHOSEN ELECTION</Text>
              <Text style={styles.metricValue} numberOfLines={1}>
                {selectedElection ? selectedElection.title : 'None Selected'}
              </Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>APPROVED TO VOTE</Text>
              <Text style={styles.metricValue}>
                {selectedElection?.totalEligibleVoters || 0} Voters
              </Text>
            </View>
          </View>
        </View>

        {/* Step 1: Election Selector Card */}
        <Card variant="elevated" style={styles.electionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconCircleText}>1</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Step 1: Choose Election</Text>
              <Text style={styles.cardDesc}>
                Pick the election you want to add voters to.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setPickerVisible(true)}
            activeOpacity={0.8}
          >
            {selectedElection ? (
              <View style={styles.pickerSelectedContent}>
                <View style={[styles.statusDot, { backgroundColor: getStatusColor(selectedElection.status) }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.pickerSelectedTitle} numberOfLines={1}>
                    {selectedElection.title}
                  </Text>
                  <Text style={styles.pickerSelectedSub} numberOfLines={1}>
                    {selectedElection.totalEligibleVoters || 0} approved voters · {getStatusLabel(selectedElection.status)}
                  </Text>
                </View>
                <Badge label={getStatusLabel(selectedElection.status)} variant={selectedElection.status} />
              </View>
            ) : (
              <Text style={styles.pickerPlaceholder}>
                {electionsLoading ? 'Loading elections...' : 'Tap here to select an election'}
              </Text>
            )}
            <Text style={styles.pickerArrow}>▼</Text>
          </TouchableOpacity>

          {selectedElection && !isDraftElection && (
            <View style={styles.warningBanner}>
              <Text style={styles.warningBannerIcon}>ℹ️</Text>
              <Text style={styles.warningBannerText}>
                This election is already locked. New voters can only be added while the election is still in <Text style={{ fontWeight: '700' }}>Setup (Draft)</Text> stage.
              </Text>
            </View>
          )}
        </Card>

        {/* Step 2: Add Voters Action Grid */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconCircleText}>2</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Step 2: Add Voters</Text>
            <Text style={styles.cardDesc}>
              Load registered demo accounts, pick from the database, or paste voter IDs.
            </Text>
          </View>
        </View>

        <View style={styles.actionGridRow}>
          {/* Tile 1: 1-Tap Load Seeded Voters */}
          <TouchableOpacity
            style={styles.actionTileEmerald}
            onPress={handleLoadGeneratedVoters}
            activeOpacity={0.75}
          >
            <View style={styles.actionTileHeader}>
              <Text style={styles.actionTileIcon}>⚡</Text>
              <View style={styles.pillEmerald}>
                <Text style={styles.pillEmeraldText}>1-Tap Demo</Text>
              </View>
            </View>
            <Text style={styles.actionTileTitle}>Load Demo Voter IDs</Text>
            <Text style={styles.actionTileSub}>Only accounts already in the database are loaded</Text>
          </TouchableOpacity>

          {/* Tile 2: Database Registry Browser */}
          <TouchableOpacity
            style={styles.actionTileIndigo}
            onPress={handleOpenRegistryModal}
            activeOpacity={0.75}
          >
            <View style={styles.actionTileHeader}>
              <Text style={styles.actionTileIcon}>👥</Text>
              <View style={styles.pillIndigo}>
                <Text style={styles.pillIndigoText}>Directory</Text>
              </View>
            </View>
            <Text style={styles.actionTileTitle}>Pick from Voter List</Text>
            <Text style={styles.actionTileSub}>Search & select with checkboxes</Text>
          </TouchableOpacity>
        </View>

        {/* Voter Queue & Input Card */}
        <Card variant="elevated" style={styles.queueCard}>
          <View style={styles.queueHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Review Voters to Add ({voterCount})</Text>
              <Text style={styles.cardDesc}>
                Double-check the voter IDs before adding them to the election.
              </Text>
            </View>

            {/* View Mode Switcher */}
            <View style={styles.modeSwitcher}>
              <TouchableOpacity
                style={[styles.modeTab, viewMode === 'chips' && styles.modeTabActive]}
                onPress={() => setViewMode('chips')}
              >
                <Text style={[styles.modeTabText, viewMode === 'chips' && styles.modeTabTextActive]}>
                  Pills ({voterCount})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeTab, viewMode === 'text' && styles.modeTabActive]}
                onPress={() => setViewMode('text')}
              >
                <Text style={[styles.modeTabText, viewMode === 'text' && styles.modeTabTextActive]}>
                  Type / Paste
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Chips Mode Display */}
          {viewMode === 'chips' ? (
            <View style={styles.chipsContainer}>
              {voterCount === 0 ? (
                <View style={styles.emptyChipsBox}>
                  <Text style={styles.emptyChipsIcon}>📋</Text>
                  <Text style={styles.emptyChipsText}>No voters in the list yet</Text>
                  <Text style={styles.emptyChipsSub}>
                    Load registered demo accounts, pick from the database, or switch to "Type / Paste" to enter IDs.
                  </Text>
                </View>
              ) : (
                <View style={styles.chipsWrap}>
                  {currentParsedIds.map((id) => (
                    <View key={id} style={styles.voterChip}>
                      <Text style={styles.voterChipText}>{id}</Text>
                      <TouchableOpacity
                        onPress={() => handleRemoveSingleChip(id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text style={styles.voterChipRemove}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ) : (
            /* Text / CSV Raw Edit Mode */
            <View style={styles.textAreaContainer}>
              <TextInput
                style={styles.textArea}
                multiline
                numberOfLines={6}
                placeholder={'Type or paste voter IDs here (one per line):\nVOTER-2026-101\nVOTER-2026-102'}
                placeholderTextColor={colors.textMuted}
                value={voterIds}
                onChangeText={setVoterIds}
                autoCapitalize="characters"
                textAlignVertical="top"
              />
            </View>
          )}

          {/* Action Footer for Queue */}
          <View style={styles.queueFooterRow}>
            {voterCount > 0 && (
              <TouchableOpacity
                onPress={() => setVoterIds('')}
                style={styles.clearQueueBtn}
              >
                <Text style={styles.clearQueueText}>Clear All ✕</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.queueSummaryNote}>
              {voterCount === 0
                ? 'No voters selected'
                : `${voterCount} voter${voterCount !== 1 ? 's' : ''} ready to add`}
            </Text>
          </View>

          <Button
            title={
              voterCount > 1
                ? `Confirm & Add ${voterCount} Voters to Election`
                : voterCount === 1
                ? 'Confirm & Add 1 Voter to Election'
                : 'Choose or Enter Voters First'
            }
            onPress={handleBulkRegister}
            loading={loading}
            disabled={!selectedElection || !isDraftElection || voterCount === 0}
            style={styles.registerMainBtn}
          />
        </Card>

        {/* Results Card */}
        {results.length > 0 && (
          <Animated.View style={{ opacity: fadeAnim }}>
            <Card variant="elevated" style={styles.resultsCard}>
              <View style={styles.resultsHeader}>
                <Text style={styles.cardTitle}>Registration Results</Text>
                <View style={styles.resultsSummaryPills}>
                  <View style={styles.successPill}>
                    <Text style={styles.successPillText}>
                      ✓ {results.filter((r) => r.success).length} Added
                    </Text>
                  </View>
                  {results.filter((r) => !r.success).length > 0 && (
                    <View style={styles.failPill}>
                      <Text style={styles.failPillText}>
                        ✗ {results.filter((r) => !r.success).length} Not Added
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.resultsList}>
                {results.map((r, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.resultItemRow,
                      r.success ? styles.resultItemSuccess : styles.resultItemFail,
                    ]}
                  >
                    <View
                      style={[
                        styles.resultStatusCircle,
                        r.success ? styles.resultStatusCircleSuccess : styles.resultStatusCircleFail,
                      ]}
                    >
                      <Text style={styles.resultStatusIconText}>
                        {r.success ? '✓' : '✗'}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.resultVoterIdText}>{r.voterId}</Text>
                      <Text
                        style={[
                          styles.resultStatusMsg,
                          r.success ? styles.resultStatusMsgSuccess : styles.resultStatusMsgFail,
                        ]}
                      >
                        {r.message || (r.success ? 'Added to election' : 'Could not add')}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </Card>
          </Animated.View>
        )}

        {/* Emergency Removal Section */}
        <Card variant="subtle" style={styles.revokeCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.iconCircle, { backgroundColor: '#FEE2E2' }]}>
              <Text style={styles.iconCircleText}>🚫</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: '#991B1B' }]}>
                Remove a Voter (Emergency Only)
              </Text>
              <Text style={styles.cardDesc}>
                If a voter reported their phone was lost or stolen before voting, you can cancel their voting permission here.
              </Text>
            </View>
          </View>

          <Input
            label="Voter ID to Cancel"
            placeholder="e.g. VOTER-2026-101"
            value={revocationVoterId}
            onChangeText={setRevocationVoterId}
            autoCapitalize="characters"
          />
          <Input
            label="Reason for Cancelling"
            placeholder="e.g. Voter reported lost device"
            value={revocationReason}
            onChangeText={setRevocationReason}
          />

          <Button
            title="Cancel Voter's Permission"
            variant="danger"
            onPress={handleRevokeCredential}
            loading={revokeLoading}
            disabled={!selectedElection}
          />
        </Card>

        {/* Privacy Notice Card */}
        <Card variant="glass" style={styles.policyCard}>
          <View style={styles.policyHeader}>
            <Text style={styles.policyShield}>🔒</Text>
            <Text style={styles.policyTitle}>How Voter Privacy is Protected</Text>
          </View>
          <Text style={styles.policyText}>
            • Your vote is 100% secret. No one can ever trace your choice back to your name or ID.
            {'\n'}• Adding a voter only grants them permission to vote — it gives no access to their ballot.
            {'\n'}• The system automatically ensures each voter can only vote once.
          </Text>
        </Card>
      </ScrollView>

      {/* Election Selector Modal */}
      <Modal
        visible={pickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPickerVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Choose an Election</Text>
            <Text style={styles.modalSubtitle}>
              Select which election you want to manage voters for
            </Text>

            {elections.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📋</Text>
                <Text style={styles.emptyText}>
                  No active or upcoming elections found. Create a new election from the Admin Dashboard first.
                </Text>
              </View>
            ) : (
              <FlatList
                data={elections}
                keyExtractor={(item) => item.electionId}
                renderItem={renderElectionPickerItem}
                style={styles.pickerList}
                ItemSeparatorComponent={() => <View style={styles.pickerSeparator} />}
              />
            )}

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setPickerVisible(false)}
            >
              <Text style={styles.modalCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Database Voter Browser Modal */}
      <Modal
        visible={registryModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRegistryModalVisible(false)}
      >
        <View style={styles.registryModalOverlay}>
          <View style={styles.registryModalContainer}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Select Voters from List</Text>
            <Text style={styles.modalSubtitle}>
              Check the voters you want to approve for this election
            </Text>

            {/* Search Input */}
            <TextInput
              style={styles.searchBar}
              placeholder="Search by voter name or ID..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />

            {/* Select All Row */}
            <View style={styles.selectAllRow}>
              <TouchableOpacity onPress={toggleSelectAll} style={styles.selectAllBtn}>
                <View
                  style={[
                    styles.checkboxBox,
                    selectedVoterIds.size === filteredRegistryVoters.length &&
                      filteredRegistryVoters.length > 0 &&
                      styles.checkboxBoxActive,
                  ]}
                >
                  {selectedVoterIds.size === filteredRegistryVoters.length &&
                    filteredRegistryVoters.length > 0 && (
                      <Text style={styles.checkmarkIcon}>✓</Text>
                    )}
                </View>
                <Text style={styles.selectAllText}>
                  {selectedVoterIds.size === filteredRegistryVoters.length
                    ? 'Deselect All'
                    : `Select All (${filteredRegistryVoters.length})`}
                </Text>
              </TouchableOpacity>
              <View style={styles.selectedCountPill}>
                <Text style={styles.selectedCountText}>
                  {selectedVoterIds.size} Selected
                </Text>
              </View>
            </View>

            {registryLoading ? (
              <View style={styles.modalLoadingBox}>
                <ActivityIndicator size="large" color={colors.accent} />
                <Text style={styles.modalLoadingText}>Loading voters...</Text>
              </View>
            ) : (
              <FlatList
                data={filteredRegistryVoters}
                keyExtractor={(item) => item.voterId}
                style={styles.registryList}
                renderItem={({ item }) => {
                  const isChecked = selectedVoterIds.has(item.voterId);
                  return (
                    <TouchableOpacity
                      style={[styles.voterRow, isChecked && styles.voterRowSelected]}
                      onPress={() => toggleSelectVoter(item.voterId)}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.checkboxBox,
                          isChecked && styles.checkboxBoxActive,
                        ]}
                      >
                        {isChecked && <Text style={styles.checkmarkIcon}>✓</Text>}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.voterRowName}>{item.fullName}</Text>
                        <Text style={styles.voterRowSub}>
                          ID: {item.voterId} · {item.email}
                        </Text>
                      </View>
                      <Badge label="ACTIVE" variant="ACTIVE" showDot={false} />
                    </TouchableOpacity>
                  );
                }}
                ItemSeparatorComponent={() => <View style={styles.pickerSeparator} />}
              />
            )}

            {/* Action Buttons */}
            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setRegistryModalVisible(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalApplyBtn}
                onPress={handleApplyRegistrySelection}
              >
                <Text style={styles.modalApplyBtnText}>
                  Add Selected ({selectedVoterIds.size})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },

  // Hero Card
  heroCard: {
    backgroundColor: '#0F172A',
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.lg,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  heroShieldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    gap: 4,
  },
  heroShieldIcon: {
    fontSize: 12,
  },
  heroShieldText: {
    ...typography.labelSmall,
    color: '#94A3B8',
    letterSpacing: 0.8,
    fontSize: 9,
  },
  zkStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  zkStatusText: {
    ...typography.labelSmall,
    color: '#34D399',
    fontWeight: '700',
    fontSize: 10,
  },
  heroHeading: {
    ...typography.titleLarge,
    color: colors.textInverse,
    fontWeight: '800',
    marginBottom: 4,
  },
  heroSub: {
    ...typography.bodySmall,
    color: '#94A3B8',
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  heroMetricsBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  metricItem: {
    flex: 1,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginHorizontal: spacing.sm,
  },
  metricLabel: {
    ...typography.labelSmall,
    color: '#64748B',
    fontSize: 9,
    letterSpacing: 0.6,
  },
  metricValue: {
    ...typography.titleSmall,
    color: colors.textInverse,
    fontWeight: '700',
    marginTop: 2,
  },

  // Section Headers
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm + 2,
    marginBottom: spacing.sm,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.accent,
  },
  cardTitle: {
    ...typography.titleMedium,
    color: colors.primary,
    fontWeight: '700',
  },
  cardDesc: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },

  // Election Card
  electionCard: {
    marginBottom: spacing.md,
  },
  pickerButton: {
    backgroundColor: '#F8FAFC',
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: spacing.md - 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  pickerSelectedContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pickerSelectedTitle: {
    ...typography.titleSmall,
    color: colors.primary,
    fontWeight: '700',
  },
  pickerSelectedSub: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  pickerPlaceholder: {
    ...typography.bodyMedium,
    color: colors.textMuted,
    flex: 1,
  },
  pickerArrow: {
    fontSize: 11,
    color: colors.textMuted,
    marginLeft: spacing.sm,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  warningBanner: {
    marginTop: spacing.sm,
    backgroundColor: '#FFFBEB',
    padding: spacing.sm + 2,
    borderRadius: radius.md,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
    flexDirection: 'row',
    gap: spacing.xs + 2,
    alignItems: 'center',
  },
  warningBannerIcon: {
    fontSize: 16,
  },
  warningBannerText: {
    ...typography.bodySmall,
    color: '#92400E',
    flex: 1,
    lineHeight: 18,
  },

  // Action Grid
  actionGridRow: {
    flexDirection: 'row',
    gap: spacing.sm + 2,
    marginBottom: spacing.md,
  },
  actionTileEmerald: {
    flex: 1,
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#10B981',
    borderRadius: radius.lg,
    padding: spacing.md - 2,
    ...shadows.sm,
  },
  actionTileIndigo: {
    flex: 1,
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#3B82F6',
    borderRadius: radius.lg,
    padding: spacing.md - 2,
    ...shadows.sm,
  },
  actionTileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  actionTileIcon: {
    fontSize: 22,
  },
  pillEmerald: {
    backgroundColor: '#10B981',
    borderRadius: radius.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  pillEmeraldText: {
    ...typography.labelSmall,
    color: colors.textInverse,
    fontWeight: '800',
    fontSize: 10,
  },
  pillIndigo: {
    backgroundColor: '#3B82F6',
    borderRadius: radius.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  pillIndigoText: {
    ...typography.labelSmall,
    color: colors.textInverse,
    fontWeight: '800',
    fontSize: 10,
  },
  actionTileTitle: {
    ...typography.titleSmall,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 14,
    marginTop: 2,
  },
  actionTileSub: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },

  // Queue Card
  queueCard: {
    marginBottom: spacing.md,
  },
  queueHeaderRow: {
    marginBottom: spacing.sm,
  },
  modeSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: radius.md,
    padding: 3,
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
  modeTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.sm,
  },
  modeTabActive: {
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  modeTabText: {
    ...typography.labelMedium,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  modeTabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },

  // Chips Container
  chipsContainer: {
    minHeight: 110,
    backgroundColor: '#F8FAFC',
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: spacing.sm + 2,
    marginBottom: spacing.sm,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
  },
  voterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: radius.full,
    paddingVertical: 5,
    paddingLeft: spacing.sm + 2,
    paddingRight: spacing.sm,
    gap: 6,
    ...shadows.sm,
  },
  voterChipText: {
    ...typography.mono,
    fontSize: 12,
    color: colors.primary,
    fontWeight: '700',
  },
  voterChipRemove: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '700',
    padding: 2,
  },
  emptyChipsBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  emptyChipsIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  emptyChipsText: {
    ...typography.titleSmall,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  emptyChipsSub: {
    ...typography.bodySmall,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 280,
    lineHeight: 18,
  },

  // Text Area
  textAreaContainer: {
    marginBottom: spacing.sm,
  },
  textArea: {
    backgroundColor: '#F8FAFC',
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: spacing.md,
    ...typography.mono,
    color: colors.textPrimary,
    minHeight: 130,
    lineHeight: 20,
  },

  // Queue Footer
  queueFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: 2,
  },
  clearQueueBtn: {
    paddingVertical: 2,
  },
  clearQueueText: {
    ...typography.labelSmall,
    color: colors.danger,
    fontWeight: '700',
  },
  queueSummaryNote: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginLeft: 'auto',
  },
  registerMainBtn: {
    height: 52,
    borderRadius: radius.lg,
  },

  // Results Card
  resultsCard: {
    borderColor: '#3B82F6',
    borderWidth: 1.5,
    marginBottom: spacing.md,
  },
  resultsHeader: {
    marginBottom: spacing.sm,
  },
  resultsSummaryPills: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  successPill: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  successPillText: {
    ...typography.labelSmall,
    color: '#047857',
    fontWeight: '700',
  },
  failPill: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  failPillText: {
    ...typography.labelSmall,
    color: '#B91C1C',
    fontWeight: '700',
  },
  resultsList: {
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  resultItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  resultItemSuccess: {
    backgroundColor: '#F0FDF4',
  },
  resultItemFail: {
    backgroundColor: '#FEF2F2',
  },
  resultStatusCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultStatusCircleSuccess: {
    backgroundColor: '#10B981',
  },
  resultStatusCircleFail: {
    backgroundColor: '#EF4444',
  },
  resultStatusIconText: {
    color: colors.textInverse,
    fontSize: 11,
    fontWeight: '900',
  },
  resultVoterIdText: {
    ...typography.mono,
    fontWeight: '700',
    color: colors.primary,
  },
  resultStatusMsg: {
    ...typography.bodySmall,
    fontSize: 11,
    marginTop: 1,
  },
  resultStatusMsgSuccess: {
    color: '#047857',
  },
  resultStatusMsgFail: {
    color: '#B91C1C',
  },

  // Revocation Card
  revokeCard: {
    marginBottom: spacing.md,
    borderColor: '#FECACA',
    borderWidth: 1.5,
    backgroundColor: '#FEF2F2',
  },

  // Policy Card
  policyCard: {
    marginBottom: spacing.md,
  },
  policyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    marginBottom: spacing.xs,
  },
  policyShield: {
    fontSize: 16,
  },
  policyTitle: {
    ...typography.titleSmall,
    color: colors.primary,
    fontWeight: '700',
  },
  policyText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    padding: spacing.lg,
    maxHeight: '75%',
    ...shadows.lg,
  },
  modalHandle: {
    width: 44,
    height: 4,
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    ...typography.titleLarge,
    color: colors.primary,
    fontWeight: '800',
    textAlign: 'center',
  },
  modalSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 3,
    marginBottom: spacing.md,
  },
  pickerList: {
    maxHeight: 340,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  pickerItemSelected: {
    backgroundColor: '#EFF6FF',
  },
  pickerItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm + 2,
  },
  pickerItemInfo: {
    flex: 1,
  },
  pickerItemTitle: {
    ...typography.titleSmall,
    color: colors.primary,
    fontWeight: '700',
  },
  pickerItemTitleSelected: {
    color: colors.accent,
  },
  pickerItemSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  pickerSeparator: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: spacing.sm,
  },
  emptyText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  modalCloseBtn: {
    marginTop: spacing.md,
    alignSelf: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.xxl,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSubtle,
  },
  modalCloseBtnText: {
    ...typography.titleSmall,
    color: colors.textSecondary,
    fontWeight: '700',
  },

  // Registry Modal
  registryModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  registryModalContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    padding: spacing.lg,
    maxHeight: '85%',
    ...shadows.lg,
  },
  searchBar: {
    backgroundColor: '#F8FAFC',
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    ...typography.bodyMedium,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  selectAllRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    marginBottom: spacing.xs,
  },
  selectAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  checkboxBoxActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  checkmarkIcon: {
    color: colors.textInverse,
    fontSize: 12,
    fontWeight: '900',
  },
  selectAllText: {
    ...typography.labelMedium,
    color: colors.primary,
    fontWeight: '700',
  },
  selectedCountPill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  selectedCountText: {
    ...typography.labelSmall,
    color: colors.accent,
    fontWeight: '800',
  },
  registryList: {
    maxHeight: 320,
  },
  voterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  voterRowSelected: {
    backgroundColor: '#F0FDF4',
  },
  voterRowName: {
    ...typography.titleSmall,
    color: colors.primary,
    fontWeight: '700',
  },
  voterRowSub: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 1,
  },
  modalLoadingBox: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  modalLoadingText: {
    ...typography.bodyMedium,
    color: colors.accent,
    fontWeight: '600',
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
  },
  modalCancelBtnText: {
    ...typography.titleSmall,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  modalApplyBtn: {
    flex: 2,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: colors.accent,
    ...shadows.accent,
  },
  modalApplyBtnText: {
    ...typography.titleSmall,
    color: colors.textInverse,
    fontWeight: '800',
  },
});
