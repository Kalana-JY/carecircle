import React, { useCallback, useEffect, useState } from 'react';
import { Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BRAND } from '../../components/ResourcesChrome';
import { crisisSupportApi, CrisisEntry } from '../../services/crisisSupport';
import { Coordinates, formatAvailability, formatDistanceKm, typeLabel } from '../../services/location';

type Props = {
  coords: Coordinates | null;
};

const callNumber = (phone?: string) => {
  if (!phone) return;
  Linking.openURL(`tel:${phone.replace(/\s/g, '')}`);
};

export function CrisisDirectoryPanel({ coords }: Props) {
  const [items, setItems] = useState<CrisisEntry[]>([]);
  const [locationLabel, setLocationLabel] = useState('Finding nearby support...');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (coords) {
        const nearby = await crisisSupportApi.nearby(coords.latitude, coords.longitude);
        const list = nearby.items || [];
        setItems(list);
        const city = list.find((item) => item.city)?.city;
        setLocationLabel(city || 'Near your current location');
      } else {
        const data = await crisisSupportApi.list({ type: 'hospital,counselor,organization' });
        setItems(data.items || []);
        setLocationLabel('Turn on location to see nearby services');
      }
    } catch {
      setItems([]);
      setLocationLabel('Support services');
    } finally {
      setLoading(false);
    }
  }, [coords]);

  useEffect(() => {
    load();
  }, [load]);

  const openDirections = async (entry: CrisisEntry) => {
    try {
      const data = await crisisSupportApi.directions(entry._id, coords?.latitude, coords?.longitude);
      const url = Platform.OS === 'ios' ? data.appleMapsUrl : data.googleMapsUrl;
      await Linking.openURL(url);
    } catch {
      if (entry.address) {
        await Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(entry.address)}`);
      }
    }
  };

  const toggleSave = async (entry: CrisisEntry) => {
    try {
      const data = await crisisSupportApi.toggleSave(entry._id);
      setItems((current) => current.map((item) => (
        item._id === entry._id ? { ...item, saved: data.saved } : item
      )));
    } catch {
      // Saving requires a signed-in session
    }
  };

  return (
    <View>
      <View style={styles.locationRow}>
        <Ionicons name="location-outline" size={16} color={BRAND} />
        <Text style={styles.location}>{locationLabel}</Text>
      </View>
      <Text style={styles.title}>Nearby support</Text>
      <Text style={styles.subtitle}>Hospitals, counselors, and mental health organizations close to you.</Text>
      {loading ? <Text style={styles.subtitle}>Loading directory...</Text> : null}
      {!loading && items.length === 0 ? <Text style={styles.empty}>No nearby services found yet.</Text> : null}
      {items.map((item) => (
        <View key={item._id} style={styles.card}>
          <View style={styles.cardTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                {typeLabel(item.type)} · {formatAvailability(item)}
              </Text>
            </View>
            {item.distanceKm != null ? <Text style={styles.distance}>{formatDistanceKm(item.distanceKm)}</Text> : null}
            <TouchableOpacity onPress={() => toggleSave(item)} style={styles.saveBtn}>
              <Ionicons name={item.saved ? 'bookmark' : 'bookmark-outline'} size={18} color={BRAND} />
            </TouchableOpacity>
          </View>
          {item.address ? <Text style={styles.address}>{item.address}</Text> : null}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.call} onPress={() => callNumber(item.phone)} disabled={!item.phone}>
              <Ionicons name="call" size={14} color="#FFFFFF" />
              <Text style={styles.callText}>Call Now</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.directions} onPress={() => openDirections(item)}>
              <Ionicons name="navigate-outline" size={14} color="#1C242C" />
              <Text style={styles.directionsText}>Directions</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  location: { color: '#6B7380', fontWeight: '700' },
  title: { fontSize: 24, fontWeight: '800', color: '#1C242C' },
  subtitle: { color: '#6B7380', marginTop: 4, marginBottom: 16 },
  empty: { color: '#6B7380', marginTop: 8 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E7ECF1',
    marginBottom: 12,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  name: { fontSize: 16, fontWeight: '800', color: '#1C242C' },
  meta: { color: '#6B7380', marginTop: 3, fontSize: 13 },
  distance: { color: BRAND, fontWeight: '800', fontSize: 12 },
  saveBtn: { padding: 4 },
  address: { color: '#6B7380', marginTop: 8, fontSize: 13 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  call: {
    flex: 1,
    backgroundColor: BRAND,
    borderRadius: 20,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  callText: { color: '#FFFFFF', fontWeight: '800' },
  directions: {
    flex: 1,
    backgroundColor: '#EEF2F6',
    borderRadius: 20,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  directionsText: { color: '#1C242C', fontWeight: '800' },
});
