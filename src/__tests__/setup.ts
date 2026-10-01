// Test setup — mock localStorage for happy-dom

// intake.js pads email_setup_code answers to a fixed time; no wait in tests.
process.env.EMAIL_CODE_ANSWER_FLOOR_MS = '0';
const store: Record<string, string> = {};

const localStorageMock: Storage = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { for (const k in store) delete store[k]; },
  get length() { return Object.keys(store).length; },
  key: (i: number) => Object.keys(store)[i] ?? null,
};

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

// Reset localStorage between tests
beforeEach(() => {
  localStorage.clear();
});
