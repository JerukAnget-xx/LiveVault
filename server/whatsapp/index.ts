import 'server-only';

import { reportImageStorage } from '@/server/storage/report-images';

import { getMetaWhatsAppClient } from './client';
import { createWhatsAppDeliveryService } from './delivery-service';
import { whatsappDeliveryRepository } from './repository';
import type { MetaWhatsAppClient } from './types';

const lazyMetaClient: MetaWhatsAppClient = {
  uploadMedia: (image) => getMetaWhatsAppClient().uploadMedia(image),
  sendTemplate: (input) => getMetaWhatsAppClient().sendTemplate(input),
};

const whatsappDeliveryService = createWhatsAppDeliveryService({
  repository: whatsappDeliveryRepository,
  imageReader: reportImageStorage,
  client: lazyMetaClient,
  clock: () => new Date(),
  logger: console,
});

export const { deliverReport } = whatsappDeliveryService;
