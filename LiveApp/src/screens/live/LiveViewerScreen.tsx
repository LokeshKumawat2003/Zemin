import React from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
} from 'react-native';
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={StyleSheet.absoluteFill}>
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

      <KeyboardAvoidingView
        style={StyleSheet.absoluteFill}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
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
            <TouchableOpacity onPress={() => props.navigation.goBack()} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          ref={chatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          style={[
            styles.chatList,
            isCompact ? styles.chatListCompact : styles.chatListWide,
            styles.chatListFixedHeight,
          ]}
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

        <View style={[styles.bottomBar, { bottom: Math.max(12, bottom + 8) }]}>
          <View style={styles.inputWrap}>
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
            <TouchableOpacity onPress={sendChat} style={styles.sendBtn}>
              <Text style={styles.sendBtnText}>➤</Text>
            </TouchableOpacity>
          </View>

          {!keyboardVisible && (
            <View style={styles.quickActions}>
              <TouchableOpacity style={styles.quickAction} onPress={() => setGiftModalVisible(true)}>
                <Text style={styles.quickActionIcon}>🎁</Text>
                <Text style={styles.quickActionLabel}>Gifts</Text>
              </TouchableOpacity>
              <View style={styles.coinChip}>
                <Text style={styles.coinChipText}>🪙 {coinBalance.toLocaleString()}</Text>
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>

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

