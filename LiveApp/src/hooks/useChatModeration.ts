import { useState } from 'react';
import { Alert } from 'react-native';
import { reportApi, userApi } from '../api';

type Props = {
  recipientId: string;
  recipientName: string;
  onBlocked: () => void;
};

export const useChatModeration = ({ recipientId, recipientName, onBlocked }: Props) => {
  const [showChatActions, setShowChatActions] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('spam');
  const [reportDescription, setReportDescription] = useState('');
  const [reporting, setReporting] = useState(false);

  const reportUser = async () => {
    if (reporting) return;
    try {
      setReporting(true);
      await reportApi.create({
        targetType: 'user',
        targetId: recipientId,
        reason: reportReason,
        description: reportDescription.trim() || undefined,
      });
      setShowReportModal(false);
      setReportDescription('');
      Alert.alert('Reported', 'Thank you. Our team will review this report.');
    } catch {
      Alert.alert('Report failed', 'Unable to submit this report.');
    } finally {
      setReporting(false);
    }
  };

  const blockUser = async () => {
    try {
      await userApi.blockUser(recipientId);
      Alert.alert('User blocked', `${recipientName} has been blocked.`, [{ text: 'OK', onPress: onBlocked }]);
    } catch {
      Alert.alert('Block failed', 'Unable to block this user.');
    }
  };

  const openChatActions = () => setShowChatActions(previous => !previous);
  const openReportModal = () => {
    setShowChatActions(false);
    setShowReportModal(true);
  };
  const confirmBlockUser = () => {
    setShowChatActions(false);
    Alert.alert('Block user?', `You will stop receiving messages from ${recipientName}.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Block', style: 'destructive', onPress: blockUser },
    ]);
  };

  return {
    showChatActions,
    showReportModal,
    reportReason,
    reportDescription,
    reporting,
    openChatActions,
    openReportModal,
    confirmBlockUser,
    reportUser,
    setShowReportModal,
    setReportReason,
    setReportDescription,
  };
};
