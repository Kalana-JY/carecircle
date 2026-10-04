import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { BRAND } from '../../components/ResourcesChrome';
import { MentalHealthResource, ResourcePayload, ResourceType, resourceApi, resourceTypeLabel } from '../../services/resources';

const TYPES: ResourceType[] = ['article', 'video', 'self-help-guide'];

const emptyForm = (): ResourcePayload => ({
  title: '',
  type: 'article',
  description: '',
  content: '',
  url: '',
  category: '',
  topics: [],
  isPublished: true,
});

type Props = {
  onChanged?: () => void;
};

export function ResourceAdminPanel({ onChanged }: Props) {
  const [items, setItems] = useState<MentalHealthResource[]>([]);
  const [form, setForm] = useState<ResourcePayload>(emptyForm());
  const [topicsText, setTopicsText] = useState('');
  const [stepsText, setStepsText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await resourceApi.list({ includeUnpublished: true });
      setItems(data.items || []);
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const reset = () => {
    setForm(emptyForm());
    setTopicsText('');
    setStepsText('');
    setEditingId(null);
    setError('');
  };

  const save = async () => {
    const topics = topicsText.split(',').map((item) => item.trim()).filter(Boolean);
    const steps = stepsText.split('\n').map((line) => line.trim()).filter(Boolean).map((line, index) => {
      const [title, ...rest] = line.split(':');
      return { title: title.trim(), body: rest.join(':').trim(), order: index + 1 };
    });
    const payload: ResourcePayload = {
      ...form,
      title: form.title.trim(),
      description: form.description?.trim(),
      content: form.content?.trim(),
      url: form.url?.trim(),
      category: form.category?.trim(),
      topics,
      steps: form.type === 'self-help-guide' ? steps : undefined,
    };

    if (!payload.title) {
      setError('Title is required');
      return;
    }
    if (payload.type === 'video' && !payload.url) {
      setError('A video URL is required');
      return;
    }
    if (payload.type === 'article' && !payload.content && !payload.url) {
      setError('Articles need content or a URL');
      return;
    }
    if (payload.type === 'self-help-guide' && !payload.content && !steps.length) {
      setError('Self-help guides need content or at least one step');
      return;
    }

    try {
      setSaving(true);
      setError('');
      if (editingId) {
        await resourceApi.update(editingId, payload);
        setNotice('Resource updated');
      } else {
        await resourceApi.create(payload);
        setNotice('Resource created');
      }
      reset();
      await load();
      onChanged?.();
    } catch (saveError: any) {
      setNotice('');
      setError(saveError.message || 'Unable to save resource.');
    } finally {
      setSaving(false);
    }
  };

  const edit = async (item: MentalHealthResource) => {
    try {
      const detail = await resourceApi.get(item._id);
      setEditingId(detail._id);
      setForm({
        title: detail.title,
        type: (TYPES.includes(detail.type as ResourceType) ? detail.type : 'article') as ResourceType,
        description: detail.description || '',
        content: detail.content || '',
        url: detail.url || '',
        category: detail.category || '',
        isPublished: detail.isPublished !== false,
      });
      setTopicsText((detail.topics || []).join(', '));
      setStepsText((detail.steps || []).map((step) => `${step.title}${step.body ? `: ${step.body}` : ''}`).join('\n'));
      setError('');
      setNotice('');
    } catch (loadError: any) {
      setError(loadError.message || 'Unable to open that resource for editing.');
    }
  };

  const remove = (item: MentalHealthResource) => {
    const run = async () => {
      try {
        await resourceApi.remove(item._id);
        if (editingId === item._id) reset();
        setNotice('Resource deleted');
        await load();
        onChanged?.();
      } catch (deleteError: any) {
        setError(deleteError.message || 'Unable to delete resource.');
      }
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`Delete ${item.title}?`)) run();
      return;
    }
    Alert.alert('Delete resource', `Delete ${item.title}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: run },
    ]);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{editingId ? 'Update resource' : 'Add new resource'}</Text>
      <Text style={styles.subtitle}>Add a title, type, category, and link. Articles and guides can also include written steps.</Text>
      <TextInput value={form.title} onChangeText={(title) => setForm((current) => ({ ...current, title }))} placeholder="Title" placeholderTextColor="#8B949E" style={styles.input} />
      <View style={styles.row}>
        {TYPES.map((value) => (
          <TouchableOpacity key={value} onPress={() => setForm((current) => ({ ...current, type: value }))} style={[styles.chip, form.type === value && styles.chipOn]}>
            <Text style={[styles.chipText, form.type === value && styles.chipTextOn]}>{resourceTypeLabel(value)}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput value={form.category} onChangeText={(category) => setForm((current) => ({ ...current, category }))} placeholder="Category" placeholderTextColor="#8B949E" style={styles.input} />
      <TextInput value={topicsText} onChangeText={setTopicsText} placeholder="Topics, separated by commas" placeholderTextColor="#8B949E" style={styles.input} />
      <TextInput value={form.description} onChangeText={(description) => setForm((current) => ({ ...current, description }))} placeholder="Description" placeholderTextColor="#8B949E" style={[styles.input, styles.tall]} multiline />
      <TextInput value={form.url} onChangeText={(url) => setForm((current) => ({ ...current, url }))} placeholder="URL" placeholderTextColor="#8B949E" style={styles.input} autoCapitalize="none" />
      <TextInput value={form.content} onChangeText={(content) => setForm((current) => ({ ...current, content }))} placeholder="Article or guide content" placeholderTextColor="#8B949E" style={[styles.input, styles.tall]} multiline />
      {form.type === 'self-help-guide' ? (
        <TextInput value={stepsText} onChangeText={setStepsText} placeholder={'Steps, one per line\nPause: Put both feet on the floor'} placeholderTextColor="#8B949E" style={[styles.input, styles.tall]} multiline />
      ) : null}
      <TouchableOpacity onPress={() => setForm((current) => ({ ...current, isPublished: !current.isPublished }))} style={styles.publish}>
        <Text style={styles.chipText}>{form.isPublished ? 'Published' : 'Draft'}</Text>
      </TouchableOpacity>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      <View style={styles.row}>
        <TouchableOpacity style={styles.primary} onPress={save} disabled={saving}>
          <Text style={styles.primaryText}>{saving ? 'Saving...' : editingId ? 'Update resource' : 'Create resource'}</Text>
        </TouchableOpacity>
        {editingId ? (
          <TouchableOpacity style={styles.secondary} onPress={reset}>
            <Text style={styles.secondaryText}>Cancel</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <Text style={styles.section}>Existing resources</Text>
      {items.length === 0 ? <Text style={styles.subtitle}>No resources yet.</Text> : null}
      {items.map((item) => (
        <View key={item._id} style={styles.card}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.meta}>{resourceTypeLabel(item.type)}{item.isPublished === false ? ' · Draft' : ''}</Text>
          </View>
          <TouchableOpacity onPress={() => edit(item)}><Text style={styles.link}>Edit</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => remove(item)}><Text style={styles.delete}>Delete</Text></TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingBottom: 12 },
  title: { fontSize: 22, fontWeight: '800', color: '#1C242C' },
  subtitle: { color: '#6B7380', marginTop: 4, marginBottom: 12, lineHeight: 20 },
  section: { fontSize: 18, fontWeight: '800', color: '#1C242C', marginTop: 8, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#E7ECF1', borderRadius: 12, padding: 12, marginBottom: 8, color: '#1C242C', backgroundColor: '#FFFFFF' },
  tall: { minHeight: 72, textAlignVertical: 'top' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { borderRadius: 16, borderWidth: 1, borderColor: '#D7E2EA', paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#FFFFFF' },
  chipOn: { backgroundColor: BRAND, borderColor: BRAND },
  chipText: { color: '#3E4A56', fontWeight: '700', fontSize: 12 },
  chipTextOn: { color: '#FFFFFF' },
  publish: { alignSelf: 'flex-start', marginBottom: 8 },
  primary: { backgroundColor: BRAND, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16 },
  primaryText: { color: '#FFFFFF', fontWeight: '800' },
  secondary: { borderWidth: 1, borderColor: '#D7E2EA', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, backgroundColor: '#FFFFFF' },
  secondaryText: { color: '#1C242C', fontWeight: '800' },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E7ECF1' },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#1C242C' },
  meta: { color: '#6B7380', marginTop: 4, fontSize: 13 },
  link: { color: BRAND, fontWeight: '800' },
  delete: { color: '#BA1A1A', fontWeight: '800' },
  error: { color: '#BA1A1A', marginBottom: 8 },
  notice: { color: '#3E6658', marginBottom: 8, fontWeight: '700' },
});
