
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { regionsTable, groupsTable, usersTable, groupMembersTable, activitiesTable } from '../db/schema';
import { type CreateActivityInput } from '../schema';
import { 
  createActivity, 
  getActivities, 
  getActivityById, 
  updateActivityStatus, 
  getUpcomingActivities, 
  getActivitiesByGroup 
} from '../handlers/activities';
import { eq } from 'drizzle-orm';

describe('Activities handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let regionId: number;
  let groupId: number;
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

    const user = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashed_password',
        full_name: 'Test User',
        nip: '123456789',
        role: 'guru',
        region_id: regionId
      })
      .returning()
      .execute();
    userId = user[0].id;
  });

  describe('createActivity', () => {
    it('should create an activity', async () => {
      const testInput: CreateActivityInput = {
        group_id: groupId,
        title: 'Test Activity',
        description: 'A test activity',
        activity_date: new Date('2024-06-15'),
        start_time: '09:00',
        end_time: '12:00',
        location: 'Test Location',
        speaker: 'Test Speaker',
        funding_source: 'apbd',
        created_by: userId
      };

      const result = await createActivity(testInput);

      expect(result.title).toEqual('Test Activity');
      expect(result.description).toEqual('A test activity');
      expect(result.activity_date).toEqual(new Date('2024-06-15'));
      expect(result.start_time).toEqual('09:00');
      expect(result.end_time).toEqual('12:00');
      expect(result.location).toEqual('Test Location');
      expect(result.speaker).toEqual('Test Speaker');
      expect(result.funding_source).toEqual('apbd');
      expect(result.status).toEqual('draft');
      expect(result.group_id).toEqual(groupId);
      expect(result.created_by).toEqual(userId);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should save activity to database', async () => {
      const testInput: CreateActivityInput = {
        group_id: groupId,
        title: 'Test Activity',
        description: 'A test activity',
        activity_date: new Date('2024-06-15'),
        start_time: '09:00',
        end_time: '12:00',
        location: 'Test Location',
        speaker: 'Test Speaker',
        funding_source: 'apbd',
        created_by: userId
      };

      const result = await createActivity(testInput);

      const activities = await db.select()
        .from(activitiesTable)
        .where(eq(activitiesTable.id, result.id))
        .execute();

      expect(activities).toHaveLength(1);
      expect(activities[0].title).toEqual('Test Activity');
      expect(activities[0].group_id).toEqual(groupId);
      expect(activities[0].created_by).toEqual(userId);
    });
  });

  describe('getActivities', () => {
    beforeEach(async () => {
      // Create test activities
      await db.insert(activitiesTable).values([
        {
          group_id: groupId,
          title: 'Activity 1',
          activity_date: new Date('2024-06-15'),
          start_time: '09:00',
          end_time: '12:00',
          location: 'Location 1',
          funding_source: 'apbd',
          status: 'published',
          created_by: userId
        },
        {
          group_id: groupId,
          title: 'Activity 2',
          activity_date: new Date('2024-06-20'),
          start_time: '14:00',
          end_time: '17:00',
          location: 'Location 2',
          funding_source: 'apbn',
          status: 'draft',
          created_by: userId
        }
      ]).execute();
    });

    it('should get all activities without filters', async () => {
      const result = await getActivities();
      expect(result).toHaveLength(2);
    });

    it('should filter activities by group_id', async () => {
      const result = await getActivities({ group_id: groupId });
      expect(result).toHaveLength(2);
      result.forEach(activity => {
        expect(activity.group_id).toEqual(groupId);
      });
    });

    it('should filter activities by status', async () => {
      const result = await getActivities({ status: 'published' });
      expect(result).toHaveLength(1);
      expect(result[0].status).toEqual('published');
    });

    it('should filter activities by date range', async () => {
      const result = await getActivities({
        date_from: new Date('2024-06-14'),
        date_to: new Date('2024-06-16')
      });
      expect(result).toHaveLength(1);
      expect(result[0].title).toEqual('Activity 1');
    });
  });

  describe('getActivityById', () => {
    it('should get activity by ID', async () => {
      const activity = await db.insert(activitiesTable)
        .values({
          group_id: groupId,
          title: 'Test Activity',
          activity_date: new Date('2024-06-15'),
          start_time: '09:00',
          end_time: '12:00',
          location: 'Test Location',
          funding_source: 'apbd',
          created_by: userId
        })
        .returning()
        .execute();

      const result = await getActivityById(activity[0].id);
      expect(result).toBeDefined();
      expect(result!.id).toEqual(activity[0].id);
      expect(result!.title).toEqual('Test Activity');
    });

    it('should return null for non-existent activity', async () => {
      const result = await getActivityById(99999);
      expect(result).toBeNull();
    });
  });

  describe('updateActivityStatus', () => {
    it('should update activity status', async () => {
      const activity = await db.insert(activitiesTable)
        .values({
          group_id: groupId,
          title: 'Test Activity',
          activity_date: new Date('2024-06-15'),
          start_time: '09:00',
          end_time: '12:00',
          location: 'Test Location',
          funding_source: 'apbd',
          created_by: userId
        })
        .returning()
        .execute();

      const result = await updateActivityStatus(activity[0].id, 'published');
      expect(result).toBe(true);

      const updatedActivity = await db.select()
        .from(activitiesTable)
        .where(eq(activitiesTable.id, activity[0].id))
        .execute();

      expect(updatedActivity[0].status).toEqual('published');
    });

    it('should return false for non-existent activity', async () => {
      const result = await updateActivityStatus(99999, 'published');
      expect(result).toBe(false);
    });
  });

  describe('getUpcomingActivities', () => {
    it('should get upcoming activities for user', async () => {
      // Add user to group
      await db.insert(groupMembersTable)
        .values({
          group_id: groupId,
          user_id: userId,
          is_admin: false
        })
        .execute();

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      await db.insert(activitiesTable)
        .values({
          group_id: groupId,
          title: 'Upcoming Activity',
          activity_date: tomorrow,
          start_time: '09:00',
          end_time: '12:00',
          location: 'Test Location',
          funding_source: 'apbd',
          created_by: userId
        })
        .execute();

      const result = await getUpcomingActivities(userId);
      expect(result).toHaveLength(1);
      expect(result[0].title).toEqual('Upcoming Activity');
    });

    it('should not return past activities', async () => {
      // Add user to group
      await db.insert(groupMembersTable)
        .values({
          group_id: groupId,
          user_id: userId,
          is_admin: false
        })
        .execute();

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await db.insert(activitiesTable)
        .values({
          group_id: groupId,
          title: 'Past Activity',
          activity_date: yesterday,
          start_time: '09:00',
          end_time: '12:00',
          location: 'Test Location',
          funding_source: 'apbd',
          created_by: userId
        })
        .execute();

      const result = await getUpcomingActivities(userId);
      expect(result).toHaveLength(0);
    });
  });

  describe('getActivitiesByGroup', () => {
    it('should get activities by group', async () => {
      await db.insert(activitiesTable).values([
        {
          group_id: groupId,
          title: 'Group Activity 1',
          activity_date: new Date('2024-06-15'),
          start_time: '09:00',
          end_time: '12:00',
          location: 'Location 1',
          funding_source: 'apbd',
          created_by: userId
        },
        {
          group_id: groupId,
          title: 'Group Activity 2',
          activity_date: new Date('2024-06-20'),
          start_time: '14:00',
          end_time: '17:00',
          location: 'Location 2',
          funding_source: 'apbn',
          created_by: userId
        }
      ]).execute();

      const result = await getActivitiesByGroup(groupId);
      expect(result).toHaveLength(2);
      result.forEach(activity => {
        expect(activity.group_id).toEqual(groupId);
      });
    });

    it('should return empty array for group with no activities', async () => {
      const result = await getActivitiesByGroup(groupId);
      expect(result).toHaveLength(0);
    });
  });
});
