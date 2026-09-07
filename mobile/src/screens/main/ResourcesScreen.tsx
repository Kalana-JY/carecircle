
};

export default function ResourcesScreen() {
  const { user } = useAuth();
  const [panelOpen, setPanelOpen] = useState(false);

      </ScrollView>
      <SidePanel isOpen={panelOpen} onClose={() => setPanelOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F7FB' },

  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E7ECF1' },
  icon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E7F1F8', alignItems: 'center', justifyContent: 'center' },
  type: { fontSize: 10, fontWeight: '800', color: '#8B949E', marginBottom: 2 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#1C242C' },
  meta: { color: '#6B7380', marginTop: 4, fontSize: 13 },
});
