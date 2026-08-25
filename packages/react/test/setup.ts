import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Unmount any React trees rendered during a test so state never leaks across
// cases (jsdom keeps the document between tests).
afterEach(() => cleanup());
