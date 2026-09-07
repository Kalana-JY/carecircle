import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BRAND } from '../../components/ResourcesChrome';
import { crisisSupportApi, CrisisEntry, CrisisEntryPayload, CrisisEntryType } from '../../services/crisisSupport';
import { typeLabel } from '../../services/location';

const TYPES: CrisisEntryType[] = ['hospital', 'counselor', 'organization', 'helpline'];

const emptyForm = (): CrisisEntryPayload => ({
  name: '',
  type: 'helpline',
  phone: '',
  website: '',
  address: '',
  city: '',
  hours: '',
  description: '',
  is24Hours: false,
  isEmergency: false,
  latitude: undefined,
  longitude: undefined,
});

export function CrisisAdminPanel() {
  const [items, setItems] = useState<CrisisEntry[]>([]);
  const [form, setForm] = useState<CrisisEntryPayload>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await crisisSupportApi.list({ includeUnpublished: true });
      setItems(data.items || []);
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setField = (key: keyof CrisisEntryPayload, value: CrisisEntryPayload[keyof CrisisEntryPayload]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const startEdit = (entry: CrisisEntry) => {
    setEditingId(entry._id);
    setForm({
      name: entry.name,
      type: entry.type,
      phone: entry.phone || '',
      website: entry.website || '',
      address: entry.address || '',
      city: entry.city || '',
      hours: entry.hours || '',
      description: entry.description || '',
      is24Hours: Boolean(entry.is24Hours),
      isEmergency: Boolean(entry.isEmergency),
      latitude: entry.latitude ?? undefined,
      longitude: entry.longitude ?? undefined,
    });
  };

  const reset = () => {
    setEditingId(null);
    setForm(emptyForm());
    setError('');
  };

  const save = async () => {
    const name = form.name.trim() || [typeLabel(form.type), form.phone?.trim()].filter(Boolean).join(' ');
    if (!name) {
      setError('Title is required');
      return;
    }
    if (form.type === 'helpline' && !form.phone?.trim()) {
      setError('Phone is required for a helpline');
      return;
    }
    setSaving(true);
    setError('');
    const website = form.website?.trim()
      ? (/^https?:\/\//i.test(form.website.trim()) ? form.website.trim() : `https://${form.website.trim()}`)
      : undefined;
    const payload: CrisisEntryPayload = {
      name,
      type: form.type,
      website,
      phone: form.phone?.trim() || undefined,
      address: form.address?.trim() || undefined,
      city: form.city?.trim() || undefined,
      hours: form.hours?.trim() || undefined,
      description: form.description?.trim() || undefined,
      is24Hours: Boolean(form.is24Hours),
      isEmergency: Boolean(form.isEmergency),
      latitude: form.latitude === undefined || form.latitude === null || Number.isNaN(Number(form.latitude)) ? undefined : Number(form.latitude),
      longitude: form.longitude === undefined || form.longitude === null || Number.isNaN(Number(form.longitude)) ? undefined : Number(form.longitude),
    };
    try {
      if (editingId) {
        await crisisSupportApi.update(editingId, payload);
      } else {
        await crisisSupportApi.create(payload);
      }
      reset();
      await load();
    } catch (err: any) {
      const message = err?.message || 'Could not save directory entry';
      if (/fetch|network/i.test(message)) {
        setError('Cannot reach the API. Keep the backend running, then try again.');
      } else {
        setError(message);
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = (entry: CrisisEntry) => {
    const run = async () => {
      await crisisSupportApi.remove(entry._id);
      if (editingId === entry._id) reset();
      await load();
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`Delete ${entry.name}?`)) run();
      return;
    }
    Alert.alert('Delete entry', `Delete ${entry.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: run },
    ]);
  };

  return (
    <View>
      <Text style={styles.crumb}>RESOURCES &gt; DIRECTORY</Text>
      <Text style={styles.title}>{editingId ? 'Update directory entry' : 'Add directory entry'}</Text>
      <View style={styles.form}>
        <View style={styles.chips}>
          {TYPES.map((type) => (
            <TouchableOpacity
              key={type}
              onPress={() => setField('type', type)}
              style={[styles.chip, form.type === type && styles.chipActive]}
            >
              <Text style={[styles.chipText, form.type === type && styles.chipTextActive]}>{typeLabel(type)}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput value={form.name} onChangeText={(value) => setField('name', value)} placeholder="Title (required) e.g. National Mental Health Helpline" placeholderTextColor="#8B949E" style={styles.input} />
        <TextInput value={form.phone} onChangeText={(value) => setField('phone', value)} placeholder="Phone" placeholderTextColor="#8B949E" style={styles.input} />
        <TextInput value={form.website} onChangeText={(value) => setField('website', value)} placeholder="Link / URL (optional, e.g. https://example.com)" placeholderTextColor="#8B949E" style={styles.input} autoCapitalize="none" />
        <TextInput value={form.address} onChangeText={(value) => setField('address', value)} placeholder="Address" placeholderTextColor="#8B949E" style={styles.input} />
        <TextInput value={form.city} onChangeText={(value) => setField('city', value)} placeholder="City / category area" placeholderTextColor="#8B949E" style={styles.input} />
        <TextInput value={form.hours} onChangeText={(value) => setField('hours', value)} placeholder="Hours (e.g. Closes at 8PM)" placeholderTextColor="#8B949E" style={styles.input} />
        <View style={styles.coordRow}>
          <TextInput
            value={form.latitude == null ? '' : String(form.latitude)}
            onChangeText={(value) => setField('latitude', value ? Number(value) : undefined)}
            placeholder="Latitude"
            placeholderTextColor="#8B949E"
            style={[styles.input, styles.half]}
            keyboardType="numeric"
          />
          <TextInput
            value={form.longitude == null ? '' : String(form.longitude)}
            onChangeText={(value) => setField('longitude', value ? Number(value) : undefined)}
            placeholder="Longitude"
            placeholderTextColor="#8B949E"
            style={[styles.input, styles.half]}
            keyboardType="numeric"
          />
        </View>
        <View style={styles.flags}>
          <TouchableOpacity onPress={() => setField('is24Hours', !form.is24Hours)} style={[styles.flag, form.is24Hours && styles.flagActive]}>
            <Text style={[styles.flagText, form.is24Hours && styles.flagTextActive]}>Open 24/7</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setField('isEmergency', !form.isEmergency)} style={[styles.flag, form.isEmergency && styles.flagActive]}>
            <Text style={[styles.flagText, form.isEmergency && styles.flagTextActive]}>Emergency</Text>
          </TouchableOpacity>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TouchableOpacity style={styles.primary} onPress={save} disabled={saving}>
          <Text style={styles.primaryText}>{editingId ? 'Update Resource' : 'Add Resource'}</Text>
        </TouchableOpacity>
        {editingId ? (
          <TouchableOpacity onPress={reset} style={styles.cancel}>
            <Text style={styles.cancelText}>Cancel edit</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {items.map((item) => (
        <View key={item._id} style={styles.card}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <View style={styles.tags}>
              <Text style={styles.tag}>{typeLabel(item.type)}</Text>
              {item.city ? <Text style={styles.tag}>{item.city}</Text> : null}
              {item.isEmergency ? <Text style={styles.tag}>Emergency</Text> : null}
            </View>
          </View>
          <TouchableOpacity onPress={() => startEdit(item)} style={styles.iconBtn}>
            <Ionicons name="pencil-outline" size={18} color={BRAND} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => remove(item)} style={styles.iconBtn}>
            <Ionicons name="trash-outline" size={18} color="#BA1A1A" />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  crumb: { color: '#8B949E', fontWeight: '800', fontSize: 11, letterSpacing: 0.8, marginBottom: 6 },
  title: { fontSize: 22, fontWeight: '800', color: '#1C242C', marginBottom: 12 },
  form: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E7ECF1', marginBottom: 18 },
  input: { borderWidth: 1, borderColor: '#E7ECF1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8, color: '#1C242C' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  chip: { borderWidth: 1, borderColor: '#E7ECF1', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6 },
  chipActive: { backgroundColor: BRAND, borderColor: BRAND },
  chipText: { color: '#6B7380', fontWeight: '700', fontSize: 12 },
  chipTextActive: { color: '#FFFFFF' },
  coordRow: { flexDirection: 'row', gap: 8 },
  half: { flex: 1 },
  flags: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  flag: { borderWidth: 1, borderColor: '#E7ECF1', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6 },
  flagActive: { backgroundColor: '#E7F1F8', borderColor: BRAND },
  flagText: { color: '#6B7380', fontWeight: '700', fontSize: 12 },
  flagTextActive: { color: BRAND },
  primary: { backgroundColor: BRAND, borderRadius: 22, paddingVertical: 12, alignItems: 'center' },
  primaryText: { color: '#FFFFFF', fontWeight: '800' },
  cancel: { alignItems: 'center', paddingTop: 10 },
  cancelText: { color: '#6B7380', fontWeight: '700' },
  error: { color: '#BA1A1A', marginBottom: 8 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E7ECF1',
    marginBottom: 10,
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#1C242C', marginBottom: 6 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { backgroundColor: '#EEF2F6', color: '#6B7380', fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, overflow: 'hidden' },
  iconBtn: { padding: 8 },
});
