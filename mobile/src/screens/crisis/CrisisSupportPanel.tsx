import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BRAND } from '../../components/ResourcesChrome';
import { crisisSupportApi, CrisisEntry, PersonalCrisisContact } from '../../services/crisisSupport';
import { Coordinates } from '../../services/location';

type Props = {
  coords: Coordinates | null;
};

const callNumber = (phone?: string) => {
  if (!phone) return;
  Linking.openURL(`tel:${phone.replace(/\s/g, '')}`);
};

const textNumber = (phone?: string) => {
  if (!phone) return;
  Linking.openURL(`sms:${phone.replace(/\s/g, '')}`);
};

export function CrisisSupportPanel({ coords }: Props) {
  const [helplines, setHelplines] = useState<CrisisEntry[]>([]);
  const [contacts, setContacts] = useState<PersonalCrisisContact[]>([]);
  const [emergencyNumber, setEmergencyNumber] = useState<string | null>(null);
  const [headline, setHeadline] = useState('If you are in immediate danger, contact emergency services now.');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [help, personal] = await Promise.all([
        crisisSupportApi.helpNow(coords?.latitude, coords?.longitude),
        crisisSupportApi.personalContacts().catch(() => ({ items: [] as PersonalCrisisContact[] })),
      ]);
      setHelplines(help.helplines || []);
      setHeadline(help.guidance?.headline || 'If you are in immediate danger, contact emergency services now.');
      setEmergencyNumber(help.guidance?.emergencyNumber || null);
      setContacts(personal.items || []);
    } catch {
      try {
        const lines = await crisisSupportApi.helplines();
        setHelplines(lines.items || []);
      } catch {
        setHelplines([]);
      }
    }
  }, [coords?.latitude, coords?.longitude]);

  useEffect(() => {
    load();
  }, [load]);

  const handleHelpNow = () => {
    const target = emergencyNumber || helplines.find((item) => item.isEmergency)?.phone || helplines[0]?.phone;
    if (!target) {
      Alert.alert('Help Now', 'No emergency number is available yet. Please add helplines in the directory.');
      return;
    }
    callNumber(target);
  };

  const addContact = async () => {
    if (!name.trim() || !phone.trim()) {
      setError('Name and phone are required');
      return;
    }
    try {
      setError('');
      const data = await crisisSupportApi.addPersonalContact({
        name: name.trim(),
        phone: phone.trim(),
        relationship: relationship.trim(),
      });
      setContacts(data.items || []);
      setName('');
      setPhone('');
      setRelationship('');
    } catch (err: any) {
      setError(err.message || 'Could not save contact');
    }
  };

  const removeContact = (contact: PersonalCrisisContact) => {
    const run = async () => {
      const data = await crisisSupportApi.removePersonalContact(contact._id);
      setContacts(data.items || []);
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`Remove ${contact.name}?`)) run();
      return;
    }
    Alert.alert('Remove contact', `Remove ${contact.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: run },
    ]);
  };

  return (
    <View>
      <View style={styles.sos}>
        <View style={styles.heart}>
          <Ionicons name="heart" size={28} color={BRAND} />
        </View>
        <Text style={styles.sosTitle}>Are you safe?</Text>
        <Text style={styles.sosCopy}>{headline}</Text>
        <TouchableOpacity style={styles.helpNow} onPress={handleHelpNow} activeOpacity={0.85}>
          <Text style={styles.helpNowText}>HELP NOW</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.section}>Your Crisis Contacts</Text>
      {contacts.map((contact) => (
        <View key={contact._id} style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{contact.name}</Text>
            <Text style={styles.rowMeta}>{contact.relationship || 'Personal contact'} · {contact.phone}</Text>
          </View>
          <TouchableOpacity style={styles.call} onPress={() => callNumber(contact.phone)}>
            <Ionicons name="call" size={14} color="#FFFFFF" />
            <Text style={styles.callText}>Call</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => removeContact(contact)} style={styles.iconBtn}>
            <Ionicons name="trash-outline" size={18} color="#BA1A1A" />
          </TouchableOpacity>
        </View>
      ))}
      <View style={styles.addBox}>
        <TextInput value={name} onChangeText={setName} placeholder="Name (Mom, Dr. Smith)" placeholderTextColor="#8B949E" style={styles.input} />
        <TextInput value={relationship} onChangeText={setRelationship} placeholder="Relationship" placeholderTextColor="#8B949E" style={styles.input} />
        <TextInput value={phone} onChangeText={setPhone} placeholder="Phone number" placeholderTextColor="#8B949E" style={styles.input} keyboardType="phone-pad" />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TouchableOpacity style={styles.secondary} onPress={addContact}>
          <Text style={styles.secondaryText}>Add contact</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.section}>24/7 Helplines</Text>
      {helplines.length === 0 ? <Text style={styles.empty}>No helplines have been published yet.</Text> : null}
      {helplines.map((line) => {
        const isText = /text|sms/i.test(`${line.name} ${line.description || ''}`);
        return (
          <View key={line._id} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{line.name}</Text>
              <Text style={styles.rowMeta}>{line.description || line.phone}</Text>
            </View>
            <TouchableOpacity
              style={styles.call}
              onPress={() => (isText ? textNumber(line.phone) : callNumber(line.phone))}
            >
              <Ionicons name={isText ? 'chatbubble' : 'call'} size={14} color="#FFFFFF" />
              <Text style={styles.callText}>{isText ? 'Text' : 'Call'}</Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  sos: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E7ECF1',
    alignItems: 'center',
    marginBottom: 22,
  },
  heart: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E7F1F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  sosTitle: { fontSize: 22, fontWeight: '800', color: '#1C242C' },
  sosCopy: { color: '#6B7380', textAlign: 'center', marginTop: 6, marginBottom: 16, lineHeight: 20 },
  helpNow: { backgroundColor: BRAND, borderRadius: 24, paddingVertical: 12, paddingHorizontal: 28, minWidth: 180, alignItems: 'center' },
  helpNowText: { color: '#FFFFFF', fontWeight: '800', letterSpacing: 0.8 },
  section: { fontSize: 18, fontWeight: '800', color: '#1C242C', marginBottom: 10, marginTop: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E7ECF1',
    marginBottom: 10,
    gap: 8,
  },
  rowTitle: { fontSize: 15, fontWeight: '800', color: '#1C242C' },
  rowMeta: { color: '#6B7380', marginTop: 3, fontSize: 13 },
  call: { backgroundColor: BRAND, borderRadius: 18, paddingVertical: 8, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  callText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  iconBtn: { padding: 6 },
  addBox: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#E7ECF1', marginBottom: 18 },
  input: { borderWidth: 1, borderColor: '#E7ECF1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8, color: '#1C242C' },
  secondary: { alignItems: 'center', paddingVertical: 10 },
  secondaryText: { color: BRAND, fontWeight: '800' },
  error: { color: '#BA1A1A', marginBottom: 8 },
  empty: { color: '#6B7380', marginBottom: 12 },
});
