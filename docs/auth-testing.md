# Account flow testing

## Supabase setup for password recovery

In Authentication → URL Configuration, allow the exact recovery redirect for each environment:

- Web development: `http://localhost:8082/reset-password` (use the actual host and Expo port).
- Native development/production build: `mealventory://reset-password`.
- Expo Go: the URL produced by `Linking.createURL('/reset-password')`, typically `exp://<computer-IP>:<Expo-port>/--/reset-password`. This changes when the development host changes; test the link on the same phone. A development build with the stable app scheme is preferable for reliable email links.
- Deployed web: `https://<app-host>/reset-password`, with that route served by the host.

Keep the recovery email template's confirmation link so Supabase verifies the link before redirecting. Never put service-role keys in the frontend. This change does not modify dashboard settings or send test emails.

The app receives a recovery session and asks for a new password before returning to households. Sessions currently remain in memory; a full reload requires signing in again. The pantry uses shared database inventory; see [shared inventory testing](shared-inventory.md).

## Manual checks with a test account

1. Register with a blank username. Confirm email if required. Settings should show the email prefix. Repeat with an explicit username.
2. Join an existing household as a member. Confirm a single **Enter kitchen** button appears on its card and opens the pantry. Settings should show the selected household.
3. Update the username in Settings; sign out and back in and verify it remains saved.
4. Update the password in Settings. Mismatched confirmation must show an error. After a successful update, sign out and verify the new password works.
5. Sign out from both Settings and the household page. The sign-in form should appear. Back navigation and direct kitchen/modal links must not reopen authenticated screens.
6. While signed out, request a password recovery email, open the newest link, and save a new password. Test on web and on a physical phone. An expired link should never show password-update success.
7. Disconnect networking and attempt logout or a profile update. A failed request should show an error, not a success message.

Automated checks: `npm run typecheck` and `npm test`. Tests use mocks and do not change real accounts.

Reference: [Supabase password recovery](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail).
