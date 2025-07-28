import { vi } from 'vitest';

// Mock Node.js modules
vi.mock('bcryptjs', () => ({
  hash: vi.fn(),
  compare: vi.fn(),
  genSalt: vi.fn()
}));

vi.mock('jsonwebtoken', () => ({
  sign: vi.fn(),
  verify: vi.fn(),
  decode: vi.fn()
}));

vi.mock('express', () => ({
  default: vi.fn(() => ({
    use: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
    listen: vi.fn()
  })),
  Router: vi.fn(() => ({
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }))
}));

// Mock database
vi.mock('../server/db', () => ({
  UsersRepository: {
    findById: vi.fn(),
    findByEmail: vi.fn(),
    create: vi.fn(),
    update: vi.fn()
  }
}));

// Global test setup
global.console = {
  ...console,
  // Suppress console.log in tests unless needed
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn()
};