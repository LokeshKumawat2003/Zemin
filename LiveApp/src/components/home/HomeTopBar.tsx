import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from '@react-native-vector-icons/material-icons';
import { useResponsive } from '../../hooks/useResponsive';
import { homeColors as colors } from './homeTheme';

interface Props {
  gems: number;
  coins: number;
  unreadNotifications: number;
  onMenuPress: () => void;
  onWalletPress: () => void;
  onNotificationsPress: () => void;
}

export const HomeTopBar = ({
  gems,
  coins,
  unreadNotifications,
  onMenuPress,
  onWalletPress,
  onNotificationsPress,
}: Props) => {
  const { fs, sp } = useResponsive();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        topBar: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: sp(24),
          paddingHorizontal: sp(16),
          paddingBottom: sp(6),
        },
        menuButton: { padding: sp(4) },
        logo: {
          fontSize: fs(24),
          fontWeight: '800',
          color: colors.primary,
          fontStyle: 'italic',
        },
        topBarRight: { flexDirection: 'row', alignItems: 'center', marginLeft: sp(8) },
        pill: {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: sp(18),
          paddingHorizontal: sp(8),
          paddingVertical: sp(5),
          marginLeft: sp(6),
        },
        coinPill: { paddingRight: sp(4) },
        pillIcon: { marginRight: sp(5) },
        pillText: { color: colors.text, fontSize: fs(13), fontWeight: '700' },
        addCoinsBtn: {
          backgroundColor: colors.primary,
          width: sp(24),
          height: sp(24),
          borderRadius: sp(12),
          alignItems: 'center',
          justifyContent: 'center',
          marginLeft: sp(4),
        },
        notifBtn: { position: 'relative', padding: sp(6), marginLeft: sp(6) },
        badge: {
          position: 'absolute',
          top: sp(2),
          right: sp(2),
          backgroundColor: colors.primary,
          borderRadius: sp(8),
          minWidth: sp(16),
          height: sp(16),
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: sp(2),
        },
        badgeText: { color: '#fff', fontSize: fs(9), fontWeight: '700' },
      }),
    [fs, sp]
  );

  return (
    <View style={styles.topBar}>
      <TouchableOpacity style={styles.menuButton} onPress={onMenuPress} hitSlop={8}>
        <Icon name="menu" size={fs(28)} color={colors.text} />
      </TouchableOpacity>

      <Text style={styles.logo}>Zemin</Text>

      <View style={styles.topBarRight}>
        <View style={styles.pill}>
          <Icon name="diamond" size={fs(18)} color="#9edcff" style={styles.pillIcon} />
          <Text style={styles.pillText}>{gems}</Text>
        </View>

        <View style={[styles.pill, styles.coinPill]}>
          <Icon name="monetization-on" size={fs(19)} color="#ffd23f" style={styles.pillIcon} />
          <Text style={styles.pillText}>{coins.toLocaleString()}</Text>
          <TouchableOpacity style={styles.addCoinsBtn} onPress={onWalletPress}>
            <Icon name="add" size={fs(20)} color="#fff" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.notifBtn} onPress={onNotificationsPress}>
          <Icon name="notifications-none" size={fs(28)} color={colors.text} />
          {unreadNotifications > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export const HOME_TOP_BAR_HEIGHT = 92;
