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
  RefreshControl,
  StatusBar,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '@/store/AuthContext';
import { apiFetch } from '@/services/api';
import { Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function ManageScheduleScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const isDark = useColorScheme() === 'dark';

  const colors = {
    background: isDark ? '#0F172A' : '#F8FAFC',
    card: isDark ? '#1E293B' : '#FFFFFF',
    text: isDark ? '#F8FAFC' : '#0F172A',
    textSecondary: isDark ? '#94A3B8' : '#64748B',
    border: isDark ? '#334155' : '#E2E8F0',
    inputBg: isDark ? '#1E293B' : '#F1F5F9',
    brand: '#2563EB',
    brandLight: isDark ? '#1E3A8A40' : '#EFF6FF',
    accentRed: '#DC2626',
    fabBg: '#2563EB',
    divider: isDark ? '#334155' : '#E2E8F0',
  };

  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [editingSession, setEditingSession] = useState<any | null>(null);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  // Form states
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [date, setDate] = useState<string>(''); // YYYY-MM-DD
  const [startTime, setStartTime] = useState<string>(''); // HH:MM
  const [endTime, setEndTime] = useState<string>(''); // HH:MM
  const [meetingLink, setMeetingLink] = useState<string>('');
  const [sessionType, setSessionType] = useState<'online' | 'physical'>('online');
  const [venue, setVenue] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState<boolean>(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState<boolean>(false);

  const getDateObj = (dateStr: string) => {
    if (!dateStr) return new Date();
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
    return new Date();
  };

  const getTimeObj = (timeStr: string) => {
    const d = new Date();
    if (!timeStr) return d;
    const parts = timeStr.split(':');
    if (parts.length >= 2) {
      d.setHours(parseInt(parts[0], 10), parseInt(parts[1], 10), 0, 0);
    }
    return d;
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return 'Select Date';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    }
    return dateStr;
  };

  const formatTimeDisplay = (timeStr: string) => {
    if (!timeStr) return 'Select Time';
    const parts = timeStr.split(':');
    if (parts.length >= 2) {
      const hours = parseInt(parts[0], 10);
      const minutes = parts[1];
      const period = hours >= 12 ? 'PM' : 'AM';
      const h12 = hours % 12 || 12;
      return `${h12}:${minutes} ${period}`;
    }
    return timeStr;
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate && event.type !== 'dismissed') {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      setDate(`${year}-${month}-${day}`);
    }
  };

  const onStartTimeChange = (event: any, selectedTime?: Date) => {
    setShowStartTimePicker(false);
    if (selectedTime && event.type !== 'dismissed') {
      const hours = String(selectedTime.getHours()).padStart(2, '0');
      const minutes = String(selectedTime.getMinutes()).padStart(2, '0');
      setStartTime(`${hours}:${minutes}`);
    }
  };

  const onEndTimeChange = (event: any, selectedTime?: Date) => {
    setShowEndTimePicker(false);
    if (selectedTime && event.type !== 'dismissed') {
      const hours = String(selectedTime.getHours()).padStart(2, '0');
      const minutes = String(selectedTime.getMinutes()).padStart(2, '0');
      setEndTime(`${hours}:${minutes}`);
    }
  };

  // Fetch supporter schedule
  const fetchSchedule = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/api/sessions/my-schedule');
      const items = data.items || [];
      setSessions(items);
    } catch (err: any) {
      console.error('[ManageSchedule] Fetch error:', err);
      Alert.alert('Error', err.message || 'Failed to load schedule.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSchedule();
  }, [fetchSchedule]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Set default values for new session form
  const openCreateModal = () => {
    setEditingSession(null);
    setTitle('');
    setDescription('');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDate(tomorrow.toISOString().split('T')[0]);
    setStartTime('14:00');
    setEndTime('15:00');
    setMeetingLink('');
    setSessionType('online');
    setVenue('');
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
    setSessionType(session.sessionType || 'online');
    setVenue(session.venue || '');
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !date.trim() || !startTime.trim() || !endTime.trim()) {
      Alert.alert('Validation Error', 'Please fill in Title, Date, Start Time, and End Time.');
      return;
    }

    if (sessionType === 'physical' && !venue.trim()) {
      Alert.alert('Validation Error', 'Please enter a venue for physical sessions.');
      return;
    }

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
        sessionType: sessionType,
        venue: sessionType === 'physical' ? venue.trim() : '',
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

  const filteredSessions = sessions.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (s.title && s.title.toLowerCase().includes(q)) ||
      (s.description && s.description.toLowerCase().includes(q)) ||
      (s.venue && s.venue.toLowerCase().includes(q)) ||
      (s.sessionType && s.sessionType.toLowerCase().includes(q))
    );
  });

  const renderSessionItem = ({ item }: { item: any }) => {
    const isExpanded = expandedIds.has(item._id);
    const start = new Date(item.startTime);
    const end = new Date(item.endTime);
    const formattedDate = start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: '2-digit', year: 'numeric' });
    const formattedStart = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const formattedEnd = end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    const isBooked = item.status === 'booked';
    const isCancelled = item.status === 'cancelled';

    return (
      <View style={[styles.accordionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Accordion Header (Always Clickable) */}
        <TouchableOpacity
          style={styles.cardHeader}
          onPress={() => toggleExpand(item._id)}
          activeOpacity={0.75}
        >
          <View style={styles.cardHeaderLeft}>
            <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.description || (item.sessionType === 'physical' ? 'Physical Session' : 'Virtual Session')}
            </Text>
          </View>
          <Ionicons
            name={isExpanded ? 'chevron-down' : 'chevron-forward'}
            size={22}
            color={colors.text}
          />
        </TouchableOpacity>

        {/* Accordion Body */}
        {isExpanded && (
          <View style={styles.cardBody}>
            <View style={[styles.cardDivider, { backgroundColor: colors.divider }]} />

            {item.sessionType === 'physical' ? (
              <>
                {/* Slots */}
                <View style={styles.detailRow}>
                  <Ionicons name="albums-outline" size={18} color={colors.textSecondary} style={styles.detailIcon} />
                  <Text style={[styles.detailText, { color: colors.text }]}>
                    Slots: {isBooked ? '1 (Booked)' : '1 (Available)'}
                  </Text>
                </View>

                {/* Participants */}
                <View style={styles.detailRow}>
                  <Ionicons name="people-outline" size={18} color={colors.textSecondary} style={styles.detailIcon} />
                  <Text style={[styles.detailText, { color: colors.text }]}>
                    Participants: {isBooked ? (item.userId?.name || '1 Participant') : 'No participants yet'}
                  </Text>
                </View>
              </>
            ) : (
              <>
                {/* Date */}
                <View style={styles.detailRow}>
                  <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} style={styles.detailIcon} />
                  <Text style={[styles.detailText, { color: colors.text }]}>{formattedDate}</Text>
                </View>

                {/* Time */}
                <View style={styles.detailRow}>
                  <Ionicons name="time-outline" size={18} color={colors.textSecondary} style={styles.detailIcon} />
                  <Text style={[styles.detailText, { color: colors.text }]}>
                    {formattedStart} - {formattedEnd}
                  </Text>
                </View>

                {/* Virtual Hyperlink */}
                <View style={styles.detailRow}>
                  <Ionicons name="videocam-outline" size={18} color={colors.textSecondary} style={styles.detailIcon} />
                  <TouchableOpacity
                    onPress={() => {
                      const raw = item.meetingLink?.trim();
                      const url = raw
                        ? (raw.startsWith('http') ? raw : `https://${raw}`)
                        : `https://meet.jit.si/carecircle-session-${item._id.slice(-6)}`;
                      Linking.openURL(url).catch(() => {
                        Alert.alert('Error', 'Unable to open meeting link.');
                      });
                    }}
                    activeOpacity={0.7}
                    style={styles.meetingLinkBtn}
                  >
                    <Text
                      style={[
                        styles.detailText,
                        styles.linkText,
                        { color: colors.brand },
                      ]}
                    >
                      Meeting Link
                    </Text>
                    <Ionicons name="open-outline" size={14} color={colors.brand} style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Bottom Actions Row */}
            <View style={styles.cardActions}>
              {/* Cancel / Delete Icon */}
              <TouchableOpacity
                onPress={() => {
                  if (isBooked) {
                    handleCancelSession(item._id, true);
                  } else {
                    handleDeleteSession(item._id);
                  }
                }}
                hitSlop={8}
                style={styles.actionIconBtn}
                accessibilityLabel="Cancel or Delete Session"
              >
                <Ionicons name="close-circle-outline" size={26} color={colors.accentRed} />
              </TouchableOpacity>

              {/* Edit Icon */}
              {!isCancelled && (
                <TouchableOpacity
                  onPress={() => openEditModal(item)}
                  hitSlop={8}
                  style={styles.actionIconBtn}
                  accessibilityLabel="Edit Session"
                >
                  <Ionicons name="create-outline" size={25} color={colors.brand} />
                </TouchableOpacity>
              )}

              {/* Booked Member / Attendees Icon (Physical Sessions only) */}
              {isBooked && item.sessionType === 'physical' && (
                <TouchableOpacity
                  onPress={() => setSelectedMember(item.userId?.name || 'CareCircle Member')}
                  hitSlop={8}
                  style={styles.actionIconBtn}
                  accessibilityLabel="View Booked Member"
                >
                  <Ionicons name="people-outline" size={25} color={colors.brand} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => navigation.goBack()}
          hitSlop={12}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.text, fontFamily: Fonts.rounded || 'System' }]}>
          Manage Session
        </Text>

        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => Alert.alert('Notifications', 'No new schedule notifications.')}
          hitSlop={12}
          accessibilityLabel="Notifications"
        >
          <Ionicons name="notifications-outline" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Search Input Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: colors.inputBg }]}>
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search"
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <Ionicons name="search-outline" size={20} color={colors.text} style={styles.searchIcon} />
        </View>
      </View>

      {/* Main List */}
      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : filteredSessions.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="calendar-outline" size={60} color={colors.textSecondary} style={{ opacity: 0.35, marginBottom: 12 }} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Sessions Found</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            {searchQuery ? 'No sessions match your search criteria.' : 'Tap the + button to add your first support session.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredSessions}
          keyExtractor={(item) => item._id}
          renderItem={renderSessionItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.brand]} />
          }
        />
      )}

      {/* Floating Action Button (FAB) */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.fabBg }]}
        onPress={openCreateModal}
        activeOpacity={0.85}
        accessibilityLabel="Add session"
      >
        <Ionicons name="add" size={32} color="#FFFFFF" />
      </TouchableOpacity>

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
                  placeholder="e.g. Anxiety Coping Session"
                  placeholderTextColor={colors.textSecondary}
                  value={title}
                  onChangeText={setTitle}
                  maxLength={100}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Subtitle / Category</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                  placeholder="e.g. Group Workshop, Anxiety Session"
                  placeholderTextColor={colors.textSecondary}
                  value={description}
                  onChangeText={setDescription}
                  maxLength={120}
                />
              </View>

              {/* Date Picker Trigger */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Date</Text>
                <TouchableOpacity
                  style={[styles.pickerBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                  onPress={() => setShowDatePicker(true)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pickerText, { color: date ? colors.text : colors.textSecondary }]}>
                    {formatDateDisplay(date)}
                  </Text>
                  <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Start & End Time Picker Triggers */}
              <View style={styles.row}>
                <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={[styles.label, { color: colors.text }]}>Start Time</Text>
                  <TouchableOpacity
                    style={[styles.pickerBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                    onPress={() => setShowStartTimePicker(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.pickerText, { color: startTime ? colors.text : colors.textSecondary }]}>
                      {formatTimeDisplay(startTime)}
                    </Text>
                    <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={[styles.label, { color: colors.text }]}>End Time</Text>
                  <TouchableOpacity
                    style={[styles.pickerBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                    onPress={() => setShowEndTimePicker(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.pickerText, { color: endTime ? colors.text : colors.textSecondary }]}>
                      {formatTimeDisplay(endTime)}
                    </Text>
                    <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Session Type</Text>
                <View style={styles.tabSelectorContainer}>
                  <TouchableOpacity
                    style={[
                      styles.selectorTab,
                      sessionType === 'online'
                        ? { backgroundColor: colors.brand, borderColor: colors.brand }
                        : { backgroundColor: colors.inputBg, borderColor: colors.border },
                    ]}
                    onPress={() => setSessionType('online')}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="videocam-outline"
                      size={18}
                      color={sessionType === 'online' ? '#FFF' : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.selectorTabText,
                        { color: sessionType === 'online' ? '#FFF' : colors.text },
                      ]}
                    >
                      Virtual
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.selectorTab,
                      sessionType === 'physical'
                        ? { backgroundColor: colors.brand, borderColor: colors.brand }
                        : { backgroundColor: colors.inputBg, borderColor: colors.border },
                    ]}
                    onPress={() => setSessionType('physical')}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="location-outline"
                      size={18}
                      color={sessionType === 'physical' ? '#FFF' : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.selectorTabText,
                        { color: sessionType === 'physical' ? '#FFF' : colors.text },
                      ]}
                    >
                      Physical
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {sessionType === 'physical' ? (
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: colors.text }]}>Venue / Location</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                    placeholder="e.g. Community Center, 123 Main St, Suite 400"
                    placeholderTextColor={colors.textSecondary}
                    value={venue}
                    onChangeText={setVenue}
                    autoCapitalize="sentences"
                  />
                </View>
              ) : null}

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

      {/* Booked Member Name Modal */}
      <Modal
        visible={!!selectedMember}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedMember(null)}
      >
        <View style={styles.memberModalOverlay}>
          <View style={[styles.memberModalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.memberAvatarCircle, { backgroundColor: colors.brandLight }]}>
              <Ionicons name="person" size={28} color={colors.brand} />
            </View>
            <Text style={[styles.memberModalHeading, { color: colors.textSecondary }]}>Booked Member</Text>
            <Text style={[styles.memberModalName, { color: colors.text, fontFamily: Fonts.rounded || 'System' }]}>
              {selectedMember}
            </Text>

            <TouchableOpacity
              style={[styles.memberModalCloseBtn, { backgroundColor: colors.brand }]}
              onPress={() => setSelectedMember(null)}
              activeOpacity={0.8}
            >
              <Text style={styles.memberModalCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <DateTimePicker
          value={getDateObj(date)}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
          minimumDate={new Date()}
        />
      )}

      {/* Start Time Picker Modal */}
      {showStartTimePicker && (
        <DateTimePicker
          value={getTimeObj(startTime)}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onStartTimeChange}
        />
      )}

      {/* End Time Picker Modal */}
      {showEndTimePicker && (
        <DateTimePicker
          value={getTimeObj(endTime)}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onEndTimeChange}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 14,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    paddingHorizontal: 18,
    height: 48,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  searchIcon: {
    marginLeft: 8,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 90,
    gap: 12,
  },
  accordionCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeaderLeft: {
    flex: 1,
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  cardBody: {
    marginTop: 8,
  },
  cardDivider: {
    height: 1,
    marginBottom: 12,
    marginTop: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailIcon: {
    width: 26,
    marginRight: 6,
  },
  detailText: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  linkText: {
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  meetingLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 14,
    marginTop: 6,
  },
  actionIconBtn: {
    padding: 4,
  },
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 22,
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
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
  tabSelectorContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  selectorTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderWidth: 1,
    borderRadius: 12,
    gap: 8,
  },
  selectorTabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  memberModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  memberModalCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  memberAvatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  memberModalHeading: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  memberModalName: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
  },
  memberModalCloseBtn: {
    width: '100%',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberModalCloseBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  pickerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  pickerText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
