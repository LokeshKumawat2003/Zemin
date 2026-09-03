import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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
        menuIcon: { color: colors.text, fontSize: fs(22) },
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
          borderRadius: sp(18),
          paddingHorizontal: sp(8),
          paddingVertical: sp(5),
          marginLeft: sp(6),
        },
        coinPill: { paddingRight: sp(4) },
        pillIcon: { fontSize: fs(13) },
        pillText: { color: colors.text, fontSize: fs(13), fontWeight: '700' },
        addCoinsBtn: {
          backgroundColor: colors.accentPurple,
          width: sp(20),
          height: sp(20),
          borderRadius: sp(10),
          alignItems: 'center',
          justifyContent: 'center',
          marginLeft: sp(4),
        },
        addCoinsBtnText: {
          color: '#fff',
          fontSize: fs(14),
          fontWeight: '700',
          marginTop: -1,
        },
        notifBtn: { position: 'relative', padding: sp(6), marginLeft: sp(6) },
        notifIcon: { fontSize: fs(20) },
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
      <TouchableOpacity onPress={onMenuPress} hitSlop={8}>
        <Text style={styles.menuIcon}>☰</Text>
      </TouchableOpacity>

      <Text style={styles.logo}>Zemin</Text>

      <View style={styles.topBarRight}>
        <View style={styles.pill}>
          <Text style={styles.pillIcon}>💎</Text>
          <Text style={styles.pillText}>{gems}</Text>
        </View>

        <View style={[styles.pill, styles.coinPill]}>
          <Text style={styles.pillIcon}>🪙</Text>
          <Text style={styles.pillText}>{coins.toLocaleString()}</Text>
          <TouchableOpacity style={styles.addCoinsBtn} onPress={onWalletPress}>
            <Text style={styles.addCoinsBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.notifBtn} onPress={onNotificationsPress}>
          <Text style={styles.notifIcon}>🔔</Text>
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
