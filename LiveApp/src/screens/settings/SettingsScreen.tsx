import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, Alert, Image, TouchableOpacity } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { colors, typography, spacing } from '../../theme';
import { uploadApi, userApi } from '../../api';
import { NotificationService } from '../../services/notification.service';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { bootstrapAuth } from '../../redux/slices/authSlice';
import { ProfileStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Settings'>;

export const SettingsScreen = ({ navigation }: Props) => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.section}>Profile</Text>
      <TouchableOpacity style={styles.avatarPicker} onPress={async () => {
        const result = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1 });
        const uri = result.assets?.[0]?.uri;
        if (uri) setAvatarUri(uri);
      }} activeOpacity={0.8}>
        {avatarUri ? <Image source={{ uri: avatarUri }} style={styles.avatar} /> : <Text style={styles.avatarText}>Add photo</Text>}
      </TouchableOpacity>
      <Input label="Display Name" value={displayName} onChangeText={setDisplayName} />
      <Input label="Bio" value={bio} onChangeText={setBio} multiline />

      <Text style={styles.section}>Notifications</Text>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>Push notifications</Text>
        <Switch value={pushNotif} onValueChange={onPushToggle} trackColor={{ true: colors.primary }} />
      </View>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>Live alerts</Text>
        <Switch value={liveAlerts} onValueChange={setLiveAlerts} trackColor={{ true: colors.primary }} />
      </View>

      <Button title="My Subscriptions" variant="outline" onPress={() => navigation.navigate('Subscriptions')} style={styles.btn} />
      <Button title="Save Changes" onPress={save} loading={saving} style={styles.btn} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  section: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.md, marginTop: spacing.md },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLabel: { ...typography.body, color: colors.textPrimary },
  btn: { marginTop: spacing.md },
  avatarPicker: { alignSelf: 'center', width: 112, height: 112, borderRadius: 56, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md, overflow: 'hidden' },
  avatar: { width: '100%', height: '100%' },
  avatarText: { ...typography.caption, color: colors.primary },
});
