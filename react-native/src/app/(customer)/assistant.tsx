import { useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { ApiError } from '../../api/client';
import { chatApi } from '../../api/endpoints';
import type { ChatReply } from '../../api/contracts';
import { ErrorText, Loading, Screen } from '../../components/ui';
import { colors } from '../../theme/colors';

type Message =
  | { id: string; role: 'user'; text: string }
  | { id: string; role: 'assistant'; text: string; kind: string; citations: string[]; rated?: 'UP' | 'DOWN' };

const MAX_LENGTH = 1000;

// Answers come from published restaurant content and are informational only. The assistant cannot place
// orders, reserve tables, take payments or refund; those go through the normal screens.
export default function AssistantScreen() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [startError, setStartError] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);

  // attempt changes only on retry, so the effect below runs once per attempt and never sets state synchronously.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { sessionId: id } = await chatApi.createSession();
        if (alive) setSessionId(id);
      } catch {
        if (alive) setStartError(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [attempt]);

  const retryStart = () => {
    setStartError(false);
    setAttempt((n) => n + 1);
  };

  const send = async () => {
    const text = draft.trim();
    if (!text || !sessionId || busy) return;
    setError('');
    setDraft('');
    setBusy(true);
    const userId = `u-${Date.now()}`;
    setMessages((current) => [...current, { id: userId, role: 'user', text }]);
    try {
      const reply: ChatReply = await chatApi.ask(sessionId, text);
      setMessages((current) => [...current, {
        id: reply.messageId,
        role: 'assistant',
        text: reply.answer,
        kind: reply.kind,
        citations: reply.citations.map((c) => c.title),
      }]);
    } catch (err) {
      setError(err instanceof ApiError && err.status === 429
        ? 'You have sent a lot of messages. Please wait a little.'
        : 'The assistant is unavailable right now. Please ask our staff.');
    } finally {
      setBusy(false);
    }
  };

  const rate = async (message: Extract<Message, { role: 'assistant' }>, rating: 'UP' | 'DOWN') => {
    if (!sessionId || message.rated) return;
    try {
      await chatApi.feedback(sessionId, message.id, rating);
      setMessages((current) => current.map((m) => (m.id === message.id && m.role === 'assistant' ? { ...m, rated: rating } : m)));
    } catch {
      setError('Could not save your feedback.');
    }
  };

  if (!sessionId && !startError) return <Loading />;
  if (startError) {
    return (
      <Screen>
        <View style={{ padding: 24, gap: 12 }}>
          <ErrorText message="The assistant is unavailable right now." />
          <Pressable accessibilityRole="button" onPress={retryStart}>
            <Text style={{ color: colors.gold }}>Try again</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListHeaderComponent={
          <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 8 }}>
            Ask about our menu, opening hours, delivery or policies. Answers come from published restaurant information.
          </Text>
        }
        renderItem={({ item }) =>
          item.role === 'user' ? (
            <View style={{ alignSelf: 'flex-end', maxWidth: '85%', backgroundColor: colors.gold, borderRadius: 14, padding: 10 }}>
              <Text style={{ color: colors.onGold }}>{item.text}</Text>
            </View>
          ) : (
            <View style={{ alignSelf: 'flex-start', maxWidth: '90%', backgroundColor: colors.surface, borderRadius: 14, padding: 12, gap: 8, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ color: colors.text }}>{item.text}</Text>
              {item.citations.length > 0 ? (
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>Source: {[...new Set(item.citations)].join(', ')}</Text>
              ) : null}
              {item.kind === 'LOGIN_REQUIRED' || item.kind === 'PERSONAL_STATUS' ? null : (
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <Pressable accessibilityRole="button" accessibilityLabel="Helpful" accessibilityState={{ selected: item.rated === 'UP' }} onPress={() => void rate(item, 'UP')} style={{ minHeight: 44, justifyContent: 'center' }}>
                    <Text style={{ color: item.rated === 'UP' ? colors.gold : colors.textMuted }}>Helpful</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel="Not helpful" accessibilityState={{ selected: item.rated === 'DOWN' }} onPress={() => void rate(item, 'DOWN')} style={{ minHeight: 44, justifyContent: 'center' }}>
                    <Text style={{ color: item.rated === 'DOWN' ? colors.gold : colors.textMuted }}>Not helpful</Text>
                  </Pressable>
                </View>
              )}
            </View>
          )
        }
        ListFooterComponent={<ErrorText message={error} />}
      />
      <View style={{ flexDirection: 'row', gap: 8, padding: 12, borderTopWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }}>
        <TextInput
          accessibilityLabel="Message to the assistant"
          value={draft}
          onChangeText={setDraft}
          placeholder="Ask a question"
          placeholderTextColor="#6B6B6B"
          maxLength={MAX_LENGTH}
          multiline
          style={{ flex: 1, color: colors.text, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, maxHeight: 120 }}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: busy || !draft.trim() }}
          disabled={busy || !draft.trim()}
          onPress={() => void send()}
          style={{ justifyContent: 'center', paddingHorizontal: 16, minHeight: 44, borderRadius: 12, backgroundColor: busy || !draft.trim() ? colors.surfaceAlt : colors.gold }}
        >
          <Text style={{ color: busy || !draft.trim() ? colors.textMuted : colors.onGold, fontWeight: '700' }}>{busy ? '…' : 'Send'}</Text>
        </Pressable>
      </View>
    </Screen>
  );
}
