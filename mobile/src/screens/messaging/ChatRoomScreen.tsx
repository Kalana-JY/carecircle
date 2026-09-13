import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  Alert,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '@/services/api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  connectSocket,
  getSocket,
  onMessage,
  onTyping,
  onStopTyping,
  onMessagesRead,
  sendMessage,
  emitTyping,
  emitStopTyping,
  emitMarkRead,
  joinConversation,
  MessagePayload,
} from '@/services/socket';
import { useAuth } from '@/store/AuthContext';
import { timeAgo } from '@/services/format';

const BRAND = '#245B8B';

export default function ChatRoomScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();
  const isDark = useColorScheme() === 'dark';
  const { conversationId, title } = route.params as { conversationId: string; title: string };

  const myId = user?._id ?? '';

  const colors = {
    background: isDark ? '#121212' : '#F5F7FA',
    card: isDark ? '#1E1E1E' : '#FFFFFF',
    text: isDark ? '#ECEDEE' : '#1C2024',
    textSecondary: isDark ? '#9BA1A6' : '#687076',
    border: isDark ? '#2E2E2E' : '#E6E8EB',
    brand: BRAND,
    brandLight: isDark ? '#1E3A5F' : '#E8F1F9',
    inputBg: isDark ? '#1A1A1A' : '#F0F2F5',
    myBubble: BRAND,
    theirBubble: isDark ? '#1E1E1E' : '#FFFFFF',
  };

  const [messages, setMessages] = useState<MessagePayload[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isTyping, setIsTyping] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);
  const cleanupFnsRef = useRef<(() => void)[]>([]);
  const mountedRef = useRef(true);

  const loadMessages = useCallback(async () => {
    try {
      const data = await apiFetch(`/api/conversations/${conversationId}/messages?limit=100`);
      if (mountedRef.current) {
        setMessages(data.items ?? []);
      }
    } catch (error: any) {
      if (mountedRef.current) {
        Alert.alert('Error', error.message || 'Failed to load messages');
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [conversationId]);

  useEffect(() => {
    mountedRef.current = true;

    const setup = async () => {
      try {
        const sock = await connectSocket();
        if (!mountedRef.current) return;
        setConnected(true);

        joinConversation(conversationId);

        cleanupFnsRef.current.forEach((fn) => fn());
        cleanupFnsRef.current = [];

        cleanupFnsRef.current.push(
          onMessage((msg) => {
            if (msg.conversationId !== conversationId || !mountedRef.current) return;
            const senderStr = String(msg.senderId);
            const myStr = String(myId);
            const isMine = senderStr === myStr;
            console.log(`[ChatRoom] msg senderId=${senderStr} myId=${myStr} isMine=${isMine}`);
            setMessages((prev) => [...prev, { ...msg, isMine }]);
          }),
          onTyping((data) => {
            if (data.conversationId === conversationId && String(data.userId) !== myId && mountedRef.current) {
              setIsTyping(data.userName);
            }
          }),
          onStopTyping((data) => {
            if (data.conversationId === conversationId && mountedRef.current) {
              setIsTyping(null);
            }
          }),
          onMessagesRead((data) => {
            if (data.conversationId === conversationId && mountedRef.current) {
              setMessages((prev) =>
                prev.map((m) =>
                  !m.isMine && !m.readBy.includes(data.userId)
                    ? { ...m, readBy: [...m.readBy, data.userId] }
                    : m
                )
              );
            }
          })
        );

        await loadMessages();
        emitMarkRead(conversationId);
      } catch (err) {
        console.error('[ChatRoom] Socket setup error:', err);
      }
    };

    setup();

    const sock = getSocket();
    const onReconnect = () => {
      joinConversation(conversationId);
      loadMessages();
    };
    sock?.on('reconnect', onReconnect);

    return () => {
      mountedRef.current = false;
      sock?.off('reconnect', onReconnect);
      cleanupFnsRef.current.forEach((fn) => fn());
      cleanupFnsRef.current = [];
    };
  }, [conversationId, loadMessages, myId]);

  const handleSend = () => {
    const text = inputText.trim();
    if (!text) return;
    sendMessage(conversationId, text);
    setInputText('');
    emitStopTyping(conversationId);
  };

  const handleTextChange = (text: string) => {
    setInputText(text);
    emitTyping(conversationId);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      emitStopTyping(conversationId);
    }, 2000);
  };

  const renderMessage = ({ item }: { item: MessagePayload }) => {
    const isMine = item.isMine;
    return (
      <View
        style={[
          styles.messageBubble,
          isMine
            ? { backgroundColor: colors.myBubble, alignSelf: 'flex-end', borderBottomRightRadius: 4 }
            : { backgroundColor: colors.theirBubble, alignSelf: 'flex-start', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.border },
        ]}
      >
        {!isMine && (
          <Text style={[styles.senderName, { color: colors.brand }]}>{item.senderName}</Text>
        )}
        <Text style={[styles.messageText, { color: isMine ? '#FFFFFF' : colors.text }]}>
          {item.content}
        </Text>
        <Text style={[styles.messageTime, { color: isMine ? '#D0D0D0' : colors.textSecondary }]}>
          {timeAgo(item.createdAt)}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.brand} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {title}
          </Text>
          {isTyping ? (
            <Text style={[styles.typingText, { color: colors.brand }]}>{isTyping} is typing...</Text>
          ) : connected ? (
            <Text style={[styles.statusText, { color: '#4CAF50' }]}>Online</Text>
          ) : (
            <Text style={[styles.statusText, { color: colors.textSecondary }]}>Connecting...</Text>
          )}
        </View>
        <View style={{ width: 36 }} />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={90}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item._id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={
              <View style={styles.center}>
                <Ionicons name="chatbubbles-outline" size={48} color={colors.textSecondary} style={{ opacity: 0.4 }} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No messages yet. Say hello!
                </Text>
              </View>
            }
          />

          <View style={[styles.inputBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text }]}
              value={inputText}
              onChangeText={handleTextChange}
              placeholder="Type a message..."
              placeholderTextColor={colors.textSecondary}
              multiline
              maxLength={2000}
            />
            <TouchableOpacity
              style={[styles.sendBtn, { opacity: inputText.trim() ? 1 : 0.4 }]}
              onPress={handleSend}
              disabled={!inputText.trim()}
              activeOpacity={0.8}
            >
              <Ionicons name="send" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 8 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  typingText: { fontSize: 12, marginTop: 2 },
  statusText: { fontSize: 11, marginTop: 2, fontWeight: '600' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  messagesList: { padding: 16, paddingBottom: 8, gap: 12 },
  messageBubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  senderName: { fontSize: 11, fontWeight: '700', marginBottom: 2 },
  messageText: { fontSize: 15, lineHeight: 20 },
  messageTime: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 10,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: BRAND,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: { fontSize: 14, marginTop: 12, textAlign: 'center' },
});
