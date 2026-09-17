export type NotificationType =
  | 'proposal-received'
  | 'proposal-accepted'
  | 'proposal-declined'
  | 'proposal-expired'
  | 'schedule-set'
  | 'schedule-changed'
  | 'completion-requested'
  | 'completion-confirmed'
  | 'cancellation'
  | 'review-available'
  | 'review-published'
  | 'review-response'
  | 'report-status'
  | 'lend-reminder'
  | 'overdue'
  | 'moderation-action';

export interface NotificationItem {
  id: string;
  userId: string;
  type: NotificationType;
  ref: string;
  createdAtMs: number;
  readAtMs?: number;
}
