import { db } from '../../shared/db/client.js';
import { tourists, notifications } from '../../shared/db/schema.js';
import { eq } from 'drizzle-orm';
import { wsHub } from '../../shared/ws/hub.js';
import { notificationRepo } from '../notification/notification.repo.js';
import { auditService } from '../audit/audit.service.js';
import type { BroadcastInput } from './broadcast.schema.js';

export const broadcastService = {
  async send(input: BroadcastInput, actorId: string, ipAddress?: string) {
    const { title, message, target, priority } = input;

    let recipientIds: string[] = [];

    if (target === 'all') {
      const rows = await db.select({ id: tourists.id }).from(tourists).where(eq(tourists.isActive, true));
      recipientIds = rows.map((r) => r.id);
    } else if (target.startsWith('tourist:')) {
      const id = target.slice(8);
      if (id) recipientIds = [id];
    }
    // zone: targets — WebSocket only, no persisted notification

    // Persist in-app notifications for resolved tourist IDs
    if (recipientIds.length > 0) {
      await Promise.all(
        recipientIds.map((touristId) =>
          notificationRepo.create({
            touristId,
            title,
            message,
            type: 'broadcast',
            priority,
            read: false,
            sourceTab: 'home',
            broadcastTarget: target,
          }),
        ),
      );
    }

    // WebSocket push
    const wsPayload = { type: 'BROADCAST' as const, payload: { title, message, priority } };
    if (target === 'all') {
      wsHub.toAll(wsPayload);
    } else if (target.startsWith('tourist:')) {
      wsHub.toRoom(target, wsPayload);
    } else if (target.startsWith('zone:')) {
      wsHub.toRoom(target, wsPayload);
    }

    await auditService.write({
      actor: actorId,
      action: 'broadcast',
      targetCollection: 'notifications',
      targetId: target,
      changes: { title, message, target, priority },
      ...(ipAddress !== undefined ? { ipAddress } : {}),
    });

    return { acknowledged: true, target, recipientCount: recipientIds.length };
  },
};
