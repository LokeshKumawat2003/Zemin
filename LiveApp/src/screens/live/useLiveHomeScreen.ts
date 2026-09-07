import { useCallback, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { creatorApi, liveApi } from '../../api';
import { GiftItem, getGiftEmoji } from '../../components/live/LiveGiftEffects';
import { useResponsive } from '../../hooks/useResponsive';
import { LiveStackParamList } from '../../navigation/types';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { bootstrapAuth } from '../../redux/slices/authSlice';
import { useLivePermissions } from '../../permissions/PermissionsContext';

type StreamMode = 'public' | 'vip';
type StartMode = 'instant' | 'scheduled';

type Navigation = NativeStackNavigationProp<LiveStackParamList, 'LiveHome'>;

const formatScheduledTime = (iso?: string) => {
  if (!iso) return '';
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export const useLiveHomeScreen = (navigation: Navigation) => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(s => s.auth.user);
  const { cardWidth, fs } = useResponsive();
  const vipCardWidth = cardWidth;
  const [liveRooms, setLiveRooms] = useState<any[]>([]);
  const [vipRooms, setVipRooms] = useState<any[]>([]);
  const [streamMode, setStreamMode] = useState<StreamMode>('public');
  const [startMode, setStartMode] = useState<StartMode>('instant');
  const [title, setTitle] = useState('');
  const [selectedGift, setSelectedGift] = useState<GiftItem | null>(null);
  const [scheduledDate, setScheduledDate] = useState(() => {
    const next = new Date();
    next.setHours(next.getHours() + 1, 0, 0, 0);
    return next;
  });
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [joiningGift, setJoiningGift] = useState(false);
  const [selectedJoinRoom, setSelectedJoinRoom] = useState<any | null>(null);
  const { ensureAll } = useLivePermissions(['camera', 'microphone']);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [activeRes, vipRes] = await Promise.all([
        liveApi.getActive().catch(() => ({ data: [] })),
        liveApi.getVipRooms().catch(() => ({ data: [] })),
      ]);
      setLiveRooms(activeRes.data || []);
      setVipRooms(vipRes.data || []);
    } catch {
      setLiveRooms([]);
      setVipRooms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const ensureCreatorAccess = useCallback(async () => {
    if (user?.isCreator) return;
    try {
      await creatorApi.apply({
        displayName: user?.displayName,
        bio: 'New creator on Zemin',
      });
      await dispatch(bootstrapAuth()).unwrap();
    } catch (e: any) {
      const message = e?.error?.message || e?.message || '';
      if (message.toLowerCase().includes('already a creator')) return;
      throw e;
    }
  }, [dispatch, user?.displayName, user?.isCreator]);

  const navigateToHost = useCallback(
    (
      roomId: string,
      streamTitle: string,
      webrtcToken?: string,
      livekitUrl?: string,
      livekitRoom?: string,
      livekitEnabled?: boolean,
    ) => {
      navigation.navigate('LiveHost', {
        roomId,
        title: streamTitle,
        webrtcToken,
        livekitUrl,
        livekitRoom,
        livekitEnabled,
      });
    },
    [navigation],
  );

  const goLive = useCallback(async () => {
    if (!title.trim()) {
      Alert.alert('Title required', 'Enter a stream title');
      return;
    }

    if (streamMode === 'vip') {
      if (!selectedGift) {
        Alert.alert(
          'Gift required',
          'Choose a gift viewers will send to enter your VIP room',
        );
        return;
      }
      if (startMode === 'scheduled' && scheduledDate.getTime() <= Date.now()) {
        Alert.alert('Schedule required', 'Pick a future date and time');
        return;
      }
    }

    setStarting(true);
    try {
      await ensureCreatorAccess();

      const permissionResults = await ensureAll();
      const cameraGranted = permissionResults.camera === 'granted';
      const micGranted = permissionResults.microphone === 'granted';

      if (!cameraGranted || !micGranted) {
        Alert.alert(
          'Permissions required',
          'Camera and microphone access are needed before you can go live.',
        );
        return;
      }

      if (streamMode === 'vip') {
        const createRes = await liveApi.createVip({
          title: title.trim(),
          entryGiftId: selectedGift!.giftId,
          entryFeeCoins: selectedGift!.coinCost,
          startMode,
          scheduledAt:
            startMode === 'scheduled' ? scheduledDate.toISOString() : undefined,
          category: 'vip',
        });
        const { roomId, webrtcToken, livekitUrl, livekitRoom, livekitEnabled } =
          createRes.data;

        if (startMode === 'instant') {
          await liveApi.start(roomId);
          navigateToHost(
            roomId,
            title.trim(),
            webrtcToken,
            livekitUrl,
            livekitRoom,
            livekitEnabled,
          );
        } else {
          Alert.alert(
            'VIP room scheduled',
            `Your VIP room is scheduled for ${formatScheduledTime(
              scheduledDate.toISOString(),
            )}. Start it from here when the time arrives.`,
          );
        }
      } else {
        const createRes = await liveApi.create({
          title: title.trim(),
          category: 'general',
        });
        const { roomId, webrtcToken, livekitUrl, livekitRoom, livekitEnabled } =
          createRes.data;
        await liveApi.start(roomId);
        navigateToHost(
          roomId,
          title.trim(),
          webrtcToken,
          livekitUrl,
          livekitRoom,
          livekitEnabled,
        );
      }

      setTitle('');
      setSelectedGift(null);
      const resetDate = new Date();
      resetDate.setHours(resetDate.getHours() + 1, 0, 0, 0);
      setScheduledDate(resetDate);
      load();
    } catch (e: any) {
      Alert.alert(
        'Error',
        e?.error?.message || e?.message || 'Could not start live stream',
      );
    } finally {
      setStarting(false);
    }
  }, [
    ensureAll,
    ensureCreatorAccess,
    load,
    navigateToHost,
    scheduledDate,
    selectedGift,
    startMode,
    streamMode,
    title,
  ]);

  const startScheduledVip = useCallback(
    async (room: any) => {
      if (!room?.id) return;
      setStarting(true);
      try {
        await ensureCreatorAccess();
        const permissionResults = await ensureAll();
        if (
          permissionResults.camera !== 'granted' ||
          permissionResults.microphone !== 'granted'
        ) {
          Alert.alert(
            'Permissions required',
            'Camera and microphone access are needed.',
          );
          return;
        }
        const startRes = await liveApi.start(String(room.id));
        const {
          roomId,
          webrtcToken,
          livekitUrl,
          livekitRoom,
          livekitEnabled,
          title: streamTitle,
        } = startRes.data;
        navigateToHost(
          String(roomId || room.id),
          streamTitle || room.title,
          webrtcToken,
          livekitUrl,
          livekitRoom,
          livekitEnabled,
        );
        load();
      } catch (e: any) {
        Alert.alert('Error', e?.error?.message || 'Could not start VIP room');
      } finally {
        setStarting(false);
      }
    },
    [ensureAll, ensureCreatorAccess, load, navigateToHost],
  );

  const openVipJoin = useCallback(
    (item: any) => {
      const isMine = String(item.host?.id) === String(user?.id);
      const isLive = item.status === 'live';

      if (isMine && !isLive) {
        startScheduledVip(item);
        return;
      }
      if (!isLive) {
        Alert.alert(
          'Not live yet',
          `Scheduled for ${formatScheduledTime(item.scheduledAt)}`,
        );
        return;
      }
      if (item.isJoinable === false) {
        Alert.alert('Room full', 'This VIP room already has a viewer.');
        return;
      }
      setSelectedJoinRoom(item);
    },
    [startScheduledVip, user?.id],
  );

  const payGiftAndJoin = useCallback(async () => {
    if (!selectedJoinRoom) return;
    setJoiningGift(true);
    try {
      const joinRes = await liveApi.join(String(selectedJoinRoom.id));
      const joinData = joinRes.data;
      const room = selectedJoinRoom;
      setSelectedJoinRoom(null);
      navigation.navigate('LiveViewer', {
        roomId: String(room.id),
        title: room.title,
        hostName: room.host?.displayName || room.host?.username || 'Creator',
        hostId: String(room.host?.id || ''),
        preJoined: true,
        webrtcToken: joinData?.webrtcToken,
        livekitUrl: joinData?.livekitUrl,
        livekitEnabled: joinData?.livekitEnabled,
        viewerCount: joinData?.viewerCount,
      });
    } catch (e: any) {
      Alert.alert('Cannot join', e?.error?.message || 'Gift payment failed');
    } finally {
      setJoiningGift(false);
    }
  }, [navigation, selectedJoinRoom]);

  const myVipRooms = useMemo(() => {
    return vipRooms.filter(room => {
      const ownerId =
        room.host?.id ||
        room.host?._id ||
        room.userId?.id ||
        room.userId?._id ||
        room.userId;
      return Boolean(
        user?.id && ownerId && String(ownerId) === String(user.id),
      );
    });
  }, [user?.id, vipRooms]);

  const joinGiftEmoji = selectedJoinRoom?.entryGift
    ? getGiftEmoji(
        selectedJoinRoom.entryGift.giftId,
        selectedJoinRoom.entryGift.name,
        selectedJoinRoom.entryGift.emoji,
      )
    : '🎁';
  const joinGiftCost =
    selectedJoinRoom?.entryGift?.coinCost ??
    selectedJoinRoom?.entryFeeCoins ??
    0;

  return {
    cardWidth: vipCardWidth,
    userId: user?.id,
    fs,
    liveRooms,
    vipRooms,
    streamMode,
    startMode,
    title,
    selectedGift,
    scheduledDate,
    loading,
    starting,
    joiningGift,
    selectedJoinRoom,
    myVipRooms,
    joinGiftEmoji,
    joinGiftCost,
    setTitle,
    setSelectedGift,
    setScheduledDate,
    setStreamMode,
    setStartMode,
    setSelectedJoinRoom,
    goLive,
    startScheduledVip,
    openVipJoin,
    payGiftAndJoin,
    load,
  };
};
