
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  regionsTable, 
  usersTable, 
  groupsTable, 
  groupMembersTable, 
  activitiesTable,
  attendanceTable 
} from '../db/schema';
import { 
  recordAttendance,
  getAttendanceByActivity,
  getUserAttendanceHistory,
  getAttendanceByUser,
  bulkRecordAttendance
} from '../handlers/attendance';
import { type CreateAttendanceInput } from '../schema';
import { eq, and } from 'drizzle-orm';

describe('Attendance Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let regionId: number;
  let adminUserId: number;
  let memberUserId: number;
  let groupId: number;
  let activityId: number;

  beforeEach(async () => {
    // Create test region
    const region = await db.insert(regionsTable)
      .values({
        name: 'Test Region',
        code: 'TR001'
      })
      .returning()
      .execute();
    regionId = region[0].id;

    // Create admin user
    const adminUser = await db.insert(usersTable)
      .values({
        username: 'admin_user',
        email: 'admin@test.com',
        password_hash: 'hash123',
        full_name: 'Admin User',
        nip: '123456789',
        role: 'admin_grup',
        region_id: regionId,
        level: 'smp'
      })
      .returning()
      .execute();
    adminUserId = adminUser[0].id;

    // Create member user
    const memberUser = await db.insert(usersTable)
      .values({
        username: 'member_user',
        email: 'member@test.com',
        password_hash: 'hash123',
        full_name: 'Member User',
        nip: '987654321',
        role: 'guru',
        region_id: regionId,
        level: 'smp'
      })
      .returning()
      .execute();
    memberUserId = memberUser[0].id;

    // Create group
    const group = await db.insert(groupsTable)
      .values({
        name: 'Test Group',
        type: 'mgmp',
        level: 'smp',
        region_id: regionId,
        description: 'Test group description'
      })
      .returning()
      .execute();
    groupId = group[0].id;

    // Add admin to group as admin
    await db.insert(groupMembersTable)
      .values({
        group_id: groupId,
        user_id: adminUserId,
        is_admin: true
      })
      .execute();

    // Add member to group
    await db.insert(groupMembersTable)
      .values({
        group_id: groupId,
        user_id: memberUserId,
        is_admin: false
      })
      .execute();

    // Create activity
    const activity = await db.insert(activitiesTable)
      .values({
        group_id: groupId,
        title: 'Test Activity',
        description: 'Test activity description',
        activity_date: new Date('2024-01-15'),
        start_time: '09:00',
        end_time: '12:00',
        location: 'Test Location',
        speaker: 'Test Speaker',
        funding_source: 'swadaya',
        status: 'published',
        created_by: adminUserId
      })
      .returning()
      .execute();
    activityId = activity[0].id;
  });

  describe('recordAttendance', () => {
    it('should record attendance successfully', async () => {
      const input: CreateAttendanceInput = {
        activity_id: activityId,
        user_id: memberUserId,
        is_present: true,
        notes: 'Present on time',
        recorded_by: adminUserId
      };

      const result = await recordAttendance(input);

      expect(result.activity_id).toBe(activityId);
      expect(result.user_id).toBe(memberUserId);
      expect(result.is_present).toBe(true);
      expect(result.notes).toBe('Present on time');
      expect(result.recorded_by).toBe(adminUserId);
      expect(result.id).toBeDefined();
      expect(result.recorded_at).toBeInstanceOf(Date);
    });

    it('should update existing attendance record', async () => {
      // First record attendance
      const input: CreateAttendanceInput = {
        activity_id: activityId,
        user_id: memberUserId,
        is_present: false,
        notes: 'Absent',
        recorded_by: adminUserId
      };

      await recordAttendance(input);

      // Update attendance
      const updateInput: CreateAttendanceInput = {
        activity_id: activityId,
        user_id: memberUserId,
        is_present: true,
        notes: 'Present but late',
        recorded_by: adminUserId
      };

      const result = await recordAttendance(updateInput);

      expect(result.is_present).toBe(true);
      expect(result.notes).toBe('Present but late');

      // Verify only one record exists
      const allRecords = await db.select()
        .from(attendanceTable)
        .where(and(
          eq(attendanceTable.activity_id, activityId),
          eq(attendanceTable.user_id, memberUserId)
        ))
        .execute();

      expect(allRecords).toHaveLength(1);
    });

    it('should throw error if recorder is not admin', async () => {
      const input: CreateAttendanceInput = {
        activity_id: activityId,
        user_id: memberUserId,
        is_present: true,
        notes: 'Present',
        recorded_by: memberUserId // Member trying to record attendance
      };

      expect(recordAttendance(input)).rejects.toThrow(/admin/i);
    });

    it('should throw error if activity does not exist', async () => {
      const input: CreateAttendanceInput = {
        activity_id: 999,
        user_id: memberUserId,
        is_present: true,
        notes: 'Present',
        recorded_by: adminUserId
      };

      expect(recordAttendance(input)).rejects.toThrow(/not found/i);
    });
  });

  describe('getAttendanceByActivity', () => {
    it('should get all attendance records for activity', async () => {
      // Record attendance for member
      const input: CreateAttendanceInput = {
        activity_id: activityId,
        user_id: memberUserId,
        is_present: true,
        notes: 'Present',
        recorded_by: adminUserId
      };

      await recordAttendance(input);

      const results = await getAttendanceByActivity(activityId);

      expect(results).toHaveLength(1);
      expect(results[0].activity_id).toBe(activityId);
      expect(results[0].user_id).toBe(memberUserId);
      expect(results[0].is_present).toBe(true);
    });

    it('should return empty array if no attendance records', async () => {
      const results = await getAttendanceByActivity(activityId);
      expect(results).toHaveLength(0);
    });
  });

  describe('getUserAttendanceHistory', () => {
    it('should get user attendance history with activity details', async () => {
      // Record attendance
      const input: CreateAttendanceInput = {
        activity_id: activityId,
        user_id: memberUserId,
        is_present: true,
        notes: 'Present',
        recorded_by: adminUserId
      };

      await recordAttendance(input);

      const results = await getUserAttendanceHistory(memberUserId);

      expect(results).toHaveLength(1);
      expect(results[0].activity_id).toBe(activityId);
      expect(results[0].is_present).toBe(true);
      expect(results[0].activity_title).toBe('Test Activity');
      expect(results[0].group_name).toBe('Test Group');
      expect(results[0].activity_date).toBeInstanceOf(Date);
    });

    it('should return empty array if user has no attendance history', async () => {
      const results = await getUserAttendanceHistory(memberUserId);
      expect(results).toHaveLength(0);
    });
  });

  describe('getAttendanceByUser', () => {
    it('should get specific attendance record for user and activity', async () => {
      // Record attendance
      const input: CreateAttendanceInput = {
        activity_id: activityId,
        user_id: memberUserId,
        is_present: true,
        notes: 'Present',
        recorded_by: adminUserId
      };

      await recordAttendance(input);

      const result = await getAttendanceByUser(memberUserId, activityId);

      expect(result).not.toBeNull();
      expect(result!.activity_id).toBe(activityId);
      expect(result!.user_id).toBe(memberUserId);
      expect(result!.is_present).toBe(true);
    });

    it('should return null if no attendance record found', async () => {
      const result = await getAttendanceByUser(memberUserId, activityId);
      expect(result).toBeNull();
    });
  });

  describe('bulkRecordAttendance', () => {
    it('should record multiple attendance records', async () => {
      // Create another member
      const secondMember = await db.insert(usersTable)
        .values({
          username: 'member2',
          email: 'member2@test.com',
          password_hash: 'hash123',
          full_name: 'Member Two',
          nip: '555666777',
          role: 'guru',
          region_id: regionId,
          level: 'smp'
        })
        .returning()
        .execute();

      await db.insert(groupMembersTable)
        .values({
          group_id: groupId,
          user_id: secondMember[0].id,
          is_admin: false
        })
        .execute();

      const attendanceRecords: CreateAttendanceInput[] = [
        {
          activity_id: activityId,
          user_id: memberUserId,
          is_present: true,
          notes: 'Present',
          recorded_by: adminUserId
        },
        {
          activity_id: activityId,
          user_id: secondMember[0].id,
          is_present: false,
          notes: 'Absent',
          recorded_by: adminUserId
        }
      ];

      const result = await bulkRecordAttendance(attendanceRecords);

      expect(result).toBe(true);

      // Verify both records were created
      const allRecords = await getAttendanceByActivity(activityId);
      expect(allRecords).toHaveLength(2);
    });

    it('should return true for empty array', async () => {
      const result = await bulkRecordAttendance([]);
      expect(result).toBe(true);
    });

    it('should throw error if records have different activities', async () => {
      // Create another activity
      const secondActivity = await db.insert(activitiesTable)
        .values({
          group_id: groupId,
          title: 'Second Activity',
          activity_date: new Date('2024-01-16'),
          start_time: '09:00',
          end_time: '12:00',
          location: 'Test Location 2',
          funding_source: 'swadaya',
          created_by: adminUserId
        })
        .returning()
        .execute();

      const attendanceRecords: CreateAttendanceInput[] = [
        {
          activity_id: activityId,
          user_id: memberUserId,
          is_present: true,
          notes: 'Present',
          recorded_by: adminUserId
        },
        {
          activity_id: secondActivity[0].id,
          user_id: memberUserId,
          is_present: true,
          notes: 'Present',
          recorded_by: adminUserId
        }
      ];

      expect(bulkRecordAttendance(attendanceRecords)).rejects.toThrow(/same activity/i);
    });
  });
});
