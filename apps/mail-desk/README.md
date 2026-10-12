# Paris Hindu Summit Mail Desk

A focused Expo app for the Paris Hindu Summit 2026 mail team. It uses the same Better Auth accounts, Cloudflare D1 mail data, role checks, Resend delivery, contacts, and message history as the website administration panel, through the Hono admin mail API on the Summit Worker (`/api/v1/admin/mail/*`).

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Install dependencies with `bun install`.
3. Start with `bun start`, then open iOS, Android, or web from Expo.

Set `EXPO_PUBLIC_API_URL` to the Worker origin: the `summit-website-dev` Worker for everyday work, the `summit-website` Worker only when an authorized operator needs the real shared mailbox. Use the development Worker in `.env.local` when testing data-changing work.

## Access

Only existing `administrator` and `mail_manager` accounts can query or modify mail data. New accounts are created and assigned from the website administration panel; the mobile app intentionally has no sign-up flow.

## Validation

```bash
bun run lint
npx tsc --noEmit -p tsconfig.json
npx expo export --platform ios
```
