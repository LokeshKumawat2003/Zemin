import React, { useRef, useState } from 'react';
import {
  Animated,
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  PanResponder,
  StatusBar,
  StyleSheet,
} from 'react-native';
import Icon from '@react-native-vector-icons/material-icons';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LiveStreamPlayer } from '../../components/live/LiveStreamPlayer';
import { GiftBurstAnimation, GiftPickerModal } from '../../components/live/LiveGiftEffects';
import { LiveStackParamList } from '../../navigation/types';
import { DiscoverStackParamList } from '../../navigation/DiscoverStack';
import { styles } from './LiveViewerScreen.styles';
import { useLiveViewerScreen } from './useLiveViewerScreen';

type Props = NativeStackScreenProps<LiveStackParamList & DiscoverStackParamList, 'LiveViewer'>;

export const LiveViewerScreen = (props: Props) => {
  const [showActions, setShowActions] = useState(true);
  const actionsOpacity = useRef(new Animated.Value(1)).current;
  const { bottom } = useSafeAreaInsets();
  const {
    title,
    hostName,
    hostInitial,
    isCompact,
    messages,
    chatText,
    viewerCount,
    gifts,
    coinBalance,
    giftModalVisible,
    sendingGift,
    giftAnimations,
    streamError,
    streamConnecting,
    livekitUrl,
    webrtcToken,
    livekitEnabled,
    keyboardVisible,
    chatListRef,
    setChatText,
    setGiftModalVisible,
    sendChat,
    sendGift,
    handleStreamConnected,
    handleStreamError,
    removeGiftAnimation,
    formatCount,
  } = useLiveViewerScreen(props);

  const setActionsVisible = (visible: boolean) => {
    setShowActions(visible);
    Animated.timing(actionsOpacity, {
      toValue: visible ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  };

  const swipeResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 18 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > 60) setActionsVisible(false);
        if (gesture.dx < -60) setActionsVisible(true);
      },
    }),
  ).current;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={StyleSheet.absoluteFill} {...swipeResponder.panHandlers}>
        <LiveStreamPlayer
          title={title}
          hostName={hostName}
          viewers={viewerCount}
          livekitUrl={livekitUrl}
          webrtcToken={webrtcToken}
          livekitEnabled={livekitEnabled}
          connecting={streamConnecting}
          error={streamError}
          onConnected={handleStreamConnected}
          onStreamError={handleStreamError}
        />
        <View style={styles.backdrop} />
      </View>

      {giftAnimations.map((anim) => (
        <GiftBurstAnimation
          key={anim.id}
          emoji={anim.emoji}
          label={anim.label}
          onDone={() => removeGiftAnimation(anim.id)}
        />
      ))}

      <Animated.View
        style={[StyleSheet.absoluteFill, { opacity: actionsOpacity }]}
        pointerEvents={showActions ? 'auto' : 'none'}
        {...swipeResponder.panHandlers}
      >
        <View style={styles.topBar}>
          <View style={styles.hostChip}>
            <View style={[styles.hostAvatar, styles.hostAvatarFallback]}>
              <Text style={styles.hostAvatarInitial}>{hostInitial}</Text>
            </View>
            <View style={styles.hostInfo}>
              <Text style={styles.hostName} numberOfLines={1}>
                {title || hostName || 'Live'}
              </Text>
              <Text style={styles.hostStatus}>Live now • {formatCount(viewerCount)} watching</Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <View style={styles.viewerChip}>
              <Text style={styles.viewerIcon}>👁</Text>
              <Text style={styles.viewerText}>{formatCount(viewerCount)}</Text>
            </View>
            <Pressable onPress={() => props.navigation.goBack()} style={styles.closeBtn} hitSlop={8}>
              <Icon name="close" size={20} color="#fff" />
            </Pressable>
          </View>
        </View>

        <KeyboardStickyView
          offset={{ opened: 0, closed: 0 }}
          style={[
            styles.chatSticky,
            isCompact ? styles.chatListCompact : styles.chatListWide,
            keyboardVisible ? styles.chatListKeyboard : styles.chatListNormal,
          ]}
        >
          <FlatList
            ref={chatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            style={styles.chatList}
            contentContainerStyle={styles.chatListContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) =>
            item.type === 'gift' ? (
              <View style={styles.chatRow}>
                <View style={[styles.chatAvatar, item.isMine && styles.chatAvatarMine]} />
                <View style={[styles.chatBubble, styles.giftBubble, item.isMine && styles.chatBubbleMine]}>
                  <Text style={styles.chatUser}>{item.userName}</Text>
                  <Text style={styles.giftChatText}>
                    {item.giftEmoji} sent {item.giftName} · 🪙 {item.coinCost}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.chatRow}>
                <View style={[styles.chatAvatar, item.isMine && styles.chatAvatarMine]} />
                <View style={[styles.chatBubble, item.isMine && styles.chatBubbleMine]}>
                  <Text style={styles.chatUser}>{item.userName}</Text>
                  <Text style={styles.chatText}>{item.text}</Text>
                </View>
              </View>
            )
            }
          />
        </KeyboardStickyView>

        <KeyboardStickyView
          offset={{ opened: 0, closed: 0 }}
          style={[styles.bottomBar, { bottom: Math.max(12, bottom + 8) }]}
        >
          <View style={styles.composerRow}>
            <View style={styles.inputWrap}>
              <Icon name="chat-bubble-outline" size={20} color="rgba(255,255,255,0.7)" />
            <TextInput
                style={styles.input}
                value={chatText}
                onChangeText={setChatText}
                placeholder="Say something..."
                placeholderTextColor="rgba(255,255,255,0.62)"
                onSubmitEditing={sendChat}
                returnKeyType="send"
                blurOnSubmit={false}
              />
              <Pressable onPress={sendChat} style={styles.sendBtn} hitSlop={6}>
                <Icon name="send" size={18} color="#fff" />
              </Pressable>
            </View>
            {!keyboardVisible && showActions && (
              <Pressable style={styles.giftButton} onPress={() => setGiftModalVisible(true)}>
                <Icon name="card-giftcard" size={21} color="#ffbe0b" />
              </Pressable>
            )}
          </View>

          {!keyboardVisible && showActions && (
            <Animated.View style={[styles.quickActions, { opacity: actionsOpacity }]}>
              <View style={styles.coinChip}>
                <Icon name="monetization-on" size={16} color="#f5c518" />
                <Text style={styles.coinChipText}>{coinBalance.toLocaleString()}</Text>
              </View>
            </Animated.View>
          )}
        </KeyboardStickyView>
      </Animated.View>

      <GiftPickerModal
        visible={giftModalVisible}
        gifts={gifts}
        coinBalance={coinBalance}
        sending={sendingGift}
        onClose={() => setGiftModalVisible(false)}
        onSelectGift={sendGift}
      />
    </View>
  );
};

