import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/store/AuthContext';
import { apiFetch } from '@/services/api';
import { Fonts, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function ManageScheduleScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const isDark = useColorScheme() === 'dark';
  const colors = {
    background: isDark ? '#121212' : '#F5F7FA',
    card: isDark ? '#1E1E1E' : '#FFFFFF',
    text: isDark ? '#ECEDEE' : '#1C2024',
    textSecondary: isDark ? '#9BA1A6' : '#687076',
    border: isDark ? '#2E2E2E' : '#E6E8EB',
    inputBg: isDark ? '#1A1A1A' : '#F0F2F5',
    brand: '#245B8B',
    brandLight: isDark ? '#1E3A5F' : '#E8F1F9',
    accentGreen: '#34C759',
    accentRed: '#FF3B30',
  };

  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [editingSession, setEditingSession] = useState<any | null>(null);

  // Form states
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [date, setDate] = useState<string>(''); // YYYY-MM-DD
  const [startTime, setStartTime] = useState<string>(''); // HH:MM
  const [endTime, setEndTime] = useState<string>(''); // HH:MM
  const [meetingLink, setMeetingLink] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Fetch supporter schedule
  const fetchSchedule = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/api/sessions/my-schedule');
      setSessions(data.items || []);
    } catch (err: any) {
      console.error('[ManageSchedule] Fetch error:', err);
      Alert.alert('Error', err.message || 'Failed to load schedule.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  // Set default values for new session form
  const openCreateModal = () => {
    setEditingSession(null);
    setTitle('');
    setDescription('');
    // Pre-populate with tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDate(tomorrow.toISOString().split('T')[0]);
    setStartTime('14:00');
    setEndTime('15:00');
    setMeetingLink('');
    setModalVisible(true);
  };

  const openEditModal = (session: any) => {
    if (session.status === 'booked') {
      Alert.alert('Cannot Edit Time', 'This session is already booked. You can modify meeting links or notes, or cancel the session.');
    }
    setEditingSession(session);
    setTitle(session.title);
    setDescription(session.description || '');
    const startObj = new Date(session.startTime);
    const endObj = new Date(session.endTime);
    setDate(startObj.toISOString().split('T')[0]);
    setStartTime(startObj.toTimeString().substring(0, 5));
    setEndTime(endObj.toTimeString().substring(0, 5));
    setMeetingLink(session.meetingLink || '');
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !date.trim() || !startTime.trim() || !endTime.trim()) {
      Alert.alert('Validation Error', 'Please fill in Title, Date, Start Time, and End Time.');
      return;
    }

    // Parse date/times
    const startStr = `${date.trim()}T${startTime.trim()}:00`;
    const endStr = `${date.trim()}T${endTime.trim()}:00`;
    const start = new Date(startStr);
    const end = new Date(endStr);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      Alert.alert('Validation Error', 'Please verify your Date and Time formats (YYYY-MM-DD and HH:MM).');
      return;
    }

    if (start < new Date() && !editingSession) {
      Alert.alert('Validation Error', 'The session start time must be in the future.');
      return;
    }

    if (end <= start) {
      Alert.alert('Validation Error', 'The end time must be after the start time.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        meetingLink: meetingLink.trim(),
      };

      if (editingSession) {
        await apiFetch(`/api/sessions/${editingSession._id}`, {
          method: 'PUT',
          body: payload,
        });
        Alert.alert('Success', 'Session slot updated successfully.');
      } else {
        await apiFetch('/api/sessions', {
          method: 'POST',
          body: payload,
        });
        Alert.alert('Success', 'Session slot created successfully.');
      }
      setModalVisible(false);
      fetchSchedule();
    } catch (err: any) {
      console.error('[ManageSchedule] Save error:', err);
      Alert.alert('Error', err.message || 'Failed to save session slot.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelSession = async (sessionId: string, isBooked: boolean) => {
    const performCancel = async () => {
      try {
        await apiFetch(`/api/sessions/${sessionId}/cancel`, {
          method: 'POST',
        });
        Alert.alert('Success', 'Session cancelled.');
        fetchSchedule();
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to cancel session.');
      }
    };

    if (Platform.OS === 'web') {
      const msg = isBooked 
        ? 'This session is booked by a member. Cancelling will remove their booking. Proceed?'
        : 'Are you sure you want to cancel/remove this support session?';
      if (window.confirm(msg)) {
        performCancel();
      }
    } else {
      Alert.alert(
        'Cancel Session',
        isBooked 
          ? 'This session is booked by a member. Cancelling will remove their booking. Are you sure?' 
          : 'Are you sure you want to cancel this support session slot?',
        [
          { text: 'No', style: 'cancel' },
          { text: 'Yes, Cancel', style: 'destructive', onPress: performCancel },
        ]
      );
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    const performDelete = async () => {
      try {
        await apiFetch(`/api/sessions/${sessionId}`, {
          method: 'DELETE',
        });
        Alert.alert('Success', 'Session slot deleted.');
        fetchSchedule();
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to delete slot.');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Delete this availability slot?')) {
        performDelete();
      }
    } else {
      Alert.alert(
        'Delete Slot',
        'Are you sure you want to delete this availability slot?',
        [
          { text: 'No', style: 'cancel' },
          { text: 'Yes, Delete', style: 'destructive', onPress: performDelete },
        ]
      );
    }
  };

  const renderSessionItem = ({ item }: { item: any }) => {
    const start = new Date(item.startTime);
    const end = new Date(item.endTime);
    const formattedDate = start.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    const formattedStart = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const formattedEnd = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const isBooked = item.status === 'booked';
    const isCancelled = item.status === 'cancelled';

    return (
      <View style={[styles.sessionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
          <View style={[
            styles.badge, 
            { 
              backgroundColor: isBooked ? '#34C7591A' : isCancelled ? '#FF3B3015' : colors.brandLight, 
              borderColor: isBooked ? '#34C759' : isCancelled ? '#FF3B30' : colors.brand 
            }
          ]}>
            <Text style={[styles.badgeText, { color: isBooked ? '#34C759' : isCancelled ? '#FF3B30' : colors.brand }]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>

        {item.description ? (
          <Text style={[styles.cardDesc, { color: colors.textSecondary }]} numberOfLines={2}>{item.description}</Text>
        ) : null}

        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
            {formattedDate} at {formattedStart} - {formattedEnd}
          </Text>
        </View>

        {item.meetingLink ? (
          <View style={styles.metaRow}>
            <Ionicons name="link-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.metaText, { color: colors.brand }]} numberOfLines={1}>
              {item.meetingLink}
            </Text>
          </View>
        ) : null}

        {isBooked && item.userId && (
          <View style={[styles.clientBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.clientHeader, { color: colors.text }]}>Booked Member Details:</Text>
            <Text style={[styles.clientText, { color: colors.textSecondary }]}>Name: {item.userId.name}</Text>
            <Text style={[styles.clientText, { color: colors.textSecondary }]}>Email: {item.userId.email}</Text>
            {item.userId.phoneNumber ? (
              <Text style={[styles.clientText, { color: colors.textSecondary }]}>Phone: {item.userId.phoneNumber}</Text>
            ) : null}
          </View>
        )}

        <View style={styles.actionRow}>
          {!isCancelled && (
            <TouchableOpacity 
              style={[styles.editBtn, { borderColor: colors.border }]}
              onPress={() => openEditModal(item)}
            >
              <Ionicons name="create-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.actionBtnText, { color: colors.textSecondary }]}>Edit</Text>
            </TouchableOpacity>
          )}

          {!isCancelled && (
            <TouchableOpacity 
              style={[styles.cancelBtn, { borderColor: '#FF3B30' }]}
              onPress={() => handleCancelSession(item._id, isBooked)}
            >
              <Ionicons name="close-circle-outline" size={16} color="#FF3B30" />
              <Text style={[styles.actionBtnText, { color: '#FF3B30' }]}>Cancel</Text>
            </TouchableOpacity>
          )}

          {!isBooked && (
            <TouchableOpacity 
              style={[styles.deleteBtn, { borderColor: '#FF3B30' }]}
              onPress={() => handleDeleteSession(item._id)}
            >
              <Ionicons name="trash-outline" size={16} color="#FF3B30" />
              <Text style={[styles.actionBtnText, { color: '#FF3B30' }]}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text, fontFamily: Fonts.rounded || 'System' }]}>Hosting Schedule</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Manage your counseling and support sessions.</Text>
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.brand }]}
          onPress={openCreateModal}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={20} color="#FFF" />
          <Text style={styles.addButtonText}>Add Slot</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : sessions.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="calendar-outline" size={64} color={colors.textSecondary} style={{ opacity: 0.3, marginBottom: 10 }} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Sessions Scheduled</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Tap &apos;Add Slot&apos; to schedule your availability for peer-support.
          </Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item._id}
          renderItem={renderSessionItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Create / Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {editingSession ? 'Edit Support Slot' : 'Create Support Slot'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalForm} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Session Title</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                  placeholder="e.g. Stress Coping & General Check-in"
                  placeholderTextColor={colors.textSecondary}
                  value={title}
                  onChangeText={setTitle}
                  maxLength={100}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Description (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                  placeholder="Briefly state what support area or topics will be focused on..."
                  placeholderTextColor={colors.textSecondary}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={3}
                  maxLength={500}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                  placeholder="2026-08-21"
                  placeholderTextColor={colors.textSecondary}
                  value={date}
                  onChangeText={setDate}
                  maxLength={10}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={[styles.label, { color: colors.text }]}>Start Time (HH:MM)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                    placeholder="14:00"
                    placeholderTextColor={colors.textSecondary}
                    value={startTime}
                    onChangeText={setStartTime}
                    maxLength={5}
                  />
                </View>

                <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={[styles.label, { color: colors.text }]}>End Time (HH:MM)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                    placeholder="15:00"
                    placeholderTextColor={colors.textSecondary}
                    value={endTime}
                    onChangeText={setEndTime}
                    maxLength={5}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Online Meeting Link (Optional)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                  placeholder="e.g. Zoom, Google Meet link"
                  placeholderTextColor={colors.textSecondary}
                  value={meetingLink}
                  onChangeText={setMeetingLink}
                  autoCapitalize="none"
                />
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: colors.brand }]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.submitBtnText}>
                    {editingSession ? 'Save Changes' : 'Publish Slot'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#0000001A',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 4,
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  listContainer: {
    padding: 20,
    gap: 16,
  },
  sessionCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  metaText: {
    fontSize: 13,
  },
  clientBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    gap: 2,
  },
  clientHeader: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  clientText: {
    fontSize: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#00000010',
    paddingTop: 12,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 'auto',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    maxHeight: '85%',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalForm: {
    gap: 16,
  },
  formGroup: {
    gap: 6,
  },
  row: {
    flexDirection: 'row',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  submitBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
