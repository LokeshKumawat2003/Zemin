import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { colors, spacing } from '../../theme';

type Props = {
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
};

const formatDisplay = (date: Date) =>
  date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

export const ScheduleDateTimePicker = ({ value, onChange, minimumDate }: Props) => {
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);

  const onDateChange = (_event: DateTimePickerEvent, selected?: Date) => {
    setShowDate(Platform.OS === 'ios');
    if (selected) {
      const next = new Date(value);
      next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
      onChange(next);
    }
  };

  const onTimeChange = (_event: DateTimePickerEvent, selected?: Date) => {
    setShowTime(Platform.OS === 'ios');
    if (selected) {
      const next = new Date(value);
      next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      onChange(next);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Schedule date & time</Text>
      <View style={styles.row}>
        <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowDate(true)}>
          <Text style={styles.pickerEmoji}>📅</Text>
          <View style={styles.pickerTextWrap}>
            <Text style={styles.pickerTitle}>Date</Text>
            <Text style={styles.pickerValue}>
              {value.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowTime(true)}>
          <Text style={styles.pickerEmoji}>🕐</Text>
          <View style={styles.pickerTextWrap}>
            <Text style={styles.pickerTitle}>Time</Text>
            <Text style={styles.pickerValue}>
              {value.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.preview}>
        <Text style={styles.previewLabel}>Starts at</Text>
        <Text style={styles.previewValue}>{formatDisplay(value)}</Text>
      </View>

      {showDate ? (
        <DateTimePicker
          value={value}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={minimumDate}
          onChange={onDateChange}
        />
      ) : null}

      {showTime ? (
        <DateTimePicker
          value={value}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onTimeChange}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pickerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  pickerEmoji: {
    fontSize: 22,
  },
  pickerTextWrap: {
    flex: 1,
  },
  pickerTitle: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  pickerValue: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  preview: {
    backgroundColor: 'rgba(124,58,237,0.12)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.35)',
    padding: spacing.md,
  },
  previewLabel: {
    color: '#c4b5fd',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  previewValue: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 4,
  },
});
