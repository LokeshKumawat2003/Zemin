import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Pressable,
  Image,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '@react-native-vector-icons/material-icons';
import { useSidebar } from '../../contexts/SidebarContext';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { logoutUser } from '../../redux/slices/authSlice';
import { useResponsive } from '../../hooks/useResponsive';

type MenuItem = {
  id: string;
  label: string;
  icon: React.ComponentProps<typeof Icon>['name'];
  onPress: () => void;
  danger?: boolean;
};

export const AppSidebar = () => {
  const { visible, close } = useSidebar();
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const insets = useSafeAreaInsets();
  const { fs, sp, width } = useResponsive();

  const sidebarWidth = Math.min(sp(300), width * 0.82);

  const [mounted, setMounted] = useState(false);
  const slideAnim = useRef(new Animated.Value(-sidebarWidth)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    slideAnim.setValue(-sidebarWidth);
  }, [sidebarWidth, slideAnim]);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 260, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 260, useNativeDriver: true }),
      ]).start();
      return;
    }

    Animated.parallel([
      Animated.timing(slideAnim, { toValue: -sidebarWidth, duration: 220, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) setMounted(false);
    });
  }, [visible, slideAnim, fadeAnim, sidebarWidth]);

  const goTo = (tab: string, screen?: string) => {
    close();
    setTimeout(() => {
      if (screen) {
        navigation.navigate(tab, { screen });
      } else {
        navigation.navigate(tab);
      }
    }, 220);
  };

  const confirmLogout = () => {
    close();
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: () => dispatch(logoutUser()),
      },
    ]);
  };

  const menuItems: MenuItem[] = [
    {
      id: 'profile',
      label: 'My Profile',
      icon: 'person',
      onPress: () => goTo('Profile', 'ProfileMain'),
    },
    {
      id: 'wallet',
      label: 'Wallet & Coins',
      icon: 'account-balance-wallet',
      onPress: () => goTo('Profile', 'Wallet'),
    },
    {
      id: 'gifts',
      label: 'Gift Catalog',
      icon: 'card-giftcard',
      onPress: () => goTo('Profile', 'GiftCatalog'),
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: 'settings',
      onPress: () => goTo('Profile', 'Settings'),
    },
    {
      id: 'logout',
      label: 'Log Out',
      icon: 'logout',
      onPress: confirmLogout,
      danger: true,
    },
  ];

  const styles = useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          ...StyleSheet.absoluteFillObject,
          zIndex: 999,
          elevation: 16,
        },
        backdrop: {
          ...StyleSheet.absoluteFillObject,
          backgroundColor: 'rgba(0,0,0,0.55)',
        },
        panel: {
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          backgroundColor: '#18151c',
          borderRightWidth: 1,
          borderRightColor: '#2a2530',
        },
        header: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          paddingHorizontal: sp(16),
          paddingBottom: sp(8),
        },
        profileRow: {
          flexDirection: 'row',
          alignItems: 'center',
          flex: 1,
          marginRight: sp(8),
        },
        avatar: { width: sp(52), height: sp(52), borderRadius: sp(26) },
        avatarFallback: {
          backgroundColor: '#2a2530',
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 2,
          borderColor: '#ff2f6e',
        },
        avatarText: { color: '#fff', fontSize: fs(22), fontWeight: '800' },
        profileInfo: { marginLeft: sp(12), flex: 1 },
        profileName: { color: '#fff', fontSize: fs(16), fontWeight: '800' },
        profileHandle: { color: '#9b95a3', fontSize: fs(13), marginTop: sp(2) },
        profileCoins: {
          color: '#f5b400',
          fontSize: fs(12),
          fontWeight: '700',
          marginTop: sp(6),
        },
        closeBtn: {
          width: sp(32),
          height: sp(32),
          borderRadius: sp(16),
          backgroundColor: '#211d27',
          alignItems: 'center',
          justifyContent: 'center',
        },
        profileCoinsRow: { flexDirection: 'row', alignItems: 'center', marginTop: sp(6) },
        divider: {
          height: 1,
          backgroundColor: '#2a2530',
          marginHorizontal: sp(16),
          marginVertical: sp(12),
        },
        menu: { flex: 1, paddingHorizontal: sp(8) },
        menuItem: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: sp(14),
          paddingHorizontal: sp(12),
          borderRadius: sp(12),
          marginBottom: sp(4),
        },
        menuIcon: { width: sp(32) },
        menuLabel: { color: '#fff', fontSize: fs(15), fontWeight: '600' },
        menuLabelDanger: { color: '#ff2f6e' },
        footer: { paddingHorizontal: sp(16), paddingTop: sp(8) },
        footerText: { color: '#9b95a3', fontSize: fs(12) },
      }),
    [fs, sp]
  );

  if (!mounted) return null;

  return (
    <View style={styles.overlay} pointerEvents={visible ? 'auto' : 'none'}>
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
      </Animated.View>

      <Animated.View
        style={[
          styles.panel,
          {
            width: sidebarWidth,
            paddingTop: insets.top + sp(12),
            paddingBottom: insets.bottom + sp(12),
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.profileRow}>
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarText}>
                  {(user?.displayName || user?.username || '?').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.profileInfo}>
              <Text style={styles.profileName} numberOfLines={1}>
                {user?.displayName || user?.username || 'Guest'}
              </Text>
              <Text style={styles.profileHandle} numberOfLines={1}>
                @{user?.username || 'user'}
              </Text>
              <View style={styles.profileCoinsRow}>
                <Icon name="monetization-on" size={fs(16)} color="#f5b400" />
                <Text style={styles.profileCoins}>
                  {(user?.coinBalance ?? 0).toLocaleString()} coins
                </Text>
              </View>
            </View>
          </View>
          <TouchableOpacity onPress={close} hitSlop={12} style={styles.closeBtn}>
            <Icon name="close" size={fs(19)} color="#9b95a3" />
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        <View style={styles.menu}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <Icon
                name={item.icon}
                size={fs(22)}
                color={item.danger ? '#ff2f6e' : '#c8c3cf'}
                style={styles.menuIcon}
              />
              <Text style={[styles.menuLabel, item.danger && styles.menuLabelDanger]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Zemin Live</Text>
        </View>
      </Animated.View>
    </View>
  );
};
