import { AppError } from '../../shared/http/errors.js';
import { notificationRepo } from './notification.repo.js';
import type { Notification } from '../../shared/db/schema.js';

function toView(n: Notification) {
  return {
    id: n.id,
    title: n.title,
    message: n.message,
    type: n.type,
    priority: n.priority,
    read: n.read,
    sourceTab: n.sourceTab,
    createdAt: n.createdAt.toISOString(),
  };
}

export const notificationService = {
  async list(touristId: string) {
    const items = await notificationRepo.listByTourist(touristId);
    return items.map(toView);
  },

  async markRead(id: number, touristId: string) {
    const updated = await notificationRepo.markRead(id, touristId);
    if (!updated) throw new AppError('NOT_FOUND', 'Notification not found');
    return { acknowledged: true };
  },

  async markAllRead(touristId: string) {
    await notificationRepo.markAllRead(touristId);
    return { acknowledged: true };
  },
};
