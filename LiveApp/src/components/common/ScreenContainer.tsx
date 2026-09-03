import React, { useMemo } from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { useResponsive } from '../../hooks/useResponsive';
import { colors } from '../../theme';

interface Props extends ViewProps {
  children: React.ReactNode;
  centered?: boolean;
}

export const ScreenContainer = ({ children, centered = true, style, ...props }: Props) => {
  const { contentMaxWidth, horizontalPadding } = useResponsive();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        outer: {
          flex: 1,
          backgroundColor: colors.background,
          alignItems: centered ? 'center' : undefined,
        },
        inner: {
          flex: 1,
          width: '100%',
          maxWidth: contentMaxWidth,
          paddingHorizontal: horizontalPadding,
        },
      }),
    [contentMaxWidth, horizontalPadding, centered]
  );

  return (
    <View style={[styles.outer, style]} {...props}>
      <View style={styles.inner}>{children}</View>
    </View>
  );
};
