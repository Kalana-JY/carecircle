import { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ResourcesChrome, ResourceHubTab } from '../../components/ResourcesChrome';
import { CrisisAdminPanel } from '../crisis/CrisisAdminPanel';
import { CrisisDirectoryPanel } from '../crisis/CrisisDirectoryPanel';
import { CrisisSavedPanel } from '../crisis/CrisisSavedPanel';
import { CrisisSupportPanel } from '../crisis/CrisisSupportPanel';
import { ResourceAdminPanel } from '../resources/ResourceAdminPanel';
import { ResourceLibraryPanel } from '../resources/ResourceLibraryPanel';
import { Coordinates, getCurrentCoordinates } from '../../services/location';

const SECTION: Record<ResourceHubTab, string> = {
  home: 'RESOURCES',
  support: 'CRISIS SUPPORT',
  directory: 'DIRECTORY',
  saved: 'SAVED',
  admin: 'ADMIN',
};

export default function ResourcesScreen() {
  const navigation = useNavigation<any>();
  const [tab, setTab] = useState<ResourceHubTab>('home');
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    getCurrentCoordinates().then(setCoords);
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ResourcesChrome
        activeTab={tab}
        onTabChange={setTab}
        onAvatarPress={() => navigation.navigate('Profile')}
        sectionTitle={SECTION[tab]}
      />
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={(
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              setCoords(await getCurrentCoordinates());
              setRefreshKey((value) => value + 1);
              setRefreshing(false);
            }}
          />
        )}
      >
        {tab === 'home' ? <ResourceLibraryPanel refreshKey={refreshKey} /> : null}
        {tab === 'support' ? <View style={styles.pad}><CrisisSupportPanel coords={coords} /></View> : null}
        {tab === 'directory' ? <View style={styles.pad}><CrisisDirectoryPanel coords={coords} /></View> : null}
        {tab === 'saved' ? (
          <>
            <ResourceLibraryPanel mode="bookmarks" refreshKey={refreshKey} />
            <View style={styles.pad}><CrisisSavedPanel /></View>
          </>
        ) : null}
        {tab === 'admin' ? (
          <>
            <ResourceAdminPanel onChanged={() => setRefreshKey((value) => value + 1)} />
            <View style={styles.pad}><CrisisAdminPanel /></View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F7FB' },
  body: { flex: 1, backgroundColor: '#F4F7FB' },
  content: { paddingBottom: 32 },
  pad: { paddingHorizontal: 16, paddingBottom: 16 },
});
