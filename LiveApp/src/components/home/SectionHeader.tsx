import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useResponsive } from '../../hooks/useResponsive';
import { homeColors as colors } from './homeTheme';

interface Props {
  title: string;
  linkLabel?: string;
  onLinkPress?: () => void;
}

export const SectionHeader = ({ title, linkLabel, onLinkPress }: Props) => {
  const { fs, sp } = useResponsive();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        sectionHeader: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: sp(16),
          marginBottom: sp(8),
        },
        sectionTitle: { color: colors.text, fontSize: fs(18), fontWeight: '700' },
        sectionLink: { color: colors.primary, fontSize: fs(13), fontWeight: '600' },
      }),
    [fs, sp]
  );

  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {linkLabel && onLinkPress ? (
        <Text style={styles.sectionLink} onPress={onLinkPress}>
          {linkLabel}
        </Text>
      ) : null}
    </View>
  );
};
