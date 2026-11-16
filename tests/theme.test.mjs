import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const page = readFileSync(new URL('../src/pages/index.astro', import.meta.url), 'utf8');
const script = page.match(/<script is:inline>([\s\S]*?)<\/script>/)[1];

function setup({ dark = false, saved = null, storageBlocked = false } = {}) {
  const listeners = new Map();
  const warnings = [];
  const root = { dataset: {} };
  const meta = {};
  const toggle = {
    hidden: true,
    setAttribute(name, value) { this[name] = value; },
    addEventListener(type, handler) { listeners.set(type, handler); },
  };
  const device = {
    matches: dark,
    addEventListener(type, handler) { listeners.set(`device:${type}`, handler); },
  };
  const storage = {
    getItem() { return saved; },
    setItem(key, value) {
      if (storageBlocked) throw new Error('Storage blocked');
      assert.equal(key, 'theme');
      saved = value;
    },
  };
  const context = {
    document: {
      documentElement: root,
      querySelector: (selector) => selector === '[data-theme-toggle]' ? (ready ? toggle : null) : meta,
      addEventListener(type, handler) { listeners.set(type, handler); },
    },
    window: {
      matchMedia: () => device,
      addEventListener(type, handler) { listeners.set(type, handler); },
    },
    console: { warn: (...args) => warnings.push(args) },
  };
  Object.defineProperty(context, 'localStorage', {
    get() {
      if (storageBlocked) throw new Error('Storage blocked');
      return storage;
    },
  });
  let ready = false;
  runInNewContext(script, context);
  const initialTheme = root.dataset.theme;
  ready = true;
  listeners.get('DOMContentLoaded')();
  return {
    root, meta, toggle, warnings, initialTheme,
    saved: () => saved,
    click: () => listeners.get('click')(),
    deviceChange(value) {
      device.matches = value;
      listeners.get('device:change')();
    },
    storageChange(newValue, key = 'theme') {
      listeners.get('storage')({ storageArea: storage, key, newValue });
    },
  };
}

test('device theme is applied before the toggle mounts and follows live changes', () => {
  for (const dark of [false, true]) {
    const app = setup({ dark });
    assert.equal(app.initialTheme, dark ? 'dark' : 'light');
    assert.equal(app.toggle.hidden, false);
    assert.equal(app.toggle['aria-pressed'], String(dark));
    assert.equal(app.meta.content, dark ? '#17191d' : '#fbf5ea');
    app.deviceChange(!dark);
    assert.equal(app.root.dataset.theme, dark ? 'light' : 'dark');
    assert.equal(app.toggle['aria-pressed'], String(!dark));
    assert.equal(app.meta.content, dark ? '#fbf5ea' : '#17191d');
    assert.equal(app.saved(), null);
  }
});

test('saved choices override the device on initial load and subsequent changes', () => {
  for (const saved of ['light', 'dark']) {
    const app = setup({ dark: saved === 'light', saved });
    assert.equal(app.initialTheme, saved);
    app.deviceChange(saved !== 'dark');
    assert.equal(app.root.dataset.theme, saved);
    assert.equal(app.toggle['aria-pressed'], String(saved === 'dark'));
  }
});

test('toggle updates appearance, accessible state and persisted preference in both directions', () => {
  const app = setup();
  app.click();
  assert.equal(app.root.dataset.theme, 'dark');
  assert.equal(app.toggle['aria-pressed'], 'true');
  assert.equal(app.meta.content, '#17191d');
  assert.equal(app.saved(), 'dark');
  app.deviceChange(false);
  assert.equal(app.root.dataset.theme, 'dark');
  app.click();
  assert.equal(app.root.dataset.theme, 'light');
  assert.equal(app.toggle['aria-pressed'], 'false');
  assert.equal(app.saved(), 'light');
});

test('invalid saved values use the device and unavailable storage does not break the toggle', () => {
  assert.equal(setup({ dark: true, saved: 'invalid' }).initialTheme, 'dark');
  const app = setup({ dark: true, storageBlocked: true });
  assert.equal(app.initialTheme, 'dark');
  assert.equal(app.warnings.length, 1);
  app.click();
  assert.equal(app.root.dataset.theme, 'light');
  assert.equal(app.toggle['aria-pressed'], 'false');
  assert.equal(app.warnings.length, 2);
  app.deviceChange(true);
  assert.equal(app.root.dataset.theme, 'light');
});

test('other tabs sync choices and clearing storage restores the device default', () => {
  const app = setup({ saved: 'dark' });
  app.storageChange('light', 'unrelated');
  assert.equal(app.root.dataset.theme, 'dark');
  app.storageChange('light');
  assert.equal(app.root.dataset.theme, 'light');
  app.storageChange('dark');
  assert.equal(app.root.dataset.theme, 'dark');
  app.storageChange(null);
  assert.equal(app.root.dataset.theme, 'light');
  app.deviceChange(true);
  assert.equal(app.root.dataset.theme, 'dark');
  app.storageChange('light');
  app.storageChange(null, null);
  assert.equal(app.root.dataset.theme, 'dark');
});
