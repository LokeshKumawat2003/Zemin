import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Pressable,
  Image,
  Dimensions,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSidebar } from '../../contexts/SidebarContext';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { logoutUser } from '../../redux/slices/authSlice';

const SIDEBAR_WIDTH = Math.min(300, Dimensions.get('window').width * 0.82);

type MenuItem = {
  id: string;
  label: string;
  icon: string;
  onPress: () => void;
  danger?: boolean;
};

export const AppSidebar = () => {
  const { visible, close } = useSidebar();
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const insets = useSafeAreaInsets();

  const [mounted, setMounted] = useState(false);
  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

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
      Animated.timing(slideAnim, { toValue: -SIDEBAR_WIDTH, duration: 220, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) setMounted(false);
    });
  }, [visible, slideAnim, fadeAnim]);

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
      icon: '👤',
      onPress: () => goTo('Profile', 'ProfileMain'),
    },
    {
      id: 'wallet',
      label: 'Wallet & Coins',
      icon: '🪙',
      onPress: () => goTo('Profile', 'Wallet'),
    },
    {
      id: 'gifts',
      label: 'Gift Catalog',
      icon: '🎁',
      onPress: () => goTo('Profile', 'GiftCatalog'),
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: '⚙️',
      onPress: () => goTo('Profile', 'Settings'),
    },
    {
      id: 'logout',
      label: 'Log Out',
      icon: '🚪',
      onPress: confirmLogout,
      danger: true,
    },
  ];

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
            width: SIDEBAR_WIDTH,
            paddingTop: insets.top + 12,
            paddingBottom: insets.bottom + 12,
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
              <Text style={styles.profileCoins}>
                🪙 {(user?.coinBalance ?? 0).toLocaleString()} coins
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={close} hitSlop={12} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
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
              <Text style={styles.menuIcon}>{item.icon}</Text>
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

const styles = StyleSheet.create({
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
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  profileRow: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarFallback: {
    backgroundColor: '#2a2530',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ff2f6e',
  },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: '800' },
  profileInfo: { marginLeft: 12, flex: 1 },
  profileName: { color: '#fff', fontSize: 16, fontWeight: '800' },
  profileHandle: { color: '#9b95a3', fontSize: 13, marginTop: 2 },
  profileCoins: { color: '#f5b400', fontSize: 12, fontWeight: '700', marginTop: 6 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#211d27',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: { color: '#9b95a3', fontSize: 16, fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#2a2530', marginHorizontal: 16, marginVertical: 12 },
  menu: { flex: 1, paddingHorizontal: 8 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  menuIcon: { fontSize: 20, width: 32 },
  menuLabel: { color: '#fff', fontSize: 15, fontWeight: '600' },
  menuLabelDanger: { color: '#ff2f6e' },
  footer: { paddingHorizontal: 16, paddingTop: 8 },
  footerText: { color: '#9b95a3', fontSize: 12 },
});
