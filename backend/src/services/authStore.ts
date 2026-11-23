import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { supabase } from '../db/supabase.js';

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

export async function registerUser(name: string, email: string, password: string): Promise<{ user: Omit<StoredUser, 'passwordHash'> }> {
  const normalized = email.trim().toLowerCase();
  const passwordHash = hashPassword(password);
  const now = new Date().toISOString();

  // 1. Try Supabase PostgreSQL Database first
  if (supabase) {
    try {
      const { data: existing, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('email', normalized)
        .maybeSingle();

      if (checkError) {
        console.warn('[authStore] Supabase check user warning:', checkError.message);
      } else if (existing) {
        throw new Error('An account with this email already exists');
      }

      const { data: createdUser, error: insertError } = await supabase
        .from('users')
        .insert({
          email: normalized,
          password_hash: passwordHash,
          full_name: name.trim(),
          global_role: 'owner',
        })
        .select('id, email, full_name, global_role, created_at')
        .single();

      if (insertError) {
        console.error('[authStore] Supabase user insert failed:', insertError.message);
      } else if (createdUser) {
        console.log(`✅ [Supabase DB] Successfully stored new user in 'users' table: ${createdUser.email} (UUID: ${createdUser.id})`);
        
        // Also keep local file in sync
        const localUsers = getAllUsers();
        if (!localUsers.some((u) => u.email === normalized)) {
          localUsers.push({
            id: createdUser.id,
            name: createdUser.full_name,
            email: createdUser.email,
            passwordHash,
            createdAt: createdUser.created_at || now,
          });
          saveAllUsers(localUsers);
        }

        return {
          user: {
            id: createdUser.id,
            name: createdUser.full_name,
            email: createdUser.email,
            createdAt: createdUser.created_at,
          },
        };
      }
    } catch (err: any) {
      if (err.message && err.message.includes('already exists')) {
        throw err;
      }
      console.warn('[authStore] Supabase registration fallback to file storage:', err.message);
    }
  }

  // 2. Fallback to file storage
  const users = getAllUsers();
  if (users.some((u) => u.email.toLowerCase() === normalized)) {
    throw new Error('An account with this email already exists');
  }

  const newUser: StoredUser = {
    id: 'user_' + crypto.randomUUID(),
    name: name.trim(),
    email: normalized,
    passwordHash,
    createdAt: now,
  };

  users.push(newUser);
  saveAllUsers(users);

  const { passwordHash: _, ...publicUser } = newUser;
  return { user: publicUser };
}

export async function verifyUser(email: string, password: string): Promise<Omit<StoredUser, 'passwordHash'>> {
  const normalized = email.trim().toLowerCase();
  const expectedHash = hashPassword(password);

  // 1. Try Supabase PostgreSQL Database first
  if (supabase) {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', normalized)
        .maybeSingle();

      if (error) {
        console.warn('[authStore] Supabase query warning during verify:', error.message);
      } else if (user) {
        if (user.password_hash !== expectedHash) {
          throw new Error('Incorrect password');
        }
        console.log(`✅ [Supabase DB] Verified user from 'users' table: ${user.email}`);
        return {
          id: user.id,
          name: user.full_name,
          email: user.email,
          createdAt: user.created_at,
        };
      }
    } catch (err: any) {
      if (err.message && (err.message.includes('Incorrect password') || err.message.includes('No account found'))) {
        throw err;
      }
      console.warn('[authStore] Supabase verify fallback to file storage:', err.message);
    }
  }

  // 2. Fallback to file storage
  const users = getAllUsers();
  const user = users.find((u) => u.email.toLowerCase() === normalized);
  if (!user) {
    throw new Error('No account found with this email');
  }

  if (user.passwordHash !== expectedHash) {
    throw new Error('Incorrect password');
  }

  const { passwordHash: _, ...publicUser } = user;
  return publicUser;
}
