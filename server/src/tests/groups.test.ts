
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { regionsTable, usersTable, subjectsTable, groupsTable, groupMembersTable } from '../db/schema';
import { type CreateGroupInput } from '../schema';
import { 
  createGroup, 
  getGroups, 
  getGroupById, 
  addGroupMember, 
  removeGroupMember, 
  getGroupMembers, 
  setGroupAdmin 
} from '../handlers/groups';
import { eq, and } from 'drizzle-orm';

describe('Groups handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let regionId: number;
  let subjectId: number;
  let userId: number;

  beforeEach(async () => {
    // Create prerequisite data
    const region = await db.insert(regionsTable)
      .values({
        name: 'Test Region',
        code: 'TR01'
      })
      .returning()
      .execute();
    regionId = region[0].id;

    const subject = await db.insert(subjectsTable)
      .values({
        name: 'Mathematics',
        code: 'MTK',
        level: 'smp'
      })
      .returning()
      .execute();
    subjectId = subject[0].id;

    const user = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User',
        nip: '123456789',
        role: 'guru'
      })
      .returning()
      .execute();
    userId = user[0].id;
  });

  describe('createGroup', () => {
    const testInput: CreateGroupInput = {
      name: 'MGMP Matematika SMP',
      type: 'mgmp',
      level: 'smp',
      region_id: 1, // Will be updated in test
      subject_id: 1, // Will be updated in test
      description: 'MGMP untuk guru matematika SMP'
    };

    it('should create a group successfully', async () => {
      testInput.region_id = regionId;
      testInput.subject_id = subjectId;

      const result = await createGroup(testInput);

      expect(result.name).toEqual('MGMP Matematika SMP');
      expect(result.type).toEqual('mgmp');
      expect(result.level).toEqual('smp');
      expect(result.region_id).toEqual(regionId);
      expect(result.subject_id).toEqual(subjectId);
      expect(result.description).toEqual('MGMP untuk guru matematika SMP');
      expect(result.is_active).toBe(true);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should save group to database', async () => {
      testInput.region_id = regionId;
      testInput.subject_id = subjectId;

      const result = await createGroup(testInput);

      const groups = await db.select()
        .from(groupsTable)
        .where(eq(groupsTable.id, result.id))
        .execute();

      expect(groups).toHaveLength(1);
      expect(groups[0].name).toEqual('MGMP Matematika SMP');
      expect(groups[0].type).toEqual('mgmp');
      expect(groups[0].region_id).toEqual(regionId);
    });

    it('should create group without subject_id for MKKS', async () => {
      const mkksInput: CreateGroupInput = {
        name: 'MKKS SMP Wilayah 1',
        type: 'mkks',
        level: 'smp',
        region_id: regionId,
        subject_id: null,
        description: 'MKKS untuk kepala sekolah SMP'
      };

      const result = await createGroup(mkksInput);

      expect(result.name).toEqual('MKKS SMP Wilayah 1');
      expect(result.type).toEqual('mkks');
      expect(result.subject_id).toBeNull();
    });
  });

  describe('getGroups', () => {
    it('should return all active groups', async () => {
      // Create test groups
      await db.insert(groupsTable)
        .values([
          {
            name: 'MGMP Math',
            type: 'mgmp',
            level: 'smp',
            region_id: regionId,
            subject_id: subjectId,
            is_active: true
          },
          {
            name: 'MKKS SMP',
            type: 'mkks',
            level: 'smp',
            region_id: regionId,
            is_active: true
          },
          {
            name: 'Inactive Group',
            type: 'mgmp',
            level: 'sma',
            region_id: regionId,
            is_active: false
          }
        ])
        .execute();

      const result = await getGroups();

      expect(result).toHaveLength(2);
      expect(result.every(group => group.is_active)).toBe(true);
    });

    it('should return empty array when no active groups exist', async () => {
      const result = await getGroups();
      expect(result).toHaveLength(0);
    });
  });

  describe('getGroupById', () => {
    it('should return group when found', async () => {
      const group = await db.insert(groupsTable)
        .values({
          name: 'Test Group',
          type: 'mgmp',
          level: 'smp',
          region_id: regionId,
          subject_id: subjectId
        })
        .returning()
        .execute();

      const result = await getGroupById(group[0].id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(group[0].id);
      expect(result!.name).toEqual('Test Group');
    });

    it('should return null when group not found', async () => {
      const result = await getGroupById(999);
      expect(result).toBeNull();
    });
  });

  describe('addGroupMember', () => {
    let groupId: number;

    beforeEach(async () => {
      const group = await db.insert(groupsTable)
        .values({
          name: 'Test Group',
          type: 'mgmp',
          level: 'smp',
          region_id: regionId,
          subject_id: subjectId
        })
        .returning()
        .execute();
      groupId = group[0].id;
    });

    it('should add member successfully', async () => {
      const result = await addGroupMember(groupId, userId, false);

      expect(result).toBe(true);

      const members = await db.select()
        .from(groupMembersTable)
        .where(and(
          eq(groupMembersTable.group_id, groupId),
          eq(groupMembersTable.user_id, userId)
        ))
        .execute();

      expect(members).toHaveLength(1);
      expect(members[0].is_admin).toBe(false);
    });

    it('should add admin member', async () => {
      const result = await addGroupMember(groupId, userId, true);

      expect(result).toBe(true);

      const members = await db.select()
        .from(groupMembersTable)
        .where(and(
          eq(groupMembersTable.group_id, groupId),
          eq(groupMembersTable.user_id, userId)
        ))
        .execute();

      expect(members[0].is_admin).toBe(true);
    });

    it('should return false when user is already a member', async () => {
      // Add member first time
      await addGroupMember(groupId, userId, false);

      // Try to add same member again
      const result = await addGroupMember(groupId, userId, false);

      expect(result).toBe(false);
    });
  });

  describe('removeGroupMember', () => {
    let groupId: number;

    beforeEach(async () => {
      const group = await db.insert(groupsTable)
        .values({
          name: 'Test Group',
          type: 'mgmp',
          level: 'smp',
          region_id: regionId,
          subject_id: subjectId
        })
        .returning()
        .execute();
      groupId = group[0].id;

      // Add member first
      await db.insert(groupMembersTable)
        .values({
          group_id: groupId,
          user_id: userId,
          is_admin: false
        })
        .execute();
    });

    it('should remove member successfully', async () => {
      const result = await removeGroupMember(groupId, userId);

      expect(result).toBe(true);

      const members = await db.select()
        .from(groupMembersTable)
        .where(and(
          eq(groupMembersTable.group_id, groupId),
          eq(groupMembersTable.user_id, userId)
        ))
        .execute();

      expect(members).toHaveLength(0);
    });
  });

  describe('getGroupMembers', () => {
    let groupId: number;

    beforeEach(async () => {
      const group = await db.insert(groupsTable)
        .values({
          name: 'Test Group',
          type: 'mgmp',
          level: 'smp',
          region_id: regionId,
          subject_id: subjectId
        })
        .returning()
        .execute();
      groupId = group[0].id;

      // Add member
      await db.insert(groupMembersTable)
        .values({
          group_id: groupId,
          user_id: userId,
          is_admin: true
        })
        .execute();
    });

    it('should return group members with user details', async () => {
      const result = await getGroupMembers(groupId);

      expect(result).toHaveLength(1);
      expect(result[0].user_id).toEqual(userId);
      expect(result[0].user_full_name).toEqual('Test User');
      expect(result[0].user_email).toEqual('test@example.com');
      expect(result[0].user_role).toEqual('guru');
      expect(result[0].is_admin).toBe(true);
      expect(result[0].joined_at).toBeInstanceOf(Date);
    });

    it('should return empty array when no members exist', async () => {
      // Create new group without members
      const newGroup = await db.insert(groupsTable)
        .values({
          name: 'Empty Group',
          type: 'mgmp',
          level: 'smp',
          region_id: regionId,
          subject_id: subjectId
        })
        .returning()
        .execute();

      const result = await getGroupMembers(newGroup[0].id);
      expect(result).toHaveLength(0);
    });
  });

  describe('setGroupAdmin', () => {
    let groupId: number;

    beforeEach(async () => {
      const group = await db.insert(groupsTable)
        .values({
          name: 'Test Group',
          type: 'mgmp',
          level: 'smp',
          region_id: regionId,
          subject_id: subjectId
        })
        .returning()
        .execute();
      groupId = group[0].id;

      // Add member as non-admin
      await db.insert(groupMembersTable)
        .values({
          group_id: groupId,
          user_id: userId,
          is_admin: false
        })
        .execute();
    });

    it('should set member as admin', async () => {
      const result = await setGroupAdmin(groupId, userId, true);

      expect(result).toBe(true);

      const members = await db.select()
        .from(groupMembersTable)
        .where(and(
          eq(groupMembersTable.group_id, groupId),
          eq(groupMembersTable.user_id, userId)
        ))
        .execute();

      expect(members[0].is_admin).toBe(true);
    });

    it('should remove admin privileges', async () => {
      // First set as admin
      await setGroupAdmin(groupId, userId, true);

      // Then remove admin privileges
      const result = await setGroupAdmin(groupId, userId, false);

      expect(result).toBe(true);

      const members = await db.select()
        .from(groupMembersTable)
        .where(and(
          eq(groupMembersTable.group_id, groupId),
          eq(groupMembersTable.user_id, userId)
        ))
        .execute();

      expect(members[0].is_admin).toBe(false);
    });
  });
});
