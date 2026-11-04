const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("Expo branding points to the Mealventory logo asset set", () => {
  const config = JSON.parse(fs.readFileSync("app.json", "utf8")).expo;

  assert.equal(config.icon, "./assets/branding/icon.png");
  assert.equal(config.ios.icon, "./assets/branding/icon.png");
  const splash = config.plugins.find(
    (plugin) =>
      Array.isArray(plugin) &&
      plugin[0] === "expo-splash-screen"
  );

  assert.ok(splash, "expo-splash-screen branding config is missing");

  assert.equal(
    splash[1].image,
    "./assets/branding/mealventory-logo.png"
  );
  assert.equal(splash[1].resizeMode, "contain");
  assert.equal(splash[1].backgroundColor, "#F6F8F4");
  assert.equal(
    config.android.adaptiveIcon.foregroundImage,
    "./assets/branding/adaptive-icon.png"
  );
  assert.equal(config.android.adaptiveIcon.backgroundColor, "#F6F8F4");
  assert.equal(config.web.favicon, "./assets/branding/favicon.png");

  const notifications = config.plugins.find(
    (plugin) => Array.isArray(plugin) && plugin[0] === "expo-notifications"
  );
  assert.ok(notifications, "expo-notifications branding config is missing");
  assert.equal(
    notifications[1].icon,
    "./assets/branding/notification-icon.png"
  );
  assert.equal(notifications[1].color, "#087F5B");
});

test("all configured branding files are committed", () => {
  for (const path of [
    "assets/branding/icon.png",
    "assets/branding/adaptive-icon.png",
    "assets/branding/favicon.png",
    "assets/branding/mealventory-logo.png",
    "assets/branding/notification-icon.png",
  ]) {
    assert.equal(fs.existsSync(path), true, `${path} is missing`);
    assert.ok(fs.statSync(path).size > 0, `${path} is empty`);
  }
});

test("production root route uses the Mealventory brand image", () => {
  const root = fs.readFileSync("app/index.tsx", "utf8");

  assert.match(root, /<BrandLogo/);
  assert.doesNotMatch(root, /<Leaf\b/);
});
