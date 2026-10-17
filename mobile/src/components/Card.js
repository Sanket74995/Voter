import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, radius, shadows } from '../theme/colors';

export const Card = ({ children, style, onPress, variant = 'default' }) => {
  const getVariantStyle = () => {
    switch (variant) {
      case 'elevated':
        return styles.cardElevated;
      case 'glass':
        return styles.cardGlass;
      case 'accent':
        return styles.cardAccent;
      case 'subtle':
        return styles.cardSubtle;
      default:
        return styles.cardDefault;
    }
  };

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={onPress}
        style={[styles.base, getVariantStyle(), style]}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={[styles.base, getVariantStyle(), style]}>{children}</View>;
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    padding: spacing.md + 2,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  cardDefault: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.sm,
  },
  cardElevated: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.md,
  },
  cardGlass: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1.5,
    borderColor: 'rgba(226, 232, 240, 0.8)',
    ...shadows.md,
  },
  cardAccent: {
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    backgroundColor: '#FAFCFF',
    ...shadows.sm,
  },
  cardSubtle: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
});
