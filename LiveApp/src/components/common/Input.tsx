import React, { useMemo } from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps } from 'react-native';
import { colors, typography } from '../../theme';
import { useResponsive } from '../../hooks/useResponsive';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
}

export const Input = ({ label, error, style, ...props }: Props) => {
  const { fs, sp } = useResponsive();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { marginBottom: sp(16) },
        label: {
          ...typography.bodySmall,
          fontSize: fs(14),
          lineHeight: fs(20),
          color: colors.textSecondary,
          marginBottom: sp(8),
        },
        input: {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: sp(12),
          paddingHorizontal: sp(16),
          paddingVertical: sp(14),
          color: colors.textPrimary,
          ...typography.body,
          fontSize: fs(16),
          lineHeight: fs(22),
        },
        inputError: { borderColor: colors.error },
        error: {
          ...typography.caption,
          fontSize: fs(12),
          color: colors.error,
          marginTop: sp(4),
        },
      }),
    [fs, sp]
  );

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        style={[styles.input, error && styles.inputError, style]}
        placeholderTextColor={colors.textDisabled}
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
};
