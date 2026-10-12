import { Spinner } from 'heroui-native';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { ProjectSwitcher } from '@/components/ui/ProjectSwitcher';
import { useSelectedProject } from '@/lib/selected-project.ts';
import { useDocumentDownload } from '@/lib/document-download.ts';
import { DocumentLibrary } from '../components/DocumentLibrary';
import { MessageComposer } from '../components/MessageComposer';
import { SignDocumentDialog } from '../components/SignDocumentDialog';
import { Transcript } from '../components/Transcript';
import { useMySignatures } from '../hooks/use-my-signatures.ts';
import { useMyThreads } from '../hooks/use-my-threads.ts';
import { useProjectThread } from '../hooks/use-project-thread.ts';
import { useSendMessage } from '../hooks/use-send-message.ts';
import { useSignDocument } from '../hooks/use-sign-document.ts';
import { useThreadRead } from '../hooks/use-thread-read.ts';

export function ChatScreen() {
  const threads = useMyThreads();
  const { projectId, select } = useSelectedProject();

  const conversation = useProjectThread(projectId);
  const signatures = useMySignatures();
  const sendMessage = useSendMessage(projectId);
  const documentDownload = useDocumentDownload();
  const signature = useSignDocument();
  const [signingRequestId, setSigningRequestId] = useState<string | null>(null);
  useThreadRead(projectId);

  const transcript = useRef<ScrollView>(null);
  const messages = conversation.items;
  const pendingSignatures = (signatures.data ?? []).filter(
    (request) => request.status === 'pending' && request.projectId === projectId,
  );
  // Signing removes the request from the pending list, which closes the dialog.
  const signing = pendingSignatures.find((request) => request.id === signingRequestId) ?? null;

  if (projectId === null) {
    return (
      <View className="flex-1 justify-center bg-background px-5">
        <EmptyState
          title="No conversation yet"
          detail="Once your project is mapped to this number, you can message the Kiaan team here."
        />
      </View>
    );
  }

  if (conversation.isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Spinner />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="px-5 pt-3">
        <ProjectSwitcher
          projects={(threads.data ?? []).map((thread) => ({
            id: thread.projectId,
            code: thread.projectCode,
            name: thread.projectName,
            badge: thread.unreadCount,
          }))}
          selectedId={projectId}
          onSelect={(nextProjectId) => {
            select(nextProjectId);
            setSigningRequestId(null);
          }}
        />
      </View>

      <DocumentLibrary projectId={projectId} />

      <ScrollView
        ref={transcript}
        className="flex-1"
        contentContainerClassName="grow gap-3 px-5 pt-3 pb-4"
        onContentSizeChange={() => {
          transcript.current?.scrollToEnd({ animated: false });
        }}
      >
        <Transcript
          messages={messages}
          pendingSignatures={pendingSignatures}
          hasOlder={conversation.hasNextPage}
          isLoadingOlder={conversation.isFetchingNextPage}
          isOpeningDocument={documentDownload.isPending}
          documentError={
            documentDownload.error === null
              ? null
              : 'That document could not be opened. Try again in a moment.'
          }
          onLoadOlder={() => {
            void conversation.fetchNextPage();
          }}
          onOpenDocument={documentDownload.mutate}
          onStartSigning={(signatureRequest) => {
            setSigningRequestId(signatureRequest.id);
          }}
        />
      </ScrollView>

      <MessageComposer
        isSending={sendMessage.isPending}
        errorMessage={sendMessage.error === null ? null : sendMessage.error.message}
        onSend={sendMessage.mutate}
      />

      <SignDocumentDialog
        signatureRequest={signing}
        isSigning={signature.isPending}
        errorMessage={signature.error === null ? null : signature.error.message}
        onClose={() => {
          setSigningRequestId(null);
        }}
        onSign={(signedName) => {
          if (signing === null) return;
          signature.mutate({ requestId: signing.id, signedName });
        }}
      />
    </KeyboardAvoidingView>
  );
}
