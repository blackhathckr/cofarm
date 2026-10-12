import { pingDatabase } from '../../db/client.ts';

export async function ping(): Promise<void> {
  await pingDatabase();
}
