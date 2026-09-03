import React, { useMemo } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacityProps,
} from 'react-native';
import { colors, typography } from '../../theme';
import { useResponsive } from '../../hooks/useResponsive';

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
  const { fs, sp } = useResponsive();
  const isDisabled = disabled || loading;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        base: {
          height: sp(52),
          borderRadius: sp(14),
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: sp(24),
          minWidth: sp(120),
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
        text: { ...typography.button, fontSize: fs(16), lineHeight: fs(22) },
        primaryText: { color: '#fff' },
        secondaryText: { color: '#fff' },
        outlineText: { color: colors.primary },
        ghostText: { color: colors.textSecondary },
      }),
    [fs, sp]
  );

  return (
    <TouchableOpacity
      style={[styles.base, styles[variant], isDisabled && styles.disabled, style]}
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
