import { whatsappDeliveries } from '@/db/schema/whatsapp-deliveries';

type DeliveryInsert = typeof whatsappDeliveries.$inferInsert;
type ObsoleteMessageKeys = Extract<
  keyof DeliveryInsert,
  'mediaMessageId' | 'textMessageId'
>;
type Assert<T extends true> = T;
type NoObsoleteMessageKeys = Assert<
  [ObsoleteMessageKeys] extends [never] ? true : false
>;

const singleMessageDelivery: DeliveryInsert = {
  reportId: '11111111-1111-4111-8111-111111111111',
  attemptNumber: 1,
  messageId: null,
  status: 'queued',
};

void singleMessageDelivery;
export type { NoObsoleteMessageKeys };
