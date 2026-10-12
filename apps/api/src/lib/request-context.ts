import { AsyncLocalStorage } from 'node:async_hooks';

export type RequestContext = {
  requestId: string;
  actorUserId: string | null;
  ip: string | null;
};

const storage = new AsyncLocalStorage<RequestContext>();

export function runWithContext<T>(context: RequestContext, run: () => T): T {
  return storage.run(context, run);
}

export function currentContext(): RequestContext | undefined {
  return storage.getStore();
}
