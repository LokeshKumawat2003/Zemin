import Icon from '@react-native-vector-icons/material-icons';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import type { RefObject } from 'react';
import { chatColors as colors } from './chatTheme';

type Props = {
  inputRef: RefObject<TextInput | null>;
  message: string;
  hasText: boolean;
  uploading: boolean;
  onChangeMessage: (message: string) => void;
  onPickAttachment: () => void;
  onSend: () => void;
};

export const ChatComposer = ({ inputRef, message, hasText, uploading, onChangeMessage, onPickAttachment, onSend }: Props) => (
  <KeyboardStickyView offset={{ opened: 0, closed: 0 }} style={styles.container}>
    <View style={styles.inputWrapper}>
      <Pressable style={styles.attachButton} onPress={onPickAttachment} disabled={uploading} hitSlop={6}>
        {uploading ? <ActivityIndicator size="small" color={colors.primary} /> : <Icon name="add" size={24} color={colors.primary} />}
      </Pressable>
      <TextInput
        ref={inputRef}
        value={message}
        onChangeText={onChangeMessage}
        placeholder="Write a message..."
        placeholderTextColor={colors.textSecondary}
        multiline
        maxLength={1000}
        style={styles.input}
      />
      {!hasText && (
        <Pressable style={styles.iconButton} hitSlop={6}>
          <Icon name="emoji-emotions" size={22} color={colors.textSecondary} />
        </Pressable>
      )}
    </View>
    <Pressable onPress={onSend} disabled={!hasText} style={[styles.sendButton, !hasText && styles.sendButtonDisabled]}>
      <Icon name="send" size={19} color="#FFFFFF" />
    </Pressable>
  </KeyboardStickyView>
);

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'flex-end', borderTopWidth: 1, paddingHorizontal: 8, paddingTop: 8, paddingBottom: 8, gap: 8 },
  inputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', backgroundColor: colors.surfaceAlt, borderRadius: 24, paddingHorizontal: 4 },
  attachButton: { width: 40, height: 46, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, minHeight: 46, maxHeight: 100, paddingHorizontal: 4, paddingTop: 11, paddingBottom: 10, color: colors.textPrimary, fontSize: 15, lineHeight: 20, textAlignVertical: 'top' },
  iconButton: { width: 40, height: 46, alignItems: 'center', justifyContent: 'center' },
  sendButton: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendButtonDisabled: { backgroundColor: '#7a304b' },
});
