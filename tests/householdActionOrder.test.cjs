const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("household invitation displays Enter kitchen before Share Invite", () => {
  const page = fs.readFileSync("app/index.tsx", "utf8");
  const card = fs.readFileSync("src/components/domain/HouseholdInviteCard.tsx", "utf8");

  // On the selected household screen, Enter kitchen is passed as the
  // card's child action, immediately after the QR/invite-code content.
  const cardOpen = page.indexOf("<HouseholdInviteCard");
  const cardClose = page.indexOf("</HouseholdInviteCard>", cardOpen);
  assert.ok(cardOpen >= 0 && cardClose > cardOpen);
  const cardMarkup = page.slice(cardOpen, cardClose);
  assert.match(cardMarkup, /testID="e2e-enter-kitchen"/);
  assert.match(cardMarkup, /selectHousehold\(selected\); router\.push/);

  const inviteCode = card.indexOf("HOUSEHOLD INVITE CODE");
  const primaryAction = card.indexOf("{children}", inviteCode);
  const shareAction = card.indexOf("Share Invite", primaryAction);
  assert.ok(inviteCode >= 0 && primaryAction > inviteCode && shareAction > primaryAction);

  // Households without invite codes must still have an Enter kitchen action.
  assert.equal((page.match(/testID="e2e-enter-kitchen"/g) || []).length, 2);
});
