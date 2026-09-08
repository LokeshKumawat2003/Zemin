import React, { useRef, useState } from 'react';
import {
  Animated,
  View,
  Text,
  Image,
  TextInput,
  Pressable,
  FlatList,
  PanResponder,
  StatusBar,
  StyleSheet,
} from 'react-native';
import Icon from '@react-native-vector-icons/material-icons';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CameraType } from 'react-native-camera-kit';
import { LiveCameraPreview } from '../../components/live/LiveCameraPreview';
import { LiveKitHostVideo } from '../../components/live/LiveKitHostVideo';
import { GiftBurstAnimation } from '../../components/live/LiveGiftEffects';
import { GiftEntryPicker } from '../../components/live/GiftEntryPicker';
import { FloatingHeart } from '../../components/live/FloatingHeart';
import { LiveStackParamList } from '../../navigation/types';
import { styles } from './LiveHostScreen.styles';
import { useLiveHostScreen } from './useLiveHostScreen';

type Props = NativeStackScreenProps<LiveStackParamList, 'LiveHost'>;

export const LiveHostScreen = (props: Props) => {
  const [showControls, setShowControls] = useState(true);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const controlsOpacity = useRef(new Animated.Value(1)).current;
  const {
    title,
    webrtcToken,
    livekitUrl,
    livekitEnabled,
    isCompact,
    chatMaxHeight,
    hostAvatarUri,
    hostInitial,
    viewers,
    ending,
    elapsed,
    commentText,
    keyboardVisible,
    messages,
    hearts,
    giftAnimations,
    giftCoinsEarned,
    isMuted,
    isCameraFront,
    listRef,
    confirmEndStream,
    setCommentText,
    setIsCameraFront,
    sendComment,
    removeHeart,
    removeGiftAnimation,
    formatDuration,
    formatCount,
    toggleMute,
    toggleCamera,
    openCommentMenuId,
    setOpenCommentMenuId,
    moderateUser,
    entryGift,
    setEntryGift,
    showPrivatePicker,
    setShowPrivatePicker,
    convertingPrivate,
    convertToPrivate,
  } = useLiveHostScreen(props);

  const setControlsVisible = (visible: boolean) => {
    setShowControls(visible);
    Animated.timing(controlsOpacity, {
      toValue: visible ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  };

  const swipeResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 18 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > 60) setControlsVisible(false);
        if (gesture.dx < -60) setControlsVisible(true);
      },
    }),
  ).current;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={StyleSheet.absoluteFill} {...swipeResponder.panHandlers}>
        <LiveKitHostVideo
          livekitUrl={livekitUrl}
          webrtcToken={webrtcToken}
          livekitEnabled={livekitEnabled}
          isMuted={isMuted}
          showFlip={false}
          cameraType={isCameraFront ? CameraType.Front : CameraType.Back}
          onCameraTypeChange={(type) => setIsCameraFront(type === CameraType.Front)}
          fallback={
            <LiveCameraPreview
              showFlip
              cameraType={isCameraFront ? CameraType.Front : CameraType.Back}
              onCameraTypeChange={(type) => setIsCameraFront(type === CameraType.Front)}
            />
          }
        />
        <View style={styles.backdrop} />
      </View>

      <Animated.View style={[styles.topBar, { opacity: controlsOpacity }]} pointerEvents={showControls ? 'auto' : 'none'}>
          <View style={styles.hostChip}>
            {hostAvatarUri ? (
              <Image source={{ uri: hostAvatarUri }} style={styles.hostAvatar} />
            ) : (
              <View style={[styles.hostAvatar, styles.hostAvatarFallback]}>
                <Text style={styles.hostAvatarInitial}>{hostInitial}</Text>
              </View>
            )}
            <View style={styles.hostInfo}>
              <Text style={styles.hostName} numberOfLines={1}>
                {title || 'Host'}
              </Text>
              <Text style={styles.hostStatus}>Live now • {formatDuration(elapsed)}</Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            {giftCoinsEarned > 0 && (
              <View style={styles.earningsChip}>
                <Text style={styles.earningsText}>🪙 +{giftCoinsEarned.toLocaleString()}</Text>
              </View>
            )}
            <View style={styles.viewerChip}>
              <Text style={styles.viewerIcon}>👁</Text>
              <Text style={styles.viewerText}>{formatCount(viewers)}</Text>
            </View>
            <Pressable onPress={confirmEndStream} style={styles.closeBtn} disabled={ending} hitSlop={8}>
              <Icon name="close" size={20} color="#fff" />
            </Pressable>
          </View>
      </Animated.View>

        <View pointerEvents="none" style={styles.heartsColumn}>
          {hearts.map((h) => (
            <FloatingHeart key={h.id} color={h.color} onDone={() => removeHeart(h.id)} />
          ))}
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
        style={[styles.overlayLayer, { opacity: controlsOpacity }]}
        pointerEvents={showControls ? 'box-none' : 'none'}
      >
        <KeyboardStickyView offset={{ opened: 0, closed: 0 }} style={[
          styles.chatSticky,
          isCompact ? styles.chatListCompact : styles.chatListWide,
          { maxHeight: keyboardVisible ? Math.min(chatMaxHeight, 150) : chatMaxHeight },
        ]}>
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            style={styles.chatList}
            contentContainerStyle={styles.chatListContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) =>
            item.type === 'join' ? (
              <View style={styles.joinToast}>
                <Text style={styles.joinToastText}>👋 {item.user} joined</Text>
              </View>
            ) : item.type === 'gift' ? (
              <View style={styles.chatRow}>
                <View style={[styles.chatAvatar, styles.chatAvatarFallback]} />
                <View style={[styles.chatBubble, styles.giftBubble]}>
                  <Text style={styles.chatUser}>{item.user}</Text>
                  <Text style={styles.giftChatText}>
                    {item.giftEmoji} sent {item.giftName} · 🪙 {item.coinCost}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.chatRow}>
                {item.avatar ? (
                  <Image source={{ uri: item.avatar }} style={styles.chatAvatar} />
                ) : (
                  <View style={[styles.chatAvatar, styles.chatAvatarFallback]} />
                )}
                <View style={styles.commentActions}>
                  <View style={styles.chatBubble}>
                    <Text style={styles.chatUser}>{item.user}</Text>
                    <Text style={styles.chatText}>{item.text}</Text>
                  </View>
                  {item.userId && item.user !== 'You' && (
                    <>
                      <Pressable
                        style={styles.commentMenuButton}
                        onPress={() => setOpenCommentMenuId(openCommentMenuId === item.id ? null : item.id)}
                        hitSlop={6}
                        accessibilityLabel="Comment options"
                      >
                        <Icon name="more-vert" size={18} color="rgba(255,255,255,0.78)" />
                      </Pressable>
                      {openCommentMenuId === item.id && (
                        <View style={styles.commentMenu}>
                          <Pressable
                            style={styles.commentMenuItem}
                            onPress={() => moderateUser(item.userId!, 'remove')}
                          >
                            <Icon name="person-remove" size={17} color="#fff" />
                            <Text style={styles.commentMenuText}>Remove user</Text>
                          </Pressable>
                          <Pressable
                            style={styles.commentMenuItem}
                            onPress={() => moderateUser(item.userId!, 'block')}
                          >
                            <Icon name="block" size={17} color="#ff6b81" />
                            <Text style={[styles.commentMenuText, styles.blockMenuText]}>Block user</Text>
                          </Pressable>
                        </View>
                      )}
                    </>
                  )}
                </View>
              </View>
            )
            }
          />
        </KeyboardStickyView>

        {showQuickActions && (
          <>
            <Pressable
              style={styles.drawerBackdrop}
              onPress={() => setShowQuickActions(false)}
              accessibilityLabel="Close host controls"
            />
            <KeyboardStickyView offset={{ opened: 0, closed: 0 }} style={styles.actionDrawer}>
              <View style={styles.drawerHandle} />
              <View style={styles.drawerOptions}>
                {!showPrivatePicker ? (
                  <Pressable style={styles.drawerOption} onPress={() => setShowPrivatePicker(true)}>
                    <View style={styles.drawerIcon}>
                      <Icon name="lock" size={23} color="#fff" />
                    </View>
                    <Text style={styles.drawerLabel}>Make private</Text>
                  </Pressable>
                ) : null}
                <Pressable style={styles.drawerOption} onPress={toggleMute}>
                  <View style={styles.drawerIcon}>
                    <Icon name={isMuted ? 'mic-off' : 'mic'} size={23} color="#fff" />
                  </View>
                  <Text style={styles.drawerLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
                </Pressable>
                <Pressable style={styles.drawerOption} onPress={toggleCamera}>
                  <View style={styles.drawerIcon}>
                    <Icon name="flip-camera-android" size={23} color="#fff" />
                  </View>
                  <Text style={styles.drawerLabel}>{isCameraFront ? 'Back camera' : 'Front camera'}</Text>
                </Pressable>
              </View>
              {showPrivatePicker && (
                <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
                  <GiftEntryPicker
                    selectedGiftId={entryGift?.giftId}
                    onSelect={setEntryGift}
                    label="Entry gift"
                    hint="Current viewers stay in this live. New viewers must send this gift to join."
                    selectedLabel="Selected"
                  />
                  <Pressable
                    onPress={convertToPrivate}
                    disabled={!entryGift || convertingPrivate}
                    style={{ marginTop: 10, backgroundColor: entryGift ? '#ff2f6e' : '#555', paddingVertical: 11, borderRadius: 10, alignItems: 'center' }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '700' }}>{convertingPrivate ? 'Converting...' : 'Convert this live'}</Text>
                  </Pressable>
                </View>
              )}
            </KeyboardStickyView>
          </>
        )}

        <KeyboardStickyView offset={{ opened: 0, closed: 0 }} style={styles.bottomBar}>
          <View style={styles.composerRow}>
            <View style={styles.inputWrap}>
              <Icon name="chat-bubble-outline" size={20} color="rgba(255,255,255,0.7)" />
              <TextInput
                style={styles.input}
                placeholder="Say something..."
                placeholderTextColor="rgba(255,255,255,0.62)"
                value={commentText}
                onChangeText={setCommentText}
                onSubmitEditing={sendComment}
                returnKeyType="send"
                blurOnSubmit={false}
              />
              <Pressable onPress={sendComment} style={styles.sendBtn} hitSlop={6}>
                <Icon name="send" size={18} color="#fff" />
              </Pressable>
            </View>
            <Pressable
              style={styles.moreButton}
              onPress={() => setShowQuickActions((visible) => !visible)}
              accessibilityLabel={showQuickActions ? 'Hide host controls' : 'Show host controls'}
            >
              <Icon name="more-vert" size={23} color="#fff" />
            </Pressable>
          </View>

        </KeyboardStickyView>
      </Animated.View>

      {!showControls && (
        <Pressable style={styles.revealButton} onPress={() => setControlsVisible(true)}>
          <Icon name="chevron-left" size={24} color="#fff" />
        </Pressable>
      )}
    </View>
  );
};
