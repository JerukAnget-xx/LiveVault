import type {
  CreateRecipientInput,
  ListRecipientsOptions,
  RecipientRepository,
  UpdateRecipientInput,
} from './types';

export class RecipientNotFoundError extends Error {
  constructor() {
    super('Recipient not found');
    this.name = 'RecipientNotFoundError';
  }
}

export function createRecipientService(repository: RecipientRepository) {
  async function listRecipients(options: ListRecipientsOptions = {}) {
    return repository.list(options);
  }

  async function getRecipientById(recipientId: string) {
    const recipient = await repository.findById(recipientId);

    if (!recipient) throw new RecipientNotFoundError();
    return recipient;
  }

  async function createRecipient(input: CreateRecipientInput) {
    return repository.create(input);
  }

  async function updateRecipient(
    recipientId: string,
    input: UpdateRecipientInput,
  ) {
    const recipient = await repository.update(recipientId, input);

    if (!recipient) throw new RecipientNotFoundError();
    return recipient;
  }

  async function setRecipientActive(recipientId: string, isActive: boolean) {
    return updateRecipient(recipientId, { isActive });
  }

  return {
    listRecipients,
    getRecipientById,
    createRecipient,
    updateRecipient,
    setRecipientActive,
  };
}

export type RecipientService = ReturnType<typeof createRecipientService>;
