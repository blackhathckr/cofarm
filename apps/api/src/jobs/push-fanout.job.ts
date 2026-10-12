import { z } from 'zod';

import { pushProvider } from '../infra/push.ts';
import { logger } from '../lib/logger.ts';
import * as notifications from '../modules/notifications/notifications.service.ts';

const NO_DEVICE_ERROR = 'No registered device';

const fanoutPayloadSchema = z.object({
  notificationIds: z.array(z.uuid()).min(1),
});

/**
 * Delivery is best-effort by design: the notification row is already written,
 * so a push that never lands costs the badge, not the message. The job is
 * therefore completed and the reason recorded per notification.
 */
export async function runPushFanout(payload: Record<string, unknown>): Promise<void> {
  const { notificationIds } = fanoutPayloadSchema.parse(payload);
  const deliveries = await notifications.pendingDeliveries(notificationIds);

  if (deliveries.length !== notificationIds.length) {
    logger.warn(
      { requested: notificationIds.length, found: deliveries.length },
      'push fan-out found fewer notifications than enqueued',
    );
  }

  const delivered: string[] = [];
  const failures = new Map<string, string[]>();

  for (const delivery of deliveries) {
    if (delivery.tokens.length === 0) {
      recordFailure(failures, NO_DEVICE_ERROR, delivery.notificationId);
      continue;
    }

    const receipt = await pushProvider.send(delivery.tokens, {
      title: delivery.title,
      body: delivery.body,
      data: delivery.data,
    });

    if (receipt.staleTokens !== undefined) {
      await notifications.forgetTokens(receipt.staleTokens);
    }

    if (receipt.delivered) {
      delivered.push(delivery.notificationId);
      continue;
    }

    recordFailure(
      failures,
      receipt.error ?? 'Push provider reported no delivery',
      delivery.notificationId,
    );
  }

  await notifications.recordDelivered(delivered);
  for (const [error, ids] of failures) {
    await notifications.recordDeliveryFailure(ids, error);
    logger.warn({ notificationCount: ids.length, deliveryError: error }, 'push delivery failed');
  }
}

function recordFailure(
  failures: Map<string, string[]>,
  error: string,
  notificationId: string,
): void {
  const existing = failures.get(error);
  if (existing === undefined) {
    failures.set(error, [notificationId]);
    return;
  }
  existing.push(notificationId);
}
