import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing, radius } from '../theme/colors';

export const Badge = ({ label, variant = 'default', showDot = true }) => {
  const getStyles = () => {
    switch (variant.toUpperCase()) {
      case 'OPEN':
      case 'SUCCESS':
      case 'ELIGIBLE':
      case 'PUBLISHED':
      case 'ACTIVE':
        return {
          bg: '#ECFDF5',
          border: '#A7F3D0',
          text: '#047857',
          dot: '#10B981',
        };
      case 'FROZEN':
      case 'WARNING':
      case 'PENDING':
        return {
          bg: '#FFFBEB',
          border: '#FDE68A',
          text: '#B45309',
          dot: '#F59E0B',
        };
      case 'DRAFT':
        return {
          bg: '#F5F3FF',
          border: '#DDD6FE',
          text: '#6D28D9',
          dot: '#8B5CF6',
        };
      case 'CLOSED':
      case 'DANGER':
      case 'REVOKED':
      case 'INELIGIBLE':
        return {
          bg: '#FEF2F2',
          border: '#FECACA',
          text: '#B91C1C',
          dot: '#EF4444',
        };
      case 'PRIMARY':
      case 'ADMIN':
      case 'TALLIED':
        return {
          bg: '#EFF6FF',
          border: '#BFDBFE',
          text: '#1D4ED8',
          dot: '#3B82F6',
        };
      default:
        return {
          bg: colors.surfaceSubtle,
          border: colors.border,
          text: colors.textSecondary,
          dot: colors.textMuted,
        };
    }
  };

  const styleConfig = getStyles();

  return (
    <View
      style={[
        styles.badgeContainer,
        {
          backgroundColor: styleConfig.bg,
          borderColor: styleConfig.border,
        },
      ]}
    >
      {showDot && (
        <View style={[styles.dot, { backgroundColor: styleConfig.dot }]} />
      )}
      <Text style={[styles.badgeText, { color: styleConfig.text }]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    ...typography.badge,
    fontSize: 10,
    fontWeight: '700',
  },
});
