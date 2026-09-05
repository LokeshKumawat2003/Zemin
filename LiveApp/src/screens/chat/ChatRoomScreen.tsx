
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import Icon from '@react-native-vector-icons/material-icons';
import { launchImageLibrary } from 'react-native-image-picker';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import RNFS from 'react-native-fs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { chatApi, uploadApi } from '../../api';
import { ChatStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<ChatStackParamList, 'ChatRoom'>;
type MessageKind = 'text' | 'image' | 'voice';

interface ChatMessage {
  id: string;
  kind: MessageKind;
  text?: string;
  imageUrl?: string;
  voiceDurationLabel?: string;
  timestampLabel: string;
  isMine: boolean;
  isRead?: boolean;
  likeCount?: number;
  dateLabel?: string;
}

/* ===================================================================== *
 *  Design tokens — one small palette, one spacing scale, one radius set.
 *  Every screen dimension is derived from window width so the whole
 *  screen scales instead of relying on device-specific breakpoints.
 * ===================================================================== */
const palette = {
  bg: '#0c0c10',
  surface: '#17161c',
  line: 'rgba(255,255,255,0.09)',
  accent: '#ff3d68',
  ink: '#ffffff',
  inkSoft: '#a5a2ac',
  inkFaint: '#65626d',
  online: '#33d17a',
};

const radius = { sm: 10, md: 16, lg: 22, pill: 999 };
const space = { xs: 4, sm: 8, md: 14, lg: 20, xl: 28 };

function useScale() {
  const { width } = useWindowDimensions();
  const isWide = width >= 700; // tablets / foldables / desktop-class
  // clamp keeps type & touch targets sane on both a small phone and a big tablet
  const s = Math.min(Math.max(width / 390, 0.94), isWide ? 1.18 : 1.1);
  const railWidth = isWide ? 640 : width; // centered reading column on big screens
  return { width, isWide, s, railWidth };
}

const initials = (name?: string) =>
  (name ?? '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || '?';

const formatTime = (iso?: string) =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';

const dayLabel = (iso?: string) => {
  if (!iso) return '';
  const date = new Date(iso);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return 'Today';
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/* ===================================================================== *
 *  Small building blocks
 * ===================================================================== */
const Avatar = React.memo(function Avatar({
  uri,
  name,
  size,
  online,
}: {
  uri?: string;
  name?: string;
  size: number;
  online?: boolean;
}) {
  return (
    <View style={{ width: size, height: size }}>
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
      ) : (
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: palette.surface,
            borderWidth: 1,
            borderColor: palette.line,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: palette.inkSoft, fontSize: size * 0.36, fontWeight: '700' }}>{initials(name)}</Text>
        </View>
      )}
      {online && (
        <View
          style={{
            position: 'absolute',
            bottom: -1,
            right: -1,
            width: size * 0.3,
            height: size * 0.3,
            borderRadius: size * 0.15,
            backgroundColor: palette.online,
            borderWidth: 2,
            borderColor: palette.bg,
          }}
        />
      )}
    </View>
  );
});

/* ===================================================================== *
 *  Screen
 * ===================================================================== */
export const ChatRoomScreen = ({ route, navigation }: Props) => {
  const { conversationId, recipientName } = route.params;
  const insets = useSafeAreaInsets();
  const { s, isWide, railWidth } = useScale();
  const f = (n: number) => Math.round(n * s);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showNewMessagesBadge, setShowNewMessagesBadge] = useState(false);
  const [composerHeight, setComposerHeight] = useState(f(44));

  const [recipient, setRecipient] = useState<{ avatar?: string; verified: boolean; isOnline: boolean }>({
    verified: false,
    isOnline: false,
  });

  const listRef = useRef<FlatList<ChatMessage>>(null);
  const composerHeightAnim = useRef(new Animated.Value(f(44))).current;
  const previousMessageCountRef = useRef(0);
  const composerMinHeight = f(44);
  const composerMaxHeight = f(112);
  const bottomSafeArea = Math.max(insets.bottom, space.md);
  const listBottomPadding = useMemo(
    () => composerHeight + bottomSafeArea + (Platform.OS === 'android' ? keyboardHeight : 0) + f(14),
    [composerHeight, bottomSafeArea, keyboardHeight]
  );

  const load = useCallback(async () => {
    try {
      const res = await chatApi.getMessages(conversationId);
      const raw = res.data?.messages ?? res.data ?? [];
      let lastDay = '';

      const mapped: ChatMessage[] = raw.map((m: any) => {
        const day = dayLabel(m.sentAt);
        const dateLabel = day !== lastDay ? day : undefined;
        lastDay = day;
        return {
          id: m.id,
          kind: (m.kind ?? (m.imageUrl ? 'image' : m.voiceUrl ? 'voice' : 'text')) as MessageKind,
          text: m.text,
          imageUrl: m.imageUrl,
          voiceDurationLabel: m.voiceDurationLabel,
          timestampLabel: formatTime(m.sentAt),
          isMine: !!m.isMine,
          isRead: !!m.isRead,
          likeCount: m.likeCount,
          dateLabel,
        };
      });

      setMessages(mapped);
      setRecipient({
        avatar: res.data?.participant?.avatarUrl,
        verified: !!res.data?.participant?.verified,
        isOnline: !!res.data?.participant?.isOnline,
      });
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    Animated.timing(composerHeightAnim, {
      toValue: composerHeight,
      duration: 140,
      useNativeDriver: false,
    }).start();
  }, [composerHeight, composerHeightAnim]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event: any) => {
      if (event?.endCoordinates?.height) setKeyboardHeight(event.endCoordinates.height);
      setIsKeyboardVisible(true);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
      setIsKeyboardVisible(false);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (previousMessageCountRef.current > 0 && messages.length > previousMessageCountRef.current && !isAtBottom) {
      setShowNewMessagesBadge(true);
    }
    previousMessageCountRef.current = messages.length;
  }, [isAtBottom, messages.length]);

  useEffect(() => {
    if (!loading && isAtBottom) {
      scrollToEnd(false);
    }
  }, [loading, messages.length, isAtBottom]);

  const scrollToEnd = useCallback((animated = true) => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated }));
  }, []);

  const handleScroll = useCallback((event: any) => {
    const { layoutMeasurement, contentSize, contentOffset } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
    setIsAtBottom(distanceFromBottom <= f(100));
  }, []);

  const jumpToLatest = useCallback(() => {
    setShowNewMessagesBadge(false);
    scrollToEnd(true);
  }, [scrollToEnd]);

  const send = async () => {
    const outgoing = draft.trim();
    if (!outgoing || sending) return;
    setSending(true);
    setDraft('');
    const tempId = `pending-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        kind: 'text',
        text: outgoing,
        timestampLabel: formatTime(new Date().toISOString()),
        isMine: true,
        isRead: false,
      },
    ]);
    scrollToEnd(true);

    try {
      const res = await chatApi.sendMessage(conversationId, outgoing);
      const sent = res.data;
      setMessages((prev) => prev.map((message) => (
        message.id === tempId
          ? {
              ...message,
              id: sent?.id ?? tempId,
              text: sent?.text ?? outgoing,
              timestampLabel: formatTime(sent?.sentAt ?? new Date().toISOString()),
            }
          : message
      )));
    } catch (error: any) {
      setMessages((prev) => prev.filter((message) => message.id !== tempId));
      setDraft(outgoing);
      Alert.alert('Message not sent', error?.error?.message || 'Please try again.');
    } finally {
      setSending(false);
      if (isAtBottom) {
        scrollToEnd(true);
      } else {
        setShowNewMessagesBadge(true);
      }
    }
  };

  const sendImage = async () => {
    if (sending || uploadingImage) return;
    const result = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1, quality: 0.9 });
    const asset = result.assets?.[0];
    if (!asset?.uri) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        type: asset.type || 'image/jpeg',
        name: asset.fileName || 'chat-image.jpg',
      } as any);
      formData.append('folder', 'chat');
      formData.append('type', 'image');
      const upload = await uploadApi.uploadMedia(formData);
      const imageUrl = upload.data?.url;
      if (!imageUrl) throw new Error('Image upload failed');

      const tempId = `pending-image-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: tempId,
          kind: 'image',
          imageUrl,
          timestampLabel: formatTime(new Date().toISOString()),
          isMine: true,
          isRead: false,
        },
      ]);
      scrollToEnd(true);

      const response = await chatApi.sendMessage(conversationId, '', 'image', imageUrl);
      const sent = response.data;
      setMessages((prev) => prev.map((message) => (
        message.id === tempId
          ? { ...message, id: sent?.id ?? tempId, timestampLabel: formatTime(sent?.sentAt) }
          : message
      )));
    } catch (error: any) {
      Alert.alert('Image not sent', error?.error?.message || error?.message || 'Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const downloadSelectedImage = async () => {
    if (!selectedImage) return;
    try {
      const filePath = `${RNFS.CachesDirectoryPath}/zemin-chat-${Date.now()}.jpg`;
      const result = await RNFS.downloadFile({ fromUrl: selectedImage, toFile: filePath }).promise;
      if (result.statusCode && result.statusCode >= 400) throw new Error('Download failed');
      await CameraRoll.save(`file://${filePath}`, { type: 'photo', album: 'Zemin' });
      Alert.alert('Downloaded', 'Image saved to your photo gallery.');
    } catch (error: any) {
      Alert.alert('Download failed', error?.message || 'Could not save the image.');
    }
  };

  const renderItem = useCallback(({ item }: { item: ChatMessage }) => (
    <View style={{ width: '100%', maxWidth: railWidth, alignSelf: 'center' }}>
      {item.dateLabel && (
        <View style={{ alignItems: 'center', marginVertical: space.md }}>
          <Text
            style={{
              color: palette.inkFaint,
              fontSize: f(11),
              fontWeight: '600',
              letterSpacing: 0.3,
              textTransform: 'uppercase',
            }}
          >
            {item.dateLabel}
          </Text>
        </View>
      )}

      <View
        style={{
          flexDirection: 'row',
          justifyContent: item.isMine ? 'flex-end' : 'flex-start',
          alignItems: 'flex-end',
          gap: space.sm,
          marginBottom: space.sm,
        }}
      >
        {!item.isMine && <Avatar uri={recipient.avatar} name={recipientName} size={f(28)} />}

        <View style={{ maxWidth: isWide ? '58%' : '78%', alignItems: item.isMine ? 'flex-end' : 'flex-start' }}>
          {item.kind === 'text' && (
            <View
              style={{
                paddingHorizontal: space.md,
                paddingVertical: space.sm + 2,
                borderRadius: radius.lg,
                borderBottomRightRadius: item.isMine ? radius.sm / 2 : radius.lg,
                borderBottomLeftRadius: item.isMine ? radius.lg : radius.sm / 2,
                backgroundColor: item.isMine ? palette.accent : palette.surface,
                borderWidth: item.isMine ? 0 : 1,
                borderColor: palette.line,
              }}
            >
              <Text style={{ color: palette.ink, fontSize: f(14.5), lineHeight: f(20) }}>{item.text}</Text>
            </View>
          )}

          {item.kind === 'image' && item.imageUrl && (
            <TouchableOpacity activeOpacity={0.85} onPress={() => setSelectedImage(item.imageUrl!)}>
              <Image
                source={{ uri: item.imageUrl }}
                style={{ width: f(210), height: f(150), borderRadius: radius.md }}
              />
            </TouchableOpacity>
          )}

          {item.kind === 'voice' && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: space.sm,
                minWidth: f(180),
                paddingHorizontal: space.md,
                paddingVertical: space.sm,
                borderRadius: radius.pill,
                backgroundColor: item.isMine ? palette.accent : palette.surface,
                borderWidth: item.isMine ? 0 : 1,
                borderColor: palette.line,
              }}
            >
              <View
                style={{
                  width: f(26),
                  height: f(26),
                  borderRadius: f(13),
                  backgroundColor: 'rgba(255,255,255,0.22)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: palette.ink, fontSize: f(10) }}>▶</Text>
              </View>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                {Array.from({ length: 18 }).map((_, i) => (
                  <View
                    key={i}
                    style={{
                      width: 2,
                      borderRadius: 1,
                      height: 3 + ((i * 5) % 14),
                      backgroundColor: 'rgba(255,255,255,0.5)',
                    }}
                  />
                ))}
              </View>
              <Text style={{ color: palette.ink, fontSize: f(11) }}>{item.voiceDurationLabel ?? '0:00'}</Text>
            </View>
          )}

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, paddingHorizontal: 2 }}>
            <Text style={{ color: palette.inkFaint, fontSize: f(10.5) }}>{item.timestampLabel}</Text>
            {item.isMine && (
              <Text style={{ color: item.isRead ? palette.accent : palette.inkFaint, fontSize: f(10.5) }}>
                {item.isRead ? '✓✓' : '✓'}
              </Text>
            )}
            {!!item.likeCount && (
              <Text style={{ color: palette.inkFaint, fontSize: f(10.5) }}>· ♥ {item.likeCount}</Text>
            )}
          </View>
        </View>
      </View>
    </View>
  ), [f, isWide, railWidth, recipient.avatar, recipientName]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
        enabled
      >
        <View style={{ flex: 1, backgroundColor: palette.bg }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: space.md,
              paddingVertical: space.sm,
              borderBottomWidth: 1,
              borderBottomColor: palette.line,
              backgroundColor: palette.surface,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10} style={{ marginRight: space.sm, padding: space.xs }}>
                <Icon name="arrow-back" size={f(24)} color={palette.ink} />
              </TouchableOpacity>

              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Avatar uri={recipient.avatar} name={recipientName} size={f(38)} online={recipient.isOnline} />
                <View style={{ marginLeft: space.sm, flex: 1 }}>
                  <Text style={{ color: palette.ink, fontSize: f(15), fontWeight: '700' }} numberOfLines={1}>
                    {recipientName}
                  </Text>
                  <Text style={{ color: recipient.isOnline ? palette.online : palette.inkFaint, fontSize: f(11), marginTop: 1 }}>
                    {recipient.isOnline ? 'online' : 'offline'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <TouchableOpacity hitSlop={10} style={{ padding: space.xs }}>
                <Icon name="more-vert" size={f(22)} color={palette.inkSoft} />
              </TouchableOpacity>
            </View>
          </View>

          {loading ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator color={palette.accent} />
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              <FlatList
                ref={listRef}
                data={messages}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={{
                  paddingHorizontal: space.md,
                  paddingVertical: space.md,
                  flexGrow: 1,
                  paddingBottom: listBottomPadding,
                }}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
                onScroll={handleScroll}
                scrollEventThrottle={80}
                onContentSizeChange={() => {
                  if (isAtBottom) {
                    scrollToEnd(false);
                  }
                }}
                onLayout={() => {
                  if (isAtBottom) {
                    scrollToEnd(false);
                  }
                }}
                ListEmptyComponent={
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: palette.inkFaint, fontSize: f(14) }}>Say hi to {recipientName} 👋</Text>
                  </View>
                }
              />

              {showNewMessagesBadge && !isAtBottom && (
                <TouchableOpacity
                  onPress={jumpToLatest}
                  activeOpacity={0.9}
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: listBottomPadding + f(8),
                    alignSelf: 'center',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 'auto',
                    paddingHorizontal: space.md,
                    paddingVertical: space.sm,
                    borderRadius: radius.pill,
                    backgroundColor: palette.surface,
                    borderWidth: 1,
                    borderColor: palette.line,
                    shadowColor: '#000',
                    shadowOpacity: 0.18,
                    shadowRadius: 10,
                    shadowOffset: { width: 0, height: 3 },
                  }}
                >
                  <Text style={{ color: palette.ink, fontSize: f(12), fontWeight: '600' }}>New messages ↓</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <View
            style={{
              width: '100%',
              maxWidth: railWidth,
              alignSelf: 'center',
              flexDirection: 'row',
              alignItems: 'flex-end',
              gap: space.sm,
              paddingHorizontal: space.md,
              paddingTop: space.sm,
              paddingBottom: bottomSafeArea + (Platform.OS === 'android' ? keyboardHeight : 0),
              borderTopWidth: 1,
              borderTopColor: palette.line,
              backgroundColor: palette.bg,
            }}
          >
            <TouchableOpacity hitSlop={8} style={{ paddingBottom: space.sm }} onPress={sendImage} disabled={uploadingImage || sending}>
              {uploadingImage ? (
                <ActivityIndicator size="small" color={palette.inkSoft} />
              ) : (
                <Icon name="add-circle-outline" size={f(22)} color={palette.inkSoft} />
              )}
            </TouchableOpacity>

            <Animated.View
              style={{
                flex: 1,
                minHeight: composerMinHeight,
                maxHeight: composerMaxHeight,
                height: composerHeightAnim,
                justifyContent: 'center',
                backgroundColor: palette.surface,
                borderRadius: radius.pill,
                borderWidth: 1,
                borderColor: palette.line,
                paddingHorizontal: space.md,
              }}
            >
              <TextInput
                value={draft}
                onChangeText={setDraft}
                onContentSizeChange={(event) => {
                  const nextHeight = clamp(event.nativeEvent.contentSize.height + f(12), composerMinHeight, composerMaxHeight);
                  setComposerHeight(nextHeight);
                }}
                placeholder="Message..."
                placeholderTextColor={palette.inkFaint}
                multiline
                style={{
                  color: palette.ink,
                  fontSize: f(14.5),
                  lineHeight: f(20),
                  paddingVertical: f(8),
                  maxHeight: composerMaxHeight - f(12),
                  textAlignVertical: 'top',
                }}
              />
            </Animated.View>

            {draft.trim().length > 0 ? (
              <TouchableOpacity
                onPress={send}
                disabled={sending}
                style={{
                  width: f(42),
                  height: f(42),
                  borderRadius: f(21),
                  backgroundColor: palette.accent,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {sending ? <ActivityIndicator size="small" color="#fff" /> : <Icon name="send" size={f(18)} color="#fff" />}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                hitSlop={8}
                style={{
                  width: f(42),
                  height: f(42),
                  borderRadius: f(21),
                  backgroundColor: palette.surface,
                  borderWidth: 1,
                  borderColor: palette.line,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="mic" size={f(18)} color={palette.inkSoft} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={!!selectedImage}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.96)', justifyContent: 'center' }}>
          <TouchableOpacity
            onPress={() => setSelectedImage(null)}
            style={{ position: 'absolute', top: insets.top + space.md, right: space.md, zIndex: 2, padding: space.sm }}
          >
            <Icon name="close" size={f(28)} color={palette.ink} />
          </TouchableOpacity>

          {selectedImage ? (
            <Image
              source={{ uri: selectedImage }}
              resizeMode="contain"
              style={{ width: '100%', height: '70%' }}
            />
          ) : null}

          <TouchableOpacity
            onPress={downloadSelectedImage}
            style={{
              alignSelf: 'center',
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.sm,
              marginTop: space.lg,
              paddingHorizontal: space.lg,
              paddingVertical: space.md,
              borderRadius: radius.pill,
              backgroundColor: palette.accent,
            }}
          >
            <Icon name="download" size={f(20)} color={palette.ink} />
            <Text style={{ color: palette.ink, fontSize: f(14), fontWeight: '700' }}>Download image</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
};