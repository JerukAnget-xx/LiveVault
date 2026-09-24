export type RecipientView = {
  id: string;
  name: string;
  whatsappNumber: string;
  reportTitle: string;
  isActive: boolean;
};

export function toRecipientView(recipient: RecipientView): RecipientView {
  return {
    id: recipient.id,
    name: recipient.name,
    whatsappNumber: recipient.whatsappNumber,
    reportTitle: recipient.reportTitle,
    isActive: recipient.isActive,
  };
}

export function recipientInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase();
}
