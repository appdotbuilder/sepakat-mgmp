
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, regionsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { login, resetPassword, hashPassword, verifyPassword, verifyJWT } from '../handlers/auth';
import { type LoginInput } from '../schema';

describe('Auth handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testRegionId: number;

  beforeEach(async () => {
    // Create test region first
    const regionResult = await db.insert(regionsTable)
      .values({
        name: 'Test Region',
        code: 'TR001'
      })
      .returning()
      .execute();
    
    testRegionId = regionResult[0].id;

    // Create test user with hashed password
    const hashedPassword = await hashPassword('testpassword123');
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: hashedPassword,
        full_name: 'Test User',
        nip: '123456789',
        role: 'guru',
        school_id: null,
        region_id: testRegionId,
        level: 'smp',
        is_active: true
      })
      .returning()
      .execute();
    
    testUserId = userResult[0].id;
  });

  describe('login', () => {
    it('should authenticate valid user credentials', async () => {
      const loginInput: LoginInput = {
        username: 'testuser',
        password: 'testpassword123'
      };

      const result = await login(loginInput);

      expect(result.user.id).toEqual(testUserId);
      expect(result.user.username).toEqual('testuser');
      expect(result.user.email).toEqual('test@example.com');
      expect(result.user.full_name).toEqual('Test User');
      expect(result.user.role).toEqual('guru');
      expect(result.user.is_active).toBe(true);
      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');
    });

    it('should update last_login timestamp', async () => {
      const loginInput: LoginInput = {
        username: 'testuser',
        password: 'testpassword123'
      };

      const beforeLogin = new Date();
      await login(loginInput);

      // Verify last_login was updated
      const updatedUsers = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, testUserId))
        .execute();

      const updatedUser = updatedUsers[0];
      expect(updatedUser.last_login).toBeInstanceOf(Date);
      expect(updatedUser.last_login!.getTime()).toBeGreaterThanOrEqual(beforeLogin.getTime());
    });

    it('should generate valid JWT token', async () => {
      const loginInput: LoginInput = {
        username: 'testuser',
        password: 'testpassword123'
      };

      const result = await login(loginInput);

      // Verify token can be decoded
      const decoded = verifyJWT(result.token);
      
      expect(decoded.userId).toEqual(testUserId);
      expect(decoded.username).toEqual('testuser');
      expect(decoded.role).toEqual('guru');
      expect(decoded.exp).toBeDefined();
    });

    it('should reject invalid username', async () => {
      const loginInput: LoginInput = {
        username: 'nonexistent',
        password: 'testpassword123'
      };

      await expect(login(loginInput)).rejects.toThrow(/invalid username or password/i);
    });

    it('should reject invalid password', async () => {
      const loginInput: LoginInput = {
        username: 'testuser',
        password: 'wrongpassword'
      };

      await expect(login(loginInput)).rejects.toThrow(/invalid username or password/i);
    });

    it('should reject inactive user', async () => {
      // Deactivate the test user
      await db.update(usersTable)
        .set({ is_active: false })
        .where(eq(usersTable.id, testUserId))
        .execute();

      const loginInput: LoginInput = {
        username: 'testuser',
        password: 'testpassword123'
      };

      await expect(login(loginInput)).rejects.toThrow(/account is deactivated/i);
    });
  });

  describe('resetPassword', () => {
    it('should reset user password successfully', async () => {
      const newPassword = 'newpassword456';
      const result = await resetPassword(testUserId, newPassword);

      expect(result).toBe(true);

      // Verify password was actually changed
      const updatedUsers = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, testUserId))
        .execute();

      const updatedUser = updatedUsers[0];
      const isNewPasswordValid = await verifyPassword(newPassword, updatedUser.password_hash);
      expect(isNewPasswordValid).toBe(true);

      // Verify old password no longer works
      const isOldPasswordValid = await verifyPassword('testpassword123', updatedUser.password_hash);
      expect(isOldPasswordValid).toBe(false);
    });

    it('should allow login with new password after reset', async () => {
      const newPassword = 'newpassword456';
      await resetPassword(testUserId, newPassword);

      const loginInput: LoginInput = {
        username: 'testuser',
        password: newPassword
      };

      const result = await login(loginInput);
      expect(result.user.username).toEqual('testuser');
      expect(result.token).toBeDefined();
    });

    it('should reject reset for non-existent user', async () => {
      const nonExistentUserId = 99999;
      const newPassword = 'newpassword456';

      await expect(resetPassword(nonExistentUserId, newPassword)).rejects.toThrow(/user not found/i);
    });

    it('should hash the new password properly', async () => {
      const newPassword = 'newpassword456';
      await resetPassword(testUserId, newPassword);

      // Get the updated user
      const updatedUsers = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, testUserId))
        .execute();

      const updatedUser = updatedUsers[0];
      
      // Verify password is hashed (not stored in plain text)
      expect(updatedUser.password_hash).not.toEqual(newPassword);
      expect(updatedUser.password_hash.length).toBeGreaterThan(10);
      
      // Verify hash is valid
      const isValidHash = await verifyPassword(newPassword, updatedUser.password_hash);
      expect(isValidHash).toBe(true);
    });
  });

  describe('password utilities', () => {
    it('should hash passwords consistently', async () => {
      const password = 'testpassword';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      
      // Same password should produce same hash (deterministic with salt)
      expect(hash1).toEqual(hash2);
      expect(hash1.length).toBeGreaterThan(10);
    });

    it('should verify passwords correctly', async () => {
      const password = 'testpassword';
      const hash = await hashPassword(password);
      
      const isValid = await verifyPassword(password, hash);
      const isInvalid = await verifyPassword('wrongpassword', hash);
      
      expect(isValid).toBe(true);
      expect(isInvalid).toBe(false);
    });

    it('should handle JWT token verification', async () => {
      const loginInput: LoginInput = {
        username: 'testuser',
        password: 'testpassword123'
      };

      const result = await login(loginInput);
      
      // Should not throw for valid token
      expect(() => verifyJWT(result.token)).not.toThrow();
      
      // Should throw for invalid token
      expect(() => verifyJWT('invalid.token.here')).toThrow();
    });
  });
});
