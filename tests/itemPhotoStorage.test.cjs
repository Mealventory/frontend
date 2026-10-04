const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const Module = require("node:module");

function harness() {
  const calls = { uploads: [], removes: [], signed: [] };
  const bucket = {
    async upload(path, body, options) {
      calls.uploads.push({ path, body, options });
      return { error: null };
    },
    async remove(paths) {
      calls.removes.push(paths);
      return { error: null };
    },
    async createSignedUrl(path, seconds) {
      calls.signed.push({ path, seconds });
      return { data: { signedUrl: "https://signed.example/" + path }, error: null };
    },
  };
  const mod = new Module("itemPhotoStorage");
  mod.require = (name) => {
    if (name === "./supabase") {
      return { supabase: { storage: { from: (bucketName) => {
        assert.equal(bucketName, "pantry-item-images");
        return bucket;
      } } } };
    }
    throw new Error(name);
  };
  mod._compile(
    ts.transpileModule(fs.readFileSync("src/lib/itemPhotoStorage.ts", "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    "itemPhotoStorage.cjs",
  );
  return { api: mod.exports, calls };
}

test("manual item photos upload under the selected household path", async () => {
  const { api, calls } = harness();
  const path = await api.uploadItemPhoto(
    "20000000-0000-0000-0000-000000000001",
    "AQID",
    "image/jpeg",
  );
  assert.match(path, /^20000000-0000-0000-0000-000000000001\/.+\.jpg$/);
  assert.equal(calls.uploads.length, 1);
  assert.equal(calls.uploads[0].path, path);
  assert.equal(calls.uploads[0].options.contentType, "image/jpeg");
  assert.equal(calls.uploads[0].body.byteLength, 3);
});

test("remote barcode images bypass storage signing", async () => {
  const { api, calls } = harness();
  const url = "https://images.openfoodfacts.org/product.jpg";
  assert.equal(await api.resolveItemPhotoUrl(url), url);
  assert.equal(calls.signed.length, 0);
  await api.deleteItemPhoto(url);
  assert.equal(calls.removes.length, 0);
});

test("private photo paths resolve to signed URLs and can be deleted", async () => {
  const { api, calls } = harness();
  const ref = "home-1/photo.jpg";
  assert.equal(await api.resolveItemPhotoUrl(ref), "https://signed.example/" + ref);
  assert.equal(await api.resolveItemPhotoUrl(ref), "https://signed.example/" + ref);
  assert.equal(calls.signed.length, 1);
  await api.deleteItemPhoto(ref);
  assert.deepEqual(calls.removes, [[ref]]);
});
