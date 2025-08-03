
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, regionsTable, schoolsTable } from '../db/schema';
import { type CreateUserInput, type GetUsersQuery } from '../schema';
import { createUser, getUsers, getUserById, updateUserStatus, getUsersByRole } from '../handlers/users';
import { eq } from 'drizzle-orm';

// Test input data
const testRegion = {
  name: 'Test Region',
  code: 'TR001'
};

const testSchool = {
  name: 'Test School',
  npsn: '12345678',
  address: 'Test Address',
  level: 'smp' as const,
  region_id: 1
};

const testUserInput: CreateUserInput = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'password123',
  full_name: 'Test User',
  nip: '123456789',
  role: 'guru',
  school_id: 1,
  region_id: 1,
  level: 'smp'
};

const testUserInputMinimal: CreateUserInput = {
  username: 'minimaluser',
  email: 'minimal@example.com',
  password: 'password123',
  full_name: 'Minimal User',
  nip: null,
  role: 'kepala_sekolah',
  school_id: null,
  region_id: null,
  level: null
};

describe('User Handlers', () => {
  beforeEach(async () => {
    await createDB();
    
    // Create prerequisite data
    await db.insert(regionsTable).values(testRegion).execute();
    await db.insert(schoolsTable).values(testSchool).execute();
  });

  afterEach(resetDB);

  describe('createUser', () => {
    it('should create a user with all fields', async () => {
      const result = await createUser(testUserInput);

      expect(result.username).toEqual('testuser');
      expect(result.email).toEqual('test@example.com');
      expect(result.full_name).toEqual('Test User');
      expect(result.nip).toEqual('123456789');
      expect(result.role).toEqual('guru');
      expect(result.school_id).toEqual(1);
      expect(result.region_id).toEqual(1);
      expect(result.level).toEqual('smp');
      expect(result.is_active).toBe(true);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.password_hash).toBeDefined();
      expect(result.password_hash).not.toEqual('password123'); // Should be hashed
    });

    it('should create a user with minimal fields', async () => {
      const result = await createUser(testUserInputMinimal);

      expect(result.username).toEqual('minimaluser');
      expect(result.email).toEqual('minimal@example.com');
      expect(result.full_name).toEqual('Minimal User');
      expect(result.nip).toBeNull();
      expect(result.role).toEqual('kepala_sekolah');
      expect(result.school_id).toBeNull();
      expect(result.region_id).toBeNull();
      expect(result.level).toBeNull();
      expect(result.is_active).toBe(true);
    });

    it('should save user to database', async () => {
      const result = await createUser(testUserInput);

      const users = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, result.id))
        .execute();

      expect(users).toHaveLength(1);
      expect(users[0].username).toEqual('testuser');
      expect(users[0].email).toEqual('test@example.com');
      expect(users[0].is_active).toBe(true);
    });

    it('should hash the password', async () => {
      const result = await createUser(testUserInput);

      expect(result.password_hash).toBeDefined();
      expect(result.password_hash).not.toEqual('password123');
      expect(result.password_hash.length).toBeGreaterThan(20);

      // Verify password can be verified using Bun's password verification
      const isValid = await Bun.password.verify('password123', result.password_hash);
      expect(isValid).toBe(true);
    });

    it('should handle foreign key references', async () => {
      const result = await createUser(testUserInput);

      expect(result.school_id).toEqual(1);
      expect(result.region_id).toEqual(1);

      // Verify foreign key constraints work
      const user = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, result.id))
        .execute();

      expect(user[0].school_id).toEqual(1);
      expect(user[0].region_id).toEqual(1);
    });
  });

  describe('getUsers', () => {
    let inactiveUserId: number;

    beforeEach(async () => {
      // Create test users with different attributes
      await createUser(testUserInput);
      await createUser({
        ...testUserInputMinimal,
        username: 'admin1',
        email: 'admin1@example.com',
        role: 'super_admin'
      });
      
      // Create a user and then make it inactive
      const inactiveUser = await createUser({
        ...testUserInput,
        username: 'teacher2',
        email: 'teacher2@example.com',
        role: 'guru'
      });
      inactiveUserId = inactiveUser.id;
      await updateUserStatus(inactiveUserId, false);
    });

    it('should get all users without filters', async () => {
      const result = await getUsers();

      expect(result).toHaveLength(3);
      expect(result.every(user => user.id !== undefined)).toBe(true);
      expect(result.every(user => user.created_at instanceof Date)).toBe(true);
    });

    it('should filter users by role', async () => {
      const query: GetUsersQuery = { role: 'guru' };
      const result = await getUsers(query);

      expect(result).toHaveLength(2);
      expect(result.every(user => user.role === 'guru')).toBe(true);
    });

    it('should filter users by region_id', async () => {
      const query: GetUsersQuery = { region_id: 1 };
      const result = await getUsers(query);

      expect(result).toHaveLength(2);
      expect(result.every(user => user.region_id === 1)).toBe(true);
    });

    it('should filter users by school_id', async () => {
      const query: GetUsersQuery = { school_id: 1 };
      const result = await getUsers(query);

      expect(result).toHaveLength(2);
      expect(result.every(user => user.school_id === 1)).toBe(true);
    });

    it('should filter users by is_active', async () => {
      const query: GetUsersQuery = { is_active: true };
      const result = await getUsers(query);

      expect(result).toHaveLength(2);
      expect(result.every(user => user.is_active === true)).toBe(true);
    });

    it('should filter users by multiple conditions', async () => {
      const query: GetUsersQuery = { 
        role: 'guru',
        is_active: true,
        region_id: 1
      };
      const result = await getUsers(query);

      expect(result).toHaveLength(1);
      expect(result[0].role).toEqual('guru');
      expect(result[0].is_active).toBe(true);
      expect(result[0].region_id).toEqual(1);
    });
  });

  describe('getUserById', () => {
    it('should get user by ID', async () => {
      const created = await createUser(testUserInput);
      const result = await getUserById(created.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(created.id);
      expect(result!.username).toEqual('testuser');
      expect(result!.email).toEqual('test@example.com');
    });

    it('should return null for non-existent user', async () => {
      const result = await getUserById(999);

      expect(result).toBeNull();
    });
  });

  describe('updateUserStatus', () => {
    it('should update user status to inactive', async () => {
      const created = await createUser(testUserInput);
      expect(created.is_active).toBe(true);

      const updateResult = await updateUserStatus(created.id, false);
      expect(updateResult).toBe(true);

      const updated = await getUserById(created.id);
      expect(updated!.is_active).toBe(false);
    });

    it('should update user status to active', async () => {
      const created = await createUser(testUserInput);
      
      // First set to inactive
      await updateUserStatus(created.id, false);
      
      // Then set back to active
      const updateResult = await updateUserStatus(created.id, true);
      expect(updateResult).toBe(true);

      const updated = await getUserById(created.id);
      expect(updated!.is_active).toBe(true);
    });

    it('should return false for non-existent user', async () => {
      const result = await updateUserStatus(999, false);
      expect(result).toBe(false);
    });
  });

  describe('getUsersByRole', () => {
    beforeEach(async () => {
      await createUser(testUserInput); // guru
      await createUser({
        ...testUserInput,
        username: 'admin1',
        email: 'admin1@example.com',
        role: 'super_admin'
      });
      await createUser({
        ...testUserInput,
        username: 'teacher2',
        email: 'teacher2@example.com',
        role: 'guru'
      });
    });

    it('should get users by role guru', async () => {
      const result = await getUsersByRole('guru');

      expect(result).toHaveLength(2);
      expect(result.every(user => user.role === 'guru')).toBe(true);
    });

    it('should get users by role super_admin', async () => {
      const result = await getUsersByRole('super_admin');

      expect(result).toHaveLength(1);
      expect(result[0].role).toEqual('super_admin');
      expect(result[0].username).toEqual('admin1');
    });

    it('should return empty array for role without users', async () => {
      // Use a valid role that doesn't have any users in our test data
      const result = await getUsersByRole('kepala_cabdin');

      expect(result).toHaveLength(0);
    });
  });
});
