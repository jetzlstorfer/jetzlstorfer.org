import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const page = readFileSync(new URL('../src/pages/index.astro', import.meta.url), 'utf8');
const script = page.match(/<script define:vars=\{\{ runItems: safeJson\(runItems\) \}\}>([\s\S]*?)<\/script>/)[1];

function element() {
  const listeners = new Map();
  return {
    dataset: {},
    classList: { toggle() {} },
    textContent: '',
    closest: () => null,
    setAttribute() {},
    removeAttribute() {},
    replaceChildren() {},
    cloneNode() { return element(); },
    addEventListener(type, handler) {
      listeners.set(type, handler);
    },
    dispatch(type, properties = {}) {
      const event = {
        target: this,
        preventDefault() { this.defaultPrevented = true; },
        ...properties,
      };
      listeners.get(type)?.(event);
      return event;
    },
  };
}

function setup() {
  const nodes = new Map();
  const get = (selector) => {
    if (!nodes.has(selector)) nodes.set(selector, element());
    return nodes.get(selector);
  };
  const buttons = Array.from({ length: 3 }, (_, index) => ({
    ...element(),
    dataset: { index: String(index) },
    querySelector: get,
  }));
  const stage = { querySelector: get, querySelectorAll: () => buttons };
  const document = { ...element(), querySelector: () => stage };
  runInNewContext(script, {
    document,
    runItems: JSON.stringify(buttons.map((_, index) => ({ title: `Project ${index + 1}` }))),
  });
  return {
    document,
    get,
    buttons,
    counter: () => get('[data-run-count]').textContent,
    front: get('[data-run-front]'),
  };
}

const touch = (x, y) => ({ clientX: x, clientY: y });
function swipe(front, from, to, target = front) {
  front.dispatch('touchstart', { target, touches: [from] });
  front.dispatch('touchend', { touches: [], changedTouches: [to] });
}

test('arrow keys navigate before any click and wrap in both directions', () => {
  const { document, counter } = setup();
  assert.equal(document.dispatch('keydown', { key: 'ArrowRight' }).defaultPrevented, true);
  assert.equal(counter(), '02 / 03');
  document.dispatch('keydown', { key: 'ArrowLeft' });
  assert.equal(counter(), '01 / 03');
  document.dispatch('keydown', { key: 'ArrowLeft' });
  assert.equal(counter(), '03 / 03');
  document.dispatch('keydown', { key: 'ArrowRight' });
  assert.equal(counter(), '01 / 03');
});

test('typing, modified shortcuts, handled events and unrelated keys are left alone', () => {
  const { document, counter } = setup();
  document.dispatch('keydown', { key: 'ArrowRight' });
  for (const properties of [
    { target: { closest: () => element() } },
    { altKey: true }, { ctrlKey: true }, { metaKey: true }, { shiftKey: true },
    { defaultPrevented: true },
    { key: 'ArrowDown' },
  ]) {
    const event = document.dispatch('keydown', { key: 'ArrowRight', ...properties });
    assert.equal(event.defaultPrevented, properties.defaultPrevented);
    assert.equal(counter(), '02 / 03');
  }
});

test('swipes navigate in both directions and share state with buttons and keys', () => {
  const { document, front, get, buttons, counter } = setup();
  swipe(front, touch(200, 100), touch(100, 110));
  assert.equal(counter(), '02 / 03');
  get('[data-run-next]').dispatch('click');
  assert.equal(counter(), '03 / 03');
  swipe(front, touch(100, 100), touch(200, 100));
  assert.equal(counter(), '02 / 03');
  document.dispatch('keydown', { key: 'ArrowRight' });
  assert.equal(counter(), '03 / 03');
  buttons[0].dispatch('click');
  swipe(front, touch(100, 100), touch(200, 100));
  assert.equal(counter(), '03 / 03');
});

test('taps, short drags, vertical or diagonal scrolls and links do not navigate', () => {
  const { front, document, counter } = setup();
  document.dispatch('keydown', { key: 'ArrowRight' });
  for (const end of [touch(100, 100), touch(130, 100), touch(110, 200), touch(200, 200)]) {
    swipe(front, touch(100, 100), end);
    assert.equal(counter(), '02 / 03');
  }
  swipe(front, touch(200, 100), touch(100, 100), { closest: () => element() });
  assert.equal(counter(), '02 / 03');
});

test('cancelled gestures and multi-touch cannot navigate or leave stale swipe state', () => {
  const { front, document, counter } = setup();
  document.dispatch('keydown', { key: 'ArrowRight' });
  const start = () => front.dispatch('touchstart', { touches: [touch(200, 100)] });
  const end = () => front.dispatch('touchend', { touches: [], changedTouches: [touch(100, 100)] });
  start();
  front.dispatch('touchcancel');
  end();
  assert.equal(counter(), '02 / 03');
  start();
  front.dispatch('touchmove', { touches: [touch(150, 100), touch(250, 100)] });
  end();
  assert.equal(counter(), '02 / 03');
  front.dispatch('touchstart', { touches: [touch(200, 100), touch(250, 100)] });
  end();
  assert.equal(counter(), '02 / 03');
  swipe(front, touch(200, 100), touch(100, 100));
  assert.equal(counter(), '03 / 03');
  end();
  assert.equal(counter(), '03 / 03');
});
