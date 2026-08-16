import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '../../components/ui/AppButton';
import { AppText } from '../../components/ui/AppText';
import {
  CompanionHeader,
  CompanionMessage,
  ErrorMessage,
  GeneratingMessage,
  SuggestionChip,
  UserMessage,
} from '../../features/companion/components/CompanionComponents';
import {
  useCompanionMessagesQuery,
  useCompanionPetQuery,
  useCreateCompanionSessionMutation,
  useSendCompanionMessageMutation,
  useStoredCompanionSessionQuery,
} from '../../features/companion/hooks/useCompanionQueries';
import { companionKeys } from '../../features/companion/query-keys';
import type {
  CompanionDisplayMessage,
  CompanionMessage as CompanionMessageType,
  CompanionQuickAction,
} from '../../features/companion/types/companion';
import { resolveCompanionActionRoute } from '../../features/companion/utils/companion-routing';
import { colors, radius, spacing, typography } from '../../theme';

const quickActions: CompanionQuickAction[] = ['CHEER_UP', 'BANTER', 'QUICK_TIP'];

export default function CompanionScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const listRef = useRef<FlatList<CompanionDisplayMessage>>(null);
  const [draft, setDraft] = useState('');
  const [pendingMessage, setPendingMessage] = useState<CompanionDisplayMessage | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<{ path: string; label: string } | null>(null);

  const storedSession = useStoredCompanionSessionQuery();
  const sessionId = storedSession.data;
  const petQuery = useCompanionPetQuery();
  const messagesQuery = useCompanionMessagesQuery(sessionId);
  const createSessionMutation = useCreateCompanionSessionMutation();
  const sendMutation = useSendCompanionMessageMutation();
  const sending = sendMutation.isPending;

  const messages = useMemo<CompanionDisplayMessage[]>(() => {
    const confirmed = messagesQuery.data ?? [];
    return pendingMessage ? [...confirmed, pendingMessage] : confirmed;
  }, [messagesQuery.data, pendingMessage]);

  const petName = petQuery.data?.name ?? 'Companion';

  const refresh = useCallback(async () => {
    await Promise.all([
      petQuery.refetch(),
      sessionId ? messagesQuery.refetch() : Promise.resolve(),
    ]);
  }, [messagesQuery, petQuery, sessionId]);

  const ensureSessionId = useCallback(async () => {
    if (sessionId) return sessionId;
    const created = await createSessionMutation.mutateAsync();
    return created.id;
  }, [createSessionMutation, sessionId]);

  const send = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || sending) return;

      setSendError(null);
      setLastAction(null);
      const optimistic: CompanionDisplayMessage = {
        id: `local-${Date.now()}`,
        role: 'USER',
        content: trimmed,
        createdAt: new Date().toISOString(),
        pending: true,
      };
      setPendingMessage(optimistic);

      try {
        const activeSessionId = await ensureSessionId();
        setDraft('');
        const response = await sendMutation.mutateAsync({
          sessionId: activeSessionId,
          content: trimmed,
        });
        setLastAction(response.action ?? null);
        setPendingMessage(null);
        await queryClient.invalidateQueries({
          queryKey: companionKeys.messages(response.sessionId),
        });
      } catch (error) {
        setDraft(trimmed);
        setPendingMessage(null);
        setSendError(
          error instanceof Error
            ? error.message
            : 'Chua the gui tin nhan. Noi dung cua ban van duoc giu lai.',
        );
      }
    },
    [ensureSessionId, queryClient, sendMutation, sending],
  );

  const sendQuickAction = useCallback(
    async (quickAction: CompanionQuickAction) => {
      if (sending) return;
      setSendError(null);
      setLastAction(null);

      try {
        const activeSessionId = await ensureSessionId();
        const response = await sendMutation.mutateAsync({
          sessionId: activeSessionId,
          quickAction,
        });
        setLastAction(response.action ?? null);
        await queryClient.invalidateQueries({
          queryKey: companionKeys.messages(response.sessionId),
        });
      } catch (error) {
        setSendError(error instanceof Error ? error.message : 'Companion chua the tra loi luc nay.');
      }
    },
    [ensureSessionId, queryClient, sendMutation, sending],
  );

  const renderItem = useCallback(
    ({ item }: { item: CompanionDisplayMessage }) => {
      if (item.role === 'USER') return <UserMessage message={item} />;

      const action =
        lastAction && item === messages[messages.length - 1]
          ? {
              label: lastAction.label,
              onPress: () => {
                const route = resolveCompanionActionRoute(lastAction.path);
                if (route) router.push(route);
              },
            }
          : null;

      return <CompanionMessage message={item} action={action} />;
    },
    [lastAction, messages, router],
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
        style={styles.keyboard}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quay lai"
            onPress={() => router.back()}
            style={styles.iconButton}
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <View style={styles.headerTitle}>
            <AppText variant="heading">Companion</AppText>
            <AppText variant="caption" color={colors.textMuted}>
              BeaconVie
            </AppText>
          </View>
        </View>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListHeaderComponent={<CompanionHeader pet={petQuery.data} />}
          ListEmptyComponent={
            messagesQuery.isLoading && sessionId ? null : (
              <View style={styles.emptyState}>
                <AppText variant="heading">Hoi Companion bat cu dieu gi ve viec hoc.</AppText>
                <AppText color={colors.textMuted}>
                  Miu co the dong vien, goi y hoc nhanh, hoac giup ban tim dung khu vuc trong app.
                </AppText>
              </View>
            )
          }
          ListFooterComponent={
            <>
              {messagesQuery.error ? (
                <ErrorMessage message="Khong the tai cuoc tro chuyen." />
              ) : null}
              {sendError ? <ErrorMessage message={sendError} /> : null}
              {sending ? <GeneratingMessage petName={petName} /> : null}
            </>
          }
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />

        <View style={styles.suggestions}>
          {quickActions.map((quickAction) => (
            <SuggestionChip
              key={quickAction}
              quickAction={quickAction}
              disabled={sending}
              onPress={(value) => void sendQuickAction(value)}
            />
          ))}
        </View>

        <View style={styles.composer}>
          <TextInput
            accessibilityLabel="Nhap cau hoi cho Companion"
            value={draft}
            onChangeText={setDraft}
            placeholder="Nhap cau hoi..."
            placeholderTextColor={colors.textMuted}
            editable={!sending}
            multiline
            maxLength={500}
            style={styles.input}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Gui tin nhan"
            disabled={sending || !draft.trim()}
            onPress={() => void send(draft)}
            style={({ pressed }) => [
              styles.sendButton,
              pressed ? styles.sendPressed : null,
              sending || !draft.trim() ? styles.sendDisabled : null,
            ]}
          >
            <Ionicons name="send" size={20} color={colors.white} />
          </Pressable>
        </View>

        {messagesQuery.error && sessionId ? (
          <View style={styles.retryBar}>
            <AppButton onPress={() => void refresh()}>Thu lai</AppButton>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboard: {
    flex: 1,
  },
  header: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerTitle: {
    flex: 1,
  },
  listContent: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    flexGrow: 1,
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  separator: {
    height: spacing.sm,
  },
  emptyState: {
    gap: spacing.sm,
    paddingVertical: spacing['2xl'],
  },
  suggestions: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
  },
  composer: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  input: {
    flex: 1,
    maxHeight: 132,
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: typography.size.md,
    fontWeight: '600',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  sendButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: colors.primary,
  },
  sendPressed: {
    backgroundColor: colors.primaryPressed,
  },
  sendDisabled: {
    opacity: 0.42,
  },
  retryBar: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
});
