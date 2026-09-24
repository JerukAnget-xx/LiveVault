import 'server-only';

import { recipientRepository } from './repository';
import { createRecipientService } from './service';

const recipientService = createRecipientService(recipientRepository);

export const {
  listRecipients,
  getRecipientById,
  createRecipient,
  updateRecipient,
  setRecipientActive,
} = recipientService;

export { RecipientNotFoundError } from './service';
export { RecipientDatabaseError } from './repository';
export type {
  CreateRecipientInput,
  ListRecipientsOptions,
  Recipient,
  UpdateRecipientInput,
} from './types';
