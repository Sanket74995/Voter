import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { colors, typography, spacing, radius, shadows } from '../theme/colors';

export const Button = ({
  title,
  onPress,
  variant = 'primary', // 'primary', 'secondary', 'danger', 'outline', 'success'
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
}) => {
  const getContainerStyle = () => {
    if (disabled) return styles.disabledContainer;
    switch (variant) {
      case 'secondary':
        return styles.secondaryContainer;
      case 'danger':
        return styles.dangerContainer;
      case 'outline':
        return styles.outlineContainer;
      case 'success':
        return styles.successContainer;
      case 'primary':
      default:
        return styles.primaryContainer;
    }
  };

  const getTextStyle = () => {
    if (disabled) return styles.disabledText;
    switch (variant) {
      case 'secondary':
        return styles.secondaryText;
      case 'danger':
        return styles.dangerText;
      case 'outline':
        return styles.outlineText;
      case 'success':
        return styles.successText;
      case 'primary':
      default:
        return styles.primaryText;
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.baseContainer, getContainerStyle(), style]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'outline' ? colors.primary : colors.textInverse}
          size="small"
        />
      ) : (
        <View style={styles.contentRow}>
          {icon && <View style={styles.iconWrapper}>{icon}</View>}
          <Text style={[styles.baseText, getTextStyle(), textStyle]}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  baseContainer: {
    height: 50,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + 2,
  },
  iconWrapper: {
    marginRight: 4,
  },
  baseText: {
    ...typography.titleSmall,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  primaryContainer: {
    backgroundColor: '#2563EB',
    ...shadows.accent,
  },
  primaryText: {
    color: colors.textInverse,
  },
  secondaryContainer: {
    backgroundColor: colors.primary,
    ...shadows.sm,
  },
  secondaryText: {
    color: colors.textInverse,
  },
  successContainer: {
    backgroundColor: '#10B981',
    ...shadows.sm,
  },
  successText: {
    color: colors.textInverse,
  },
  dangerContainer: {
    backgroundColor: '#EF4444',
    ...shadows.sm,
  },
  dangerText: {
    color: colors.textInverse,
  },
  outlineContainer: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.borderDark,
  },
  outlineText: {
    color: colors.textPrimary,
  },
  disabledContainer: {
    backgroundColor: '#E2E8F0',
    borderWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
  },
  disabledText: {
    color: '#94A3B8',
  },
});
