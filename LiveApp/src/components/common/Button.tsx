import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacityProps,
} from 'react-native';
import { colors, typography, spacing } from '../../theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost';

interface Props extends TouchableOpacityProps {
  title: string;
  variant?: Variant;
  loading?: boolean;
}

export const Button = ({
  title,
  variant = 'primary',
  loading,
  disabled,
  style,
  ...props
}: Props) => {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[
        styles.base,
        styles[variant],
        isDisabled && styles.disabled,
        style,
      ]}
      disabled={isDisabled}
      activeOpacity={0.8}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? colors.primary : '#fff'} />
      ) : (
        <Text style={[styles.text, styles[`${variant}Text` as keyof typeof styles]]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.secondary },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  ghost: { backgroundColor: 'transparent' },
  disabled: { opacity: 0.5 },
  text: { ...typography.button },
  primaryText: { color: '#fff' },
  secondaryText: { color: '#fff' },
  outlineText: { color: colors.primary },
  ghostText: { color: colors.textSecondary },
});
