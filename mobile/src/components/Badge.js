import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../theme/colors';

export const Badge = ({ label, variant = 'default' }) => {
  const getStyles = () => {
    switch (variant.toUpperCase()) {
      case 'OPEN':
      case 'SUCCESS':
      case 'ELIGIBLE':
      case 'PUBLISHED':
        return { bg: colors.successBg, text: colors.success };
      case 'FROZEN':
      case 'WARNING':
      case 'PENDING':
        return { bg: colors.warningBg, text: colors.warning };
      case 'CLOSED':
      case 'DANGER':
      case 'REVOKED':
      case 'INELIGIBLE':
        return { bg: colors.dangerBg, text: colors.danger };
      case 'PRIMARY':
      case 'ADMIN':
        return { bg: '#DBEAFE', text: colors.accent };
      default:
        return { bg: colors.surfaceSubtle, text: colors.textSecondary };
    }
  };

  const styleConfig = getStyles();

  return (
    <View style={[styles.badgeContainer, { backgroundColor: styleConfig.bg }]}>
      <Text style={[styles.badgeText, { color: styleConfig.text }]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badgeContainer: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  badgeText: {
    ...typography.badge,
  },
});
