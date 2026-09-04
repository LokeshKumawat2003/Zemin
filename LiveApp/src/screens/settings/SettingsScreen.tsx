import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, Alert, Image, TouchableOpacity } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import Icon from '@react-native-vector-icons/material-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { colors, typography, spacing } from '../../theme';
import { uploadApi, userApi } from '../../api';
import { NotificationService } from '../../services/notification.service';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { bootstrapAuth } from '../../redux/slices/authSlice';
import { ProfileStackParamList } from '../../navigation/types';
import { useResponsive } from '../../hooks/useResponsive';
import { ScreenContainer } from '../../components/common/ScreenContainer';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Settings'>;

export const SettingsScreen = (_props: Props) => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const { fs, sp } = useResponsive();
  const insets = useSafeAreaInsets();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarUri, setAvatarUri] = useState(user?.avatar);
  const [pushNotif, setPushNotif] = useState(true);
  const [liveAlerts, setLiveAlerts] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await userApi.getSettings();
        setPushNotif(res.data?.notifications?.push ?? true);
        setLiveAlerts(res.data?.notifications?.liveAlerts ?? true);
      } catch {
        // ignore
      }
    })();
  }, []);

  const onPushToggle = async (value: boolean) => {
    if (value) {
      const granted = await NotificationService.ensurePushPermission();
      if (!granted) {
        Alert.alert(
          'Permission required',
          'Enable notifications in your device settings to receive push alerts.'
        );
        return;
      }
      await NotificationService.syncStoredPushToken();
    }
    setPushNotif(value);
  };

  const save = async () => {
    setSaving(true);
    try {
      let avatar = user?.avatar;
      if (avatarUri && avatarUri !== user?.avatar) {
        const formData = new FormData();
        formData.append('file', { uri: avatarUri, type: 'image/jpeg', name: 'avatar.jpg' } as any);
        formData.append('folder', 'avatars');
        const upload = await uploadApi.uploadMedia(formData);
        avatar = upload.data?.url;
      }
      await userApi.updateProfile({ displayName, bio, avatar });
      await userApi.updateSettings({
        notifications: { push: pushNotif, liveAlerts: liveAlerts },
      });
      dispatch(bootstrapAuth());
      Alert.alert('Saved', 'Settings updated successfully');
    } catch (e: any) {
      Alert.alert('Error', e?.error?.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer centered={false} style={styles.container}>
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + sp(32) }]}
    >
      <View style={styles.pageHeader}>
        <View style={styles.headerIcon}><Icon name="manage-accounts" size={fs(25)} color={colors.primary} /></View>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>Account</Text>
          <Text style={styles.title}>Edit profile</Text>
          <Text style={styles.subtitle}>Keep your Zemin profile fresh and personal.</Text>
        </View>
      </View>

      <View style={styles.profileCard}>
        <Text style={styles.section}>Profile photo</Text>
      <TouchableOpacity style={[styles.avatarPicker, { width: sp(118), height: sp(118), borderRadius: sp(59) }]} onPress={async () => {
        const result = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1 });
        const uri = result.assets?.[0]?.uri;
        if (uri) setAvatarUri(uri);
      }} activeOpacity={0.8}>
        {avatarUri ? <Image source={{ uri: avatarUri }} style={styles.avatar} /> : <Icon name="person" size={fs(42)} color={colors.textSecondary} />}
        <View style={styles.avatarEditBadge}><Icon name="photo-camera" size={fs(17)} color="#fff" /></View>
      </TouchableOpacity>
      <Input label="Display Name" value={displayName} onChangeText={setDisplayName} />
      <Input label="Bio" value={bio} onChangeText={setBio} multiline />
      </View>

      <View style={styles.settingsCard}>
      <Text style={styles.section}>Notifications</Text>
      <View style={styles.row}>
        <View style={styles.rowIcon}><Icon name="notifications-none" size={fs(22)} color={colors.primary} /></View>
        <View style={styles.rowText}><Text style={styles.rowLabel}>Push notifications</Text><Text style={styles.rowHint}>Updates and messages from Zemin</Text></View>
        <Switch value={pushNotif} onValueChange={onPushToggle} trackColor={{ true: colors.primary }} />
      </View>
      <View style={styles.row}>
        <View style={styles.rowIcon}><Icon name="sensors" size={fs(22)} color={colors.primary} /></View>
        <View style={styles.rowText}><Text style={styles.rowLabel}>Live alerts</Text><Text style={styles.rowHint}>Know when creators go live</Text></View>
        <Switch value={liveAlerts} onValueChange={setLiveAlerts} trackColor={{ true: colors.primary }} />
      </View>
      </View>

      <Button title="Save Changes" onPress={save} loading={saving} style={styles.saveBtn} />
    </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingTop: spacing.md, paddingBottom: spacing.xl },
  pageHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 20, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  headerIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,47,110,0.14)', alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
  headerText: { flex: 1 },
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  title: { color: colors.textPrimary, fontSize: 24, fontWeight: '800', marginTop: 2 },
  subtitle: { color: colors.textSecondary, fontSize: 12, lineHeight: 17, marginTop: 3 },
  profileCard: { backgroundColor: colors.surface, borderRadius: 20, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  settingsCard: { backgroundColor: colors.surface, borderRadius: 20, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm },
  section: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.md, marginTop: spacing.md },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLabel: { ...typography.body, color: colors.textPrimary, fontWeight: '700' },
  rowHint: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
  rowIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,47,110,0.12)', alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
  rowText: { flex: 1 },
  btn: { marginTop: spacing.md },
  saveBtn: { marginTop: spacing.sm, marginBottom: spacing.sm },
  avatarPicker: { alignSelf: 'center', width: 112, height: 112, borderRadius: 56, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md, overflow: 'hidden' },
  avatar: { width: '100%', height: '100%' },
  avatarEditBadge: { position: 'absolute', right: 0, bottom: 0, width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.surface },
});
