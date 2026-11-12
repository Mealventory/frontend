const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');

function compile(path, mocks = {}) {
  const mod = new Module(path);
  mod.require = (name) => {
    if (name in mocks) return mocks[name];
    return require(name);
  };
  const outputText = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  mod._compile(outputText, path);
  return mod.exports;
}

function createMemoryStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, value),
    removeItem: (key) => map.delete(key),
  };
}

function collectText(node) {
  if (node == null || typeof node === 'boolean') return [];
  if (typeof node === 'string' || typeof node === 'number') return [String(node)];
  if (Array.isArray(node)) return node.flatMap(collectText);
  if (typeof node === 'object') return collectText(node.props?.children);
  return [];
}

function walkNodes(node) {
  if (Array.isArray(node)) return node.flatMap(walkNodes);
  if (!node || typeof node !== 'object') return [];
  return [node, ...walkNodes(node.props?.children)];
}

test('NetInfo package is installed and setupOnlineManager syncs onlineManager', async () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  assert.ok(pkg.dependencies['@react-native-community/netinfo']);

  const { onlineManager } = require('@tanstack/react-query');
  const storage = createMemoryStorage();
  const offlineSync = compile('src/lib/offlineSync.ts', {
    '@tanstack/react-query': { onlineManager },
    './storage': { appStorage: storage },
    './inventoryApi': compile('src/lib/inventoryApi.ts'),
  });

  let listener = null;
  const stop = offlineSync.setupOnlineManager({
    fetch: async () => false,
    subscribe: (fn) => {
      listener = fn;
      return () => {
        listener = null;
      };
    },
  });

  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(onlineManager.isOnline(), false);

  listener(true);
  assert.equal(onlineManager.isOnline(), true);

  stop();
  onlineManager.setOnline(true);
});

test('offline mutation queue persists per scope, flushes chronologically, and resolves temp IDs', async () => {
  const storage = createMemoryStorage();
  const inventoryApi = compile('src/lib/inventoryApi.ts');
  const offlineSync = compile('src/lib/offlineSync.ts', {
    '@tanstack/react-query': require('@tanstack/react-query'),
    './storage': { appStorage: storage },
    './inventoryApi': inventoryApi,
  });

  const scopeA = offlineSync.offlineQueueStorageKey('user-1', 'home-a');
  const scopeB = offlineSync.offlineQueueStorageKey('user-1', 'home-b');
  assert.notEqual(scopeA, scopeB);

  const initialQueue = [
    {
      id: 'm2',
      kind: 'update',
      itemId: 'offline-milk-1',
      itemName: 'Oat Milk',
      patch: { quantity: 3 },
      createdAt: 200,
    },
    {
      id: 'm1',
      kind: 'add',
      tempId: 'offline-milk-1',
      itemName: 'Oat Milk',
      payload: {
        name: 'Oat Milk',
        category: 'Dairy',
        quantity: 1,
        unit: 'carton',
        expiry_date: '2026-11-20',
      },
      createdAt: 100,
    },
    {
      id: 'm3',
      kind: 'transition',
      itemId: 'existing-spinach',
      itemName: 'Spinach',
      action: 'consume',
      createdAt: 300,
    },
  ];

  offlineSync.saveOfflineQueue(scopeA, initialQueue, storage);
  const reloaded = offlineSync.loadOfflineQueue(scopeA, storage);
  assert.equal(reloaded.length, 3);
  assert.equal(offlineSync.loadOfflineQueue(scopeB, storage).length, 0);

  const calls = [];
  const callbacksLog = [];
  const result = await offlineSync.flushOfflineMutations(
    reloaded,
    {
      add: async (payload) => {
        calls.push(['add', payload.name]);
        return {
          id: 'srv-oat-milk',
          household_id: 'home-a',
          name: payload.name,
          category: payload.category,
          quantity: payload.quantity,
          unit: payload.unit,
          expiry_date: payload.expiry_date,
          status: 'active',
        };
      },
      update: async (id, patch) => {
        calls.push(['update', id, patch.quantity]);
        return {
          id,
          household_id: 'home-a',
          name: 'Oat Milk',
          category: 'Dairy',
          quantity: patch.quantity,
          unit: 'carton',
          expiry_date: '2026-11-20',
          status: 'active',
        };
      },
      remove: async (id) => {
        calls.push(['remove', id]);
      },
      transition: async (id, action) => {
        calls.push(['transition', id, action]);
      },
    },
    {
      onAddResolved: (tempId, item) => callbacksLog.push(['add', tempId, item.id]),
      onUpdateResolved: (id, item) => callbacksLog.push(['update', id, item.quantity]),
      onRemoveResolved: (id) => callbacksLog.push(['remove', id]),
    },
  );

  assert.deepEqual(calls, [
    ['add', 'Oat Milk'],
    ['update', 'srv-oat-milk', 3],
    ['transition', 'existing-spinach', 'consume'],
  ]);
  assert.deepEqual(callbacksLog, [
    ['add', 'offline-milk-1', 'srv-oat-milk'],
    ['update', 'srv-oat-milk', '3 carton'],
    ['remove', 'existing-spinach'],
  ]);
  assert.equal(result.flushedCount, 3);
  assert.equal(result.remainingQueue.length, 0);
  assert.equal(result.newConflicts.length, 0);
  assert.equal(result.stoppedReason, 'completed');
});

test('flush isolates stale-item conflicts and preserves remaining items on mid-flush drop', async () => {
  const storage = createMemoryStorage();
  const offlineSync = compile('src/lib/offlineSync.ts', {
    '@tanstack/react-query': require('@tanstack/react-query'),
    './storage': { appStorage: storage },
    './inventoryApi': compile('src/lib/inventoryApi.ts'),
  });

  const queue = [
    {
      id: 'c1',
      kind: 'transition',
      itemId: 'gone-on-server',
      itemName: 'Yogurt',
      action: 'consume',
      createdAt: 100,
    },
    {
      id: 'c2',
      kind: 'remove',
      itemId: 'bread-id',
      itemName: 'Bread',
      createdAt: 200,
    },
  ];

  const conflictRun = await offlineSync.flushOfflineMutations(queue, {
    add: async () => {
      throw new Error('unexpected');
    },
    update: async () => {
      throw new Error('unexpected');
    },
    remove: async () => {},
    transition: async () => {
      throw new Error('This item is no longer active. Refresh your kitchen.');
    },
  });

  assert.equal(conflictRun.stoppedReason, 'completed');
  assert.equal(conflictRun.flushedCount, 1);
  assert.equal(conflictRun.remainingQueue.length, 0);
  assert.equal(conflictRun.newConflicts.length, 1);
  assert.equal(conflictRun.newConflicts[0].itemName, 'Yogurt');
  assert.equal(
    conflictRun.newConflicts[0].message,
    'This item was modified or removed on another device.',
  );

  const dropRun = await offlineSync.flushOfflineMutations(queue, {
    add: async () => {
      throw new Error('unexpected');
    },
    update: async () => {
      throw new Error('unexpected');
    },
    remove: async () => {
      throw new Error('unexpected');
    },
    transition: async () => {
      throw new TypeError('Network request failed');
    },
  });

  assert.equal(dropRun.stoppedReason, 'offline');
  assert.equal(dropRun.flushedCount, 0);
  assert.equal(dropRun.remainingQueue.length, 2);
});

test('OfflineSyncBanner displays offline status, pending count, reconnection toast, and conflict actions', () => {
  const jsxRuntime = {
    jsx: (type, props) => ({ type, props }),
    jsxs: (type, props) => ({ type, props }),
  };
  const { OfflineSyncBanner } = compile('src/components/molecules/OfflineSyncBanner.tsx', {
    react: { default: {} },
    'react/jsx-runtime': jsxRuntime,
    'react-native': { View: 'View', TouchableOpacity: 'TouchableOpacity' },
    '../atoms': {
      Typography: ({ children }) => ({ type: 'Typography', props: { children } }),
    },
    '../atoms/Icon': { Icon: 'Icon' },
  });

  const cachedTree = OfflineSyncBanner({ isOnline: false, pendingSyncCount: 0 });
  assert.ok(collectText(cachedTree).join(' ').includes('Offline · Showing cached pantry'));

  const queuedTree = OfflineSyncBanner({ isOnline: false, pendingSyncCount: 2 });
  assert.ok(collectText(queuedTree).join(' ').includes('Offline · 2 changes pending sync'));

  const toastTree = OfflineSyncBanner({
    isOnline: true,
    pendingSyncCount: 0,
    syncToast: 'Back online — Inventory synced successfully',
  });
  assert.ok(
    collectText(toastTree).join(' ').includes('Back online — Inventory synced successfully'),
  );

  let retried = null;
  let dismissed = null;
  const conflictTree = OfflineSyncBanner({
    isOnline: true,
    pendingSyncCount: 0,
    syncConflicts: [
      {
        id: 'conf-1',
        itemName: 'Whole Milk',
        message: 'This item was modified or removed on another device.',
        failedAt: Date.now(),
        mutation: {
          id: 'm1',
          kind: 'remove',
          itemId: 'milk-1',
          itemName: 'Whole Milk',
          createdAt: 1,
        },
      },
    ],
    onRetryConflict: (id) => {
      retried = id;
    },
    onDismissConflict: (id) => {
      dismissed = id;
    },
  });

  const nodes = walkNodes(conflictTree);
  const retryBtn = nodes.find((n) => n.props?.accessibilityLabel === 'Retry sync for Whole Milk');
  const dismissBtn = nodes.find(
    (n) => n.props?.accessibilityLabel === 'Dismiss sync conflict for Whole Milk',
  );
  assert.ok(retryBtn);
  assert.ok(dismissBtn);
  retryBtn.props.onPress();
  dismissBtn.props.onPress();
  assert.equal(retried, 'conf-1');
  assert.equal(dismissed, 'conf-1');
});

test('InventoryContext and Pantry dashboard integrate offline queue, NetInfo, and banner toast', () => {
  const ctxSource = fs.readFileSync('src/context/InventoryContext.tsx', 'utf8');
  assert.ok(ctxSource.includes('setupOnlineManager'));
  assert.ok(ctxSource.includes('flushOfflineMutations'));
  assert.ok(ctxSource.includes('OFFLINE_SYNC_TOAST_MESSAGE'));
  assert.ok(ctxSource.includes("inventoryQuery.fetchStatus !== 'paused'"));

  const pantrySource = fs.readFileSync('app/(app)/(tabs)/index.tsx', 'utf8');
  assert.ok(pantrySource.includes('<OfflineSyncBanner'));
});

