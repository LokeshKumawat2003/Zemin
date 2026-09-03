import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useResponsive } from '../../hooks/useResponsive';
import { homeColors as colors, CategoryTab, CATEGORY_TABS } from './homeTheme';

interface Props {
  activeTab: CategoryTab;
  onTabPress: (tab: CategoryTab) => void;
}

export const HomeCategoryTabs = ({ activeTab, onTabPress }: Props) => {
  const { fs, sp } = useResponsive();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        tabs: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: sp(16),
          paddingHorizontal: sp(16),
          marginBottom: sp(8),
        },
        tab: {
          color: colors.textSecondary,
          paddingBottom: sp(8),
          fontSize: fs(14),
        },
        tabActive: {
          color: colors.primary,
          fontWeight: '700',
          borderBottomWidth: 2,
          borderBottomColor: colors.primary,
        },
      }),
    [fs, sp]
  );

  return (
    <View style={styles.tabs}>
      {CATEGORY_TABS.map((t) => (
        <Text
          key={t.key}
          style={[styles.tab, activeTab === t.key && styles.tabActive]}
          onPress={() => onTabPress(t.key)}
        >
          {t.label}
        </Text>
      ))}
    </View>
  );
};
