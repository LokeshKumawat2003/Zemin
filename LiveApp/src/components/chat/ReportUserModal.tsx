import Icon from '@react-native-vector-icons/material-icons';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { chatColors as colors } from './chatTheme';

const REPORT_REASONS = ['spam', 'fraud', 'harassment', 'inappropriate', 'other'] as const;

type Props = {
  visible: boolean;
  recipientName: string;
  reason: string;
  description: string;
  reporting: boolean;
  onClose: () => void;
  onReasonChange: (reason: string) => void;
  onDescriptionChange: (description: string) => void;
  onSubmit: () => void;
};

export const ReportUserModal = ({ visible, recipientName, reason, description, reporting, onClose, onReasonChange, onDescriptionChange, onSubmit }: Props) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.backdrop}>
      <View style={styles.card}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Report user</Text>
            <Text style={styles.subtitle}>What happened with {recipientName}?</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={8}>
            <Icon name="close" size={22} color={colors.textSecondary} />
          </Pressable>
        </View>

        <Text style={styles.label}>Reason</Text>
        <View style={styles.reasons}>
          {REPORT_REASONS.map(item => (
            <Pressable key={item} style={[styles.reason, reason === item && styles.reasonSelected]} onPress={() => onReasonChange(item)}>
              <Text style={[styles.reasonText, reason === item && styles.reasonTextSelected]}>
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Description</Text>
        <TextInput value={description} onChangeText={onDescriptionChange} placeholder="Tell us more (optional)" placeholderTextColor={colors.textSecondary} multiline maxLength={500} style={styles.description} />

        <View style={styles.actions}>
          <Pressable style={styles.cancelButton} onPress={onClose} disabled={reporting}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Pressable style={[styles.submitButton, reporting && styles.submitDisabled]} onPress={onSubmit} disabled={reporting}>
            {reporting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitText}>Submit</Text>}
          </Pressable>
        </View>
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: 'rgba(0,0,0,0.68)' },
  card: { width: '100%', maxWidth: 390, padding: 20, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 },
  title: { color: colors.textPrimary, fontSize: 20, fontWeight: '700' },
  subtitle: { color: colors.textSecondary, fontSize: 12, marginTop: 5 },
  label: { color: colors.textPrimary, fontSize: 13, fontWeight: '700', marginBottom: 9 },
  reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  reason: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 9, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  reasonSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  reasonText: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  reasonTextSelected: { color: '#FFFFFF' },
  description: { minHeight: 90, maxHeight: 140, paddingHorizontal: 12, paddingTop: 11, paddingBottom: 11, marginBottom: 20, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceAlt, color: colors.textPrimary, fontSize: 14, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  cancelButton: { minWidth: 82, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: colors.surfaceAlt },
  cancelText: { color: colors.textSecondary, fontSize: 13, fontWeight: '700' },
  submitButton: { minWidth: 92, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: colors.primary },
  submitDisabled: { opacity: 0.65 },
  submitText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
});
