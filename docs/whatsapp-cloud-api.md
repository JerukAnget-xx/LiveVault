# WhatsApp Cloud API Delivery

Live.Vault sends one Meta template message per report delivery attempt. The
message uses an image header containing the report screenshot and two body
parameters: report title, then the cumulative active-cycle report list.

## Meta dashboard setup

Create or select a Meta app with the WhatsApp product, connect the WhatsApp
Business Account and sending phone number, and create an approved template with:

- an `IMAGE` header;
- body parameter `{{1}}` for the report title;
- body parameter `{{2}}` for the cumulative report list.

Use a system-user access token with `whatsapp_business_messaging` permission.
Set the phone number ID, business account ID, approved template name/language,
and a currently supported Graph API version in `.env.local`. Never expose the
access token to browser code.

Meta Cloud API image uploads accept JPEG and PNG images up to 5 MB. A stored
WebP or larger screenshot remains safely saved as a report, but its WhatsApp
attempt will fail until a compatible screenshot conversion flow is added.

## Delivery semantics

The server downloads the private Supabase object, uploads it to Meta's `/media`
endpoint, then references that media ID in one `/messages` template request.
Every retry creates a new delivery row. PostgreSQL advisory locking plus queued
and sending states prevent concurrent or repeated initial sends.

Webhook delivery/read receipts are intentionally not implemented. For now,
Meta accepting `/messages` is recorded as `sent`. If Meta accepts the message
but the final database update fails, the attempt remains `sending` to prevent a
potential duplicate; an administrator must reconcile that exceptional state.
