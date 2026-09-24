export type Recipient = {
  id: string;
  name: string;
  whatsappNumber: string;
  reportTitle: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateRecipientInput = Pick<
  Recipient,
  'name' | 'whatsappNumber' | 'reportTitle' | 'isActive'
>;

export type UpdateRecipientInput = Partial<CreateRecipientInput>;

export type ListRecipientsOptions = {
  activeOnly?: boolean;
};

export type RecipientRepository = {
  list(options: ListRecipientsOptions): Promise<Recipient[]>;
  findById(recipientId: string): Promise<Recipient | null>;
  create(input: CreateRecipientInput): Promise<Recipient>;
  update(
    recipientId: string,
    input: UpdateRecipientInput,
  ): Promise<Recipient | null>;
};
