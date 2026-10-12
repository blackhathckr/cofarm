const THREAD_PARAM = 'thread';
const PROJECT_PARAM = 'project';
const INBOX_PATH = '/inbox';

type InboxThreadLink = {
  to: string;
  search: Record<string, string>;
};

/**
 * `to` is widened to `string` deliberately: the inbox route is registered
 * through a helper that takes a `string` path, so the router's typed union of
 * destinations does not carry its literal.
 */
export function inboxThreadLink(threadId: string, projectId: string): InboxThreadLink {
  return {
    to: INBOX_PATH,
    search: { [THREAD_PARAM]: threadId, [PROJECT_PARAM]: projectId },
  };
}

type InboxLink = {
  threadId: string | null;
  projectId: string | null;
};

export function readInboxLink(searchStr: string): InboxLink {
  const params = new URLSearchParams(searchStr);
  return { threadId: params.get(THREAD_PARAM), projectId: params.get(PROJECT_PARAM) };
}
