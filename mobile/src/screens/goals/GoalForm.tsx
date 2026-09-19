import React, { useEffect, useState } from 'react';

import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

import {
  GoalItem,
  GoalPayload,
  goalApi,
} from '@/services/api';

import {
  GOAL_BRAND,
  GOAL_CATEGORIES,
  categoryLabel,
  fromDisplayDate,
  toDisplayDate,
  tonightAt,
} from '@/constants/goals';

type Props = {
  editing?: GoalItem | null;
  onCancel: () => void;
  onSaved: () => Promise<void> | void;
};

export function GoalForm({
  editing,
  onCancel,
  onSaved,
}: Props) {
  const { width } = useWindowDimensions();

  const wide = width >= 900;

  const [title, setTitle] = useState('');
  const [category, setCategory] =
    useState('mental-health');
  const [target, setTarget] = useState('');
  const [deadline, setDeadline] = useState('');
  const [notes, setNotes] = useState('');
  const [reminderOn, setReminderOn] =
    useState(true);
  const [showCategories, setShowCategories] =
    useState(false);
  const [showDatePicker, setShowDatePicker] =
    useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    setTitle(editing?.title || '');

    setCategory(
      editing?.category || 'mental-health'
    );

    setTarget(editing?.target || '');

    setDeadline(
      toDisplayDate(editing?.deadline)
    );

    setNotes(
      editing?.notes ||
        editing?.description ||
        ''
    );

    setError(null);

    if (editing?._id) {
      goalApi
        .getReminder(editing._id)
        .then(() => setReminderOn(true))
        .catch(() => setReminderOn(false));
    } else {
      setReminderOn(true);
    }
  }, [editing]);

  const parseTargetValue = (text: string) => {
    const match = text.match(
      /(\d+(?:\.\d+)?)/
    );

    return match
      ? Number(match[1])
      : undefined;
  };

  /*
   * Convert the current deadline into
   * a JavaScript Date for the native picker.
   */
  const getPickerDate = () => {
    const parsed = fromDisplayDate(deadline);

    if (parsed) {
      const date = new Date(parsed);

      if (!Number.isNaN(date.getTime())) {
        return date;
      }
    }

    return new Date();
  };

  /*
   * Native Android / iOS date picker.
   */
  const handleDateChange = (
    event: any,
    selectedDate?: Date
  ) => {
    if (Platform.OS !== 'ios') {
      setShowDatePicker(false);
    }

    if (!selectedDate) {
      return;
    }

    const month = String(
      selectedDate.getMonth() + 1
    ).padStart(2, '0');

    const day = String(
      selectedDate.getDate()
    ).padStart(2, '0');

    const year =
      selectedDate.getFullYear();

    setDeadline(
      `${month}/${day}/${year}`
    );

    if (Platform.OS === 'ios') {
      setShowDatePicker(false);
    }
  };

  /*
   * Convert mm/dd/yyyy to yyyy-mm-dd
   * for the browser date input.
   */
  const getWebDateValue = () => {
    const parsed = fromDisplayDate(deadline);

    if (!parsed) {
      return '';
    }

    const date = new Date(parsed);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const year =
      date.getFullYear();

    const month = String(
      date.getMonth() + 1
    ).padStart(2, '0');

    const day = String(
      date.getDate()
    ).padStart(2, '0');

    return `${year}-${month}-${day}`;
  };

  /*
   * Browser date picker result.
   */
  const handleWebDateChange = (
    event: any
  ) => {
    const value =
      event.target.value;

    if (!value) {
      return;
    }

    const [year, month, day] =
      value.split('-');

    setDeadline(
      `${month}/${day}/${year}`
    );
  };

  const save = async () => {
    const isoDeadline =
      fromDisplayDate(deadline);

    if (
      !title.trim() ||
      !target.trim() ||
      !isoDeadline
    ) {
      setError(
        'Add a title, target, and deadline (mm/dd/yyyy).'
      );

      return;
    }

    setSaving(true);
    setError(null);

    try {
      const step = /step/i.test(
        `${title} ${target}`
      );

      const payload: GoalPayload = {
        title: title.trim(),
        category,
        target: target.trim(),
        deadline: isoDeadline,
        notes:
          notes.trim() || undefined,
        targetValue:
          parseTargetValue(target),
        trackingType: step
          ? 'steps'
          : 'manual',
        targetUnit: step
          ? 'steps'
          : undefined,
      };

      const saved = editing?._id
        ? await goalApi.update(
            editing._id,
            payload
          )
        : await goalApi.create(payload);

      const goalId = saved.data._id;

      if (reminderOn) {
        try {
          await goalApi.getReminder(
            goalId
          );

          await goalApi.updateReminder(
            goalId,
            {
              remindAt: tonightAt(20),
              frequency: 'daily',
              message: `Time to work on ${payload.title}`,
            }
          );
        } catch {
          await goalApi.createReminder(
            goalId,
            {
              remindAt: tonightAt(20),
              frequency: 'daily',
              message: `Time to work on ${payload.title}`,
            }
          );
        }
      } else if (editing?._id) {
        try {
          await goalApi.cancelReminder(
            goalId
          );
        } catch {
          // no reminder to cancel
        }
      }

      await onSaved();
    } catch (err: any) {
      setError(
        err.message ||
          'Unable to save this goal.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : undefined
      }
      style={{ flex: 1 }}
    >
      <View
        style={[
          styles.page,
          wide && styles.pageWide,
        ]}
      >
        {/* GOAL TITLE */}

        <Text style={styles.label}>
          Goal title
        </Text>

        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Walk 20 minutes daily"
          style={styles.input}
        />

        {/* CATEGORY */}

        <Text style={styles.label}>
          Category
        </Text>

        <TouchableOpacity
          style={styles.input}
          onPress={() =>
            setShowCategories(true)
          }
        >
          <Text style={styles.inputText}>
            {categoryLabel(category)}
          </Text>
        </TouchableOpacity>

        {/* TARGET */}

        <Text style={styles.label}>
          Target
        </Text>

        <TextInput
          value={target}
          onChangeText={setTarget}
          placeholder="5 days/week"
          style={styles.input}
        />

        {/* DEADLINE */}

        <Text style={styles.label}>
          Deadline
        </Text>

        <View style={styles.deadlineWrap}>
          <TextInput
            value={deadline}
            onChangeText={setDeadline}
            placeholder="mm/dd/yyyy"
            style={styles.deadlineInput}
          />

          {Platform.OS === 'web' ? (
            /*
             * WEB:
             * The transparent HTML date input
             * sits directly over the calendar icon.
             * Clicking the icon opens the browser
             * calendar automatically.
             */
            <View
              style={styles.webCalendarButton}
            >
              <Ionicons
                name="calendar-outline"
                size={21}
                color={GOAL_BRAND}
              />

              {React.createElement(
                'input',
                {
                  type: 'date',
                  value:
                    getWebDateValue(),
                  onChange:
                    handleWebDateChange,
                  style: {
                    position:
                      'absolute',
                    top: 0,
                    right: 0,
                    bottom: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    opacity: 0,
                    cursor: 'pointer',
                  },
                }
              )}
            </View>
          ) : (
            /*
             * ANDROID / IOS:
             * Native calendar picker.
             */
            <TouchableOpacity
              style={
                styles.calendarButton
              }
              onPress={() =>
                setShowDatePicker(true)
              }
              activeOpacity={0.7}
            >
              <Ionicons
                name="calendar-outline"
                size={21}
                color={GOAL_BRAND}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* NATIVE DATE PICKER */}

        {Platform.OS !== 'web' &&
        showDatePicker ? (
          <DateTimePicker
            value={getPickerDate()}
            mode="date"
            display="default"
            onChange={
              handleDateChange
            }
          />
        ) : null}

        {/* NOTES */}

        <Text style={styles.label}>
          Notes (optional)
        </Text>

        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Why this matters this month"
          style={[
            styles.input,
            styles.notes,
          ]}
          multiline
        />

        {/* REMINDER */}

        <View style={styles.reminderRow}>
          <View
            style={{
              flex: 1,
              paddingRight: 12,
            }}
          >
            <Text
              style={styles.reminderTitle}
            >
              Daily reminder
            </Text>

            <Text
              style={styles.reminderCopy}
            >
              You'll get a gentle nudge at
              8:00 PM on days this goal is
              due.
            </Text>
          </View>

          <Switch
            value={reminderOn}
            onValueChange={
              setReminderOn
            }
            trackColor={{
              false: '#D0D5DB',
              true: GOAL_BRAND,
            }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* ERROR */}

        {error ? (
          <Text style={styles.error}>
            {error}
          </Text>
        ) : null}

        {/* SAVE */}

        <TouchableOpacity
          style={styles.save}
          onPress={save}
          disabled={saving}
          activeOpacity={0.85}
        >
          <Text style={styles.saveText}>
            {saving
              ? 'Saving…'
              : 'Save goal'}
          </Text>
        </TouchableOpacity>

        {/* CANCEL */}

        <TouchableOpacity
          onPress={onCancel}
          style={styles.cancel}
        >
          <Text style={styles.cancelText}>
            Cancel
          </Text>
        </TouchableOpacity>
      </View>

      {/* CATEGORY MODAL */}

      <Modal
        visible={showCategories}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setShowCategories(false)
        }
      >
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text
              style={
                styles.reminderTitle
              }
            >
              Category
            </Text>

            {GOAL_CATEGORIES.map(
              (item) => (
                <TouchableOpacity
                  key={item.value}
                  style={styles.option}
                  onPress={() => {
                    setCategory(
                      item.value
                    );

                    setShowCategories(
                      false
                    );
                  }}
                >
                  <Text
                    style={[
                      styles.optionText,
                      category ===
                        item.value && {
                        color:
                          GOAL_BRAND,
                        fontWeight:
                          '800',
                      },
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 40,
  },

  pageWide: {
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },

  label: {
    fontWeight: '700',
    color: '#1C242C',
    marginBottom: 6,
    marginTop: 12,
  },

  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDE3EA',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  inputText: {
    color: '#1C242C',
  },

  /* DEADLINE */

  deadlineWrap: {
    position: 'relative',
  },

  deadlineInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDE3EA',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    paddingRight: 52,
  },

  calendarButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },

  webCalendarButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  notes: {
    minHeight: 90,
    textAlignVertical: 'top',
  },

  /* REMINDER */

  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },

  reminderTitle: {
    fontWeight: '800',
    color: '#1C242C',
    fontSize: 16,
  },

  reminderCopy: {
    color: '#6B7380',
    marginTop: 4,
    lineHeight: 18,
  },

  /* ERROR */

  error: {
    color: '#BA1A1A',
    marginTop: 12,
  },

  /* SAVE */

  save: {
    backgroundColor: GOAL_BRAND,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 22,
  },

  saveText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },

  /* CANCEL */

  cancel: {
    alignItems: 'center',
    paddingVertical: 16,
  },

  cancelText: {
    color: '#6B7380',
    fontWeight: '700',
  },

  /* CATEGORY MODAL */

  backdrop: {
    flex: 1,
    backgroundColor:
      'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 24,
  },

  sheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
  },

  option: {
    paddingVertical: 12,
  },

  optionText: {
    fontSize: 16,
    color: '#1C242C',
  },
});