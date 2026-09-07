import React, { useCallback, useEffect, useState } from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BRAND } from '../../components/ResourcesChrome';
import { crisisSupportApi, CrisisEntry } from '../../services/crisisSupport';
import { formatAvailability, typeLabel } from '../../services/location';

const callNumber = (phone?: string) => {
  if (!phone) return;
  Linking.openURL(`tel:${phone.replace(/\s/g, '')}`);
};

export function CrisisSavedPanel() {
  const [items, setItems] = useState<CrisisEntry[]>([]);

  const load = useCallback(async () => {
    try {
      const data = await crisisSupportApi.saved();
      setItems(data.items || []);
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const unsave = async (id: string) => {
    try {
      const data = await crisisSupportApi.toggleSave(id);
      setItems(data.items || []);
    } catch {
      load();
    }
  };

  return (
    <View>
      <Text style={styles.title}>Saved contacts</Text>
      <Text style={styles.subtitle}>Frequently used crisis support numbers, ready when you need them.</Text>
      {items.length === 0 ? <Text style={styles.empty}>You have not saved any crisis contacts yet.</Text> : null}
      {items.map((item) => (
        <View key={item._id} style={styles.card}>
          <View style={{ flex: 1 }}>
            <Text style={styles.type}>{typeLabel(item.type).toUpperCase()}</Text>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>{item.phone || formatAvailability(item)}</Text>
          </View>
          <TouchableOpacity style={styles.call} onPress={() => callNumber(item.phone)}>
            <Ionicons name="call" size={14} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => unsave(item._id)} style={styles.iconBtn}>
            <Ionicons name="bookmark" size={18} color={BRAND} />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '800', color: '#1C242C' },
  subtitle: { color: '#6B7380', marginTop: 4, marginBottom: 16 },
  empty: { color: '#6B7380' },
  card: {
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
  type: { fontSize: 10, fontWeight: '800', color: '#8B949E', marginBottom: 2 },
  name: { fontSize: 15, fontWeight: '800', color: '#1C242C' },
  meta: { color: '#6B7380', marginTop: 3, fontSize: 13 },
  call: { width: 36, height: 36, borderRadius: 18, backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center' },
  iconBtn: { padding: 6 },
});
