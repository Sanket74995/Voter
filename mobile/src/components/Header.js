import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, typography, spacing } from '../theme/colors';

export const Header = ({ title, subtitle, showBack = false, onBack, rightAction }) => {
  return (
    <View style={styles.headerContainer}>
      <View style={styles.leftRow}>
        {showBack && (
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
        )}
        <View style={styles.titleContainer}>
          <Text style={styles.titleText}>{title}</Text>
          {subtitle ? <Text style={styles.subtitleText}>{subtitle}</Text> : null}
        </View>
      </View>
      {rightAction && <View style={styles.rightAction}>{rightAction}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    paddingRight: spacing.md,
    paddingVertical: spacing.xs,
  },
  backIcon: {
    fontSize: 22,
    color: colors.primary,
    fontWeight: 'bold',
  },
  titleContainer: {
    flex: 1,
  },
  titleText: {
    ...typography.titleMedium,
    color: colors.primary,
  },
  subtitleText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  rightAction: {
    marginLeft: spacing.sm,
  },
});
