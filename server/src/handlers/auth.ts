
import { db } from '../db';
import { usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type LoginInput, type LoginResponse } from '../schema';

const JWT_SECRET = process.env['JWT_SECRET'] || 'your-secret-key';
const SALT_ROUNDS = 10;

// Simple password hashing using Bun's built-in crypto
async function hashPassword(password: string): Promise<string> {
  const hasher = new Bun.CryptoHasher('sha256');
  hasher.update(password + 'salt_secret');
  return hasher.digest('hex');
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const hasher = new Bun.CryptoHasher('sha256');
  hasher.update(password + 'salt_secret');
  const computedHash = hasher.digest('hex');
  return computedHash === hash;
}

// Simple JWT implementation
function createJWT(payload: any): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify({
    ...payload,
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
  }));
  
  const signature = new Bun.CryptoHasher('sha256')
    .update(`${encodedHeader}.${encodedPayload}.${JWT_SECRET}`)
    .digest('hex');
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function verifyJWT(token: string): any {
  const [header, payload, signature] = token.split('.');
  
  const expectedSignature = new Bun.CryptoHasher('sha256')
    .update(`${header}.${payload}.${JWT_SECRET}`)
    .digest('hex');
  
  if (signature !== expectedSignature) {
    throw new Error('Invalid token signature');
  }
  
  const decodedPayload = JSON.parse(atob(payload));
  
  if (decodedPayload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired');
  }
  
  return decodedPayload;
}

export async function login(input: LoginInput): Promise<LoginResponse> {
  try {
    // Find user by username
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, input.username))
      .execute();

    if (users.length === 0) {
      throw new Error('Invalid username or password');
    }

    const user = users[0];

    // Check if user is active
    if (!user.is_active) {
      throw new Error('Account is deactivated');
    }

    // Verify password
    const isPasswordValid = await verifyPassword(input.password, user.password_hash);
    if (!isPasswordValid) {
      throw new Error('Invalid username or password');
    }

    // Update last_login timestamp
    await db.update(usersTable)
      .set({ last_login: new Date() })
      .where(eq(usersTable.id, user.id))
      .execute();

    // Generate JWT token
    const token = createJWT({ 
      userId: user.id, 
      username: user.username, 
      role: user.role 
    });

    // Return user data and token
    return {
      user: user,
      token
    };
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}

export async function resetPassword(userId: number, newPassword: string): Promise<boolean> {
  try {
    // Check if user exists
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (users.length === 0) {
      throw new Error('User not found');
    }

    // Hash the new password
    const hashedPassword = await hashPassword(newPassword);

    // Update user's password_hash in database
    await db.update(usersTable)
      .set({ password_hash: hashedPassword })
      .where(eq(usersTable.id, userId))
      .execute();

    return true;
  } catch (error) {
    console.error('Password reset failed:', error);
    throw error;
  }
}

// Export utility functions for testing
export { hashPassword, verifyPassword, verifyJWT };
