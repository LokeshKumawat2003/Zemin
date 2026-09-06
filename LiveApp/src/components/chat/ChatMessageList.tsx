import Icon from '@react-native-vector-icons/material-icons';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { KeyboardChatScrollView } from 'react-native-keyboard-controller';
import type { KeyboardChatScrollViewRef } from 'react-native-keyboard-controller';
import { ChatMessage, ChatMessageBubble } from './ChatMessageBubble';
import { chatColors as colors } from './chatTheme';

export type ChatListMessage = ChatMessage & { avatar?: string };

type Props = {
  scrollRef: React.RefObject<KeyboardChatScrollViewRef | null>;
  messages: ChatListMessage[];
  loadingMessages: boolean;
  loadingOlder: boolean;
  showScrollToBottom: boolean;
  recipientAvatar?: string;
  fallbackAvatar: string;
  onScroll: (event: any) => void;
  onScrollBeginDrag: () => void;
  onLayout: (event: any) => void;
  onContentSizeChange: (width: number, height: number) => void;
  onScrollToBottom: () => void;
  onImagePress: (imageUrl: string) => void;
};

const isGroupStart = (messages: ChatListMessage[], index: number) =>
  index === 0 || messages[index - 1].isMine !== messages[index].isMine;

const isGroupEnd = (messages: ChatListMessage[], index: number) =>
  index === messages.length - 1 || messages[index + 1].isMine !== messages[index].isMine;

export const ChatMessageList = ({
  scrollRef,
  messages,
  loadingMessages,
  loadingOlder,
  showScrollToBottom,
  recipientAvatar,
  fallbackAvatar,
  onScroll,
  onScrollBeginDrag,
  onLayout,
  onContentSizeChange,
  onScrollToBottom,
  onImagePress,
}: Props) => {
  const renderMessage = ({ item, index }: { item: ChatListMessage; index: number }) => {
    const groupEnd = isGroupEnd(messages, index);
    const groupStart = isGroupStart(messages, index);

    return (
      <View style={[styles.messageRow, item.isMine && styles.myMessageRow, groupStart && styles.messageRowSpaced]}>
        {!item.isMine && (
          groupEnd ? (
            <Image source={{ uri: item.avatar || recipientAvatar || fallbackAvatar }} style={styles.messageAvatar} />
          ) : (
            <View style={styles.messageAvatarSpacer} />
          )
        )}
        <View style={styles.messageContent}>
          <ChatMessageBubble message={item} tail={groupEnd} onImagePress={onImagePress} />
        </View>
      </View>
    );
  };

  return (
    <>
      <KeyboardChatScrollView
        ref={scrollRef}
        contentContainerStyle={styles.chatContent}
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        onScrollBeginDrag={onScrollBeginDrag}
        onScrollEndDrag={onScroll}
        onMomentumScrollEnd={onScroll}
        scrollEventThrottle={16}
        onLayout={onLayout}
        onContentSizeChange={onContentSizeChange}
      >
        {loadingMessages ? (
          <ActivityIndicator color={colors.primary} style={styles.messageLoader} />
        ) : (
          <>
            {loadingOlder && <ActivityIndicator color={colors.primary} style={styles.olderLoader} />}
            <View style={styles.dateContainer}>
              <View style={styles.dateLine} />
              <Text style={styles.dateText}>TODAY</Text>
              <View style={styles.dateLine} />
            </View>
            <FlatList data={messages} renderItem={renderMessage} keyExtractor={item => item.id} scrollEnabled={false} />
          </>
        )}
      </KeyboardChatScrollView>

      {showScrollToBottom && (
        <Pressable style={styles.scrollToBottomButton} onPress={onScrollToBottom} accessibilityLabel="Scroll to latest message">
          <Icon name="keyboard-arrow-down" size={24} color={colors.textPrimary} />
        </Pressable>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  chatContent: { flexGrow: 1, paddingHorizontal: 14, paddingTop: 16, paddingBottom: 6 },
  messageLoader: { alignSelf: 'center', marginVertical: 40 },
  olderLoader: { alignSelf: 'center', marginBottom: 8 },
  dateContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  dateLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dateText: { marginHorizontal: 10, color: colors.textSecondary, fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 3, paddingRight: 36 },
  messageRowSpaced: { marginTop: 10 },
  myMessageRow: { justifyContent: 'flex-end', paddingRight: 0, paddingLeft: 36 },
  messageAvatar: { width: 26, height: 26, borderRadius: 13, marginRight: 7 },
  messageAvatarSpacer: { width: 33 },
  messageContent: { maxWidth: '78%' },
  scrollToBottomButton: { position: 'absolute', right: 16, bottom: 82, width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
});
