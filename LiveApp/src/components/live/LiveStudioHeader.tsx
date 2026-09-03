import React from 'react';
import { Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/material-icons';
import { colors } from '../../theme';
import { useResponsive } from '../../hooks/useResponsive';

interface Props {
  roomCount: number;
}

export const LiveStudioHeader = ({ roomCount }: Props) => {
  const { fs, sp } = useResponsive();

  return <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: sp(24) }}>
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: sp(7) }}>
        <View style={{ width: sp(8), height: sp(8), borderRadius: sp(4), backgroundColor: colors.primary }} />
        <Text style={{ color: colors.primary, fontSize: fs(11), fontWeight: '800', letterSpacing: 1.4 }}>CREATOR STUDIO</Text>
      </View>
      <Text style={{ color: colors.textPrimary, fontSize: fs(36), fontWeight: '900', marginTop: sp(4) }}>Live room</Text>
      <Text style={{ color: colors.textSecondary, fontSize: fs(13), marginTop: sp(3) }}>Build your audience in real time.</Text>
    </View>
    <View style={{ alignItems: 'center', justifyContent: 'center', width: sp(58), height: sp(58), borderRadius: sp(29), backgroundColor: 'rgba(255,47,110,0.12)', borderWidth: 1, borderColor: 'rgba(255,47,110,0.32)' }}>
      <Icon name="live-tv" size={fs(25)} color={colors.primary} />
      <Text style={{ color: colors.textPrimary, fontSize: fs(10), fontWeight: '800', marginTop: sp(2) }}>{} rooms</Text>
    </View>
  </View>;
};
