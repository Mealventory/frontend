# Shared household inventory

The pantry now uses the backend's `/api/v1/items` endpoints and the PostgreSQL `inventory_items` and `foods` tables from `backend/scripts/init_db.sql`. Deploy/update the backend and frontend together. No new migration is needed when that schema is already installed; do not rerun the clean-database initialization script on an existing database.

Requests include the Supabase bearer token and the selected `X-Household-ID`. Any verified household member can list, add, or delete an item. The server checks membership and scopes each query/delete to that household. Legacy `/api/v1/inventory/` contracts are unchanged.

- Deletion removes the inventory row after server confirmation. It keeps the shared food catalogue record.
- Failed saves/deletes stay on the form with an error. No successful deletion is shown on network/server failure.
- Other active phones refresh every five seconds, subject to request latency. Returning to the app or pulling down the pantry refreshes it too. This is polling, not a Supabase Realtime subscription.
- Changing accounts/households clears the previous inventory. Responses from the previous selection or from before a mutation cannot overwrite current data.
- Sample groceries are available only in `/prototype`; that preview has a separate local inventory. Previous phone-only manual entries were never saved to the database and are not automatically migrated.
- Manual additions accept quantity/unit (for example `2 bottles` or `500 g`) and an optional ISO expiration date. Blank expiration dates remain unknown.

## Two-phone check

1. Run the updated backend against the existing Supabase database and keep the shared backend tunnel open. Both phones need the same current backend URL and Supabase project.
2. Sign in as two different members of the same household and enter the kitchen.
3. Add a clearly named test item with the Add button. Wait for the save to finish. The other phone should see it within the next successful refresh.
4. Delete that test item on either phone. The other phone should lose it within the next refresh. Reopening the app must not bring it back.
5. Disconnect a phone, try deleting another test item, and confirm the app reports failure rather than pretending it deleted. Reconnect and retry.
6. Switch to a different household and confirm the first household's items are not shown.

Automated checks use isolated test databases and mocked network calls. They do not delete users' real items.
