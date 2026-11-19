import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

const SALT = process.env.AUTH_SALT || 'hosteldesk_salt_2026';

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(`${password}_${SALT}`).digest('hex');
}

function ensureDataFile(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
}

export function getAllUsers(): StoredUser[] {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(USERS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('[authStore] Error reading users.json:', err);
    return [];
  }
}

export function saveAllUsers(users: StoredUser[]): void {
  ensureDataFile();
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
}

export function findUserByEmail(email: string): StoredUser | undefined {
  const users = getAllUsers();
  const normalized = email.trim().toLowerCase();
  return users.find((u) => u.email.toLowerCase() === normalized);
}

export function registerUser(name: string, email: string, password: string): { user: Omit<StoredUser, 'passwordHash'> } {
  const users = getAllUsers();
  const normalized = email.trim().toLowerCase();

  if (users.some((u) => u.email.toLowerCase() === normalized)) {
    throw new Error('An account with this email already exists');
  }

  const newUser: StoredUser = {
    id: 'user_' + crypto.randomUUID(),
    name: name.trim(),
    email: normalized,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  saveAllUsers(users);

  const { passwordHash: _, ...publicUser } = newUser;
  return { user: publicUser };
}

export function verifyUser(email: string, password: string): Omit<StoredUser, 'passwordHash'> {
  const user = findUserByEmail(email);
  if (!user) {
    throw new Error('No account found with this email');
  }

  const expectedHash = hashPassword(password);
  if (user.passwordHash !== expectedHash) {
    throw new Error('Incorrect password');
  }

  const { passwordHash: _, ...publicUser } = user;
  return publicUser;
}
