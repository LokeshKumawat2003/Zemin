import React from 'react';
import { ActivityIndicator, Text, View, ViewStyle } from 'react-native';
import { colors } from '../../theme';
import { useResponsive } from '../../hooks/useResponsive';

interface Props {
  title: string;
  countLabel: string;
  loading: boolean;
  emptyTitle: string;
  emptySubtitle: string;
  isEmpty?: boolean;
  children?: React.ReactNode;
  style?: ViewStyle;
}

export const LiveRoomSection = ({
  title,
  countLabel,
  loading,
  emptyTitle,
  emptySubtitle,
  isEmpty = false,
  children,
  style,
}: Props) => (
  <LiveRoomSectionContent
    title={title}
    countLabel={countLabel}
    loading={loading}
    emptyTitle={emptyTitle}
    emptySubtitle={emptySubtitle}
    isEmpty={isEmpty}
    style={style}
  >
    {children}
  </LiveRoomSectionContent>
);

const LiveRoomSectionContent = ({ title, countLabel, loading, emptyTitle, emptySubtitle, isEmpty = false, children, style }: Props) => {
  const { fs, sp } = useResponsive();

  return <View style={style}>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: sp(14) }}>
      <View>
        <Text style={{ color: colors.textPrimary, fontSize: fs(20), fontWeight: '800' }}>{title}</Text>
        <View style={{ width: sp(28), height: sp(3), borderRadius: sp(2), backgroundColor: colors.primary, marginTop: sp(6) }} />
      </View>
      <Text style={{ color: colors.textSecondary, fontSize: fs(12), fontWeight: '700' }}>{countLabel}</Text>
    </View>
    {loading ? (
      <View style={{ backgroundColor: colors.surface, borderRadius: sp(20), paddingVertical: sp(36), alignItems: 'center', borderWidth: 1, borderColor: colors.border }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    ) : !isEmpty ? (
      children
    ) : (
      <View style={{ backgroundColor: colors.surface, borderRadius: sp(20), padding: sp(28), alignItems: 'center', borderWidth: 1, borderColor: colors.border }}>
        <Text style={{ color: colors.textPrimary, fontSize: fs(16), fontWeight: '700' }}>{emptyTitle}</Text>
        <Text style={{ color: colors.textSecondary, fontSize: fs(13), textAlign: 'center', marginTop: sp(6) }}>{emptySubtitle}</Text>
      </View>
    )}
  </View>
};
