import React from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CameraType } from 'react-native-camera-kit';
import { LiveCameraPreview } from '../../components/live/LiveCameraPreview';
import { LiveKitHostVideo } from '../../components/live/LiveKitHostVideo';
import { GiftBurstAnimation } from '../../components/live/LiveGiftEffects';
import { FloatingHeart } from '../../components/live/FloatingHeart';
import { LiveStackParamList } from '../../navigation/types';
import { styles } from './LiveHostScreen.styles';
import { useLiveHostScreen } from './useLiveHostScreen';

type Props = NativeStackScreenProps<LiveStackParamList, 'LiveHost'>;

export const LiveHostScreen = (props: Props) => {
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
    sendHeart,
    removeHeart,
    removeGiftAnimation,
    formatDuration,
    formatCount,
    toggleMute,
    toggleCamera,
  } = useLiveHostScreen(props);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={StyleSheet.absoluteFill}>
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

      <KeyboardAvoidingView
        style={StyleSheet.absoluteFill}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={styles.topBar}>
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
            <TouchableOpacity onPress={confirmEndStream} style={styles.closeBtn} disabled={ending}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>

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

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          style={[
            styles.chatList,
            isCompact ? styles.chatListCompact : styles.chatListWide,
            { maxHeight: chatMaxHeight },
          ]}
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
                <View style={styles.chatBubble}>
                  <Text style={styles.chatUser}>{item.user}</Text>
                  <Text style={styles.chatText}>{item.text}</Text>
                </View>
              </View>
            )
          }
        />

        <View style={styles.bottomBar}>
          <View style={styles.inputWrap}>
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
            <TouchableOpacity onPress={sendComment} style={styles.sendBtn}>
              <Text style={styles.sendBtnText}>➤</Text>
            </TouchableOpacity>
          </View>

          {!keyboardVisible && (
            <View style={styles.quickActions}>
              <TouchableOpacity style={styles.quickAction} onPress={toggleMute}>
                <Text style={styles.quickActionIcon}>{isMuted ? '🔇' : '🎙️'}</Text>
                <Text style={styles.quickActionLabel}>{isMuted ? 'Muted' : 'Mic'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickAction} onPress={toggleCamera}>
                <Text style={styles.quickActionIcon}>📷</Text>
                <Text style={styles.quickActionLabel}>{isCameraFront ? 'Front' : 'Back'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickAction} onPress={sendHeart}>
                <Text style={styles.quickActionIcon}>🌹</Text>
                <Text style={styles.quickActionLabel}>Rose</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickAction}>
                <Text style={styles.quickActionIcon}>🎁</Text>
                <Text style={styles.quickActionLabel}>Gift</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};
