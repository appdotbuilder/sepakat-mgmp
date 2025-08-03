
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { announcementsTable, usersTable, regionsTable, schoolsTable } from '../db/schema';
import { type CreateAnnouncementInput } from '../schema';
import { 
  createAnnouncement, 
  getActiveAnnouncements, 
  getAllAnnouncements, 
  updateAnnouncementStatus, 
  deleteAnnouncement 
} from '../handlers/announcements';
import { eq } from 'drizzle-orm';

// Test data
const testRegion = {
  name: 'Test Region',
  code: 'TR001'
};

const testSchool = {
  name: 'Test School',
  npsn: '12345678',
  address: 'Test Address',
  level: 'smp' as const,
  region_id: 0 // Will be set after region creation
};

const testUser = {
  username: 'testadmin',
  email: 'admin@test.com',
  password_hash: 'hashed_password_123',
  full_name: 'Test Admin',
  nip: '123456789',
  role: 'super_admin' as const,
  school_id: null,
  region_id: 0, // Will be set after region creation
  level: null,
  is_active: true
};

const testAnnouncementInput: CreateAnnouncementInput = {
  title: 'Test Announcement',
  content: 'This is a test announcement content',
  created_by: 0 // Will be set after user creation
};

describe('Announcements Handlers', () => {
  beforeEach(async () => {
    await createDB();
    
    // Create prerequisite data
    // Create region
    const regionResult = await db.insert(regionsTable)
      .values(testRegion)
      .returning()
      .execute();
    
    testSchool.region_id = regionResult[0].id;
    testUser.region_id = regionResult[0].id;
    
    // Create school
    const schoolResult = await db.insert(schoolsTable)
      .values(testSchool)
      .returning()
      .execute();
    
    // Create user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    testAnnouncementInput.created_by = userResult[0].id;
  });

  afterEach(resetDB);

  describe('createAnnouncement', () => {
    it('should create an announcement', async () => {
      const result = await createAnnouncement(testAnnouncementInput);

      expect(result.title).toEqual('Test Announcement');
      expect(result.content).toEqual('This is a test announcement content');
      expect(result.created_by).toEqual(testAnnouncementInput.created_by);
      expect(result.is_active).toBe(true); // Default value
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should save announcement to database', async () => {
      const result = await createAnnouncement(testAnnouncementInput);

      const announcements = await db.select()
        .from(announcementsTable)
        .where(eq(announcementsTable.id, result.id))
        .execute();

      expect(announcements).toHaveLength(1);
      expect(announcements[0].title).toEqual('Test Announcement');
      expect(announcements[0].content).toEqual(testAnnouncementInput.content);
      expect(announcements[0].created_by).toEqual(testAnnouncementInput.created_by);
      expect(announcements[0].is_active).toBe(true);
    });
  });

  describe('getActiveAnnouncements', () => {
    beforeEach(async () => {
      // Create test announcements - one active, one inactive
      await db.insert(announcementsTable)
        .values([
          {
            title: 'Active Announcement',
            content: 'Active content',
            is_active: true,
            created_by: testAnnouncementInput.created_by
          },
          {
            title: 'Inactive Announcement',
            content: 'Inactive content',
            is_active: false,
            created_by: testAnnouncementInput.created_by
          }
        ])
        .execute();
    });

    it('should return only active announcements', async () => {
      const results = await getActiveAnnouncements();

      expect(results).toHaveLength(1);
      expect(results[0].title).toEqual('Active Announcement');
      expect(results[0].is_active).toBe(true);
    });

    it('should return empty array when no active announcements', async () => {
      // Deactivate all announcements
      await db.update(announcementsTable)
        .set({ is_active: false })
        .execute();

      const results = await getActiveAnnouncements();

      expect(results).toHaveLength(0);
    });
  });

  describe('getAllAnnouncements', () => {
    it('should return all announcements regardless of status', async () => {
      // Create test announcements - one active, one inactive
      await db.insert(announcementsTable)
        .values([
          {
            title: 'Active Announcement',
            content: 'Active content',
            is_active: true,
            created_by: testAnnouncementInput.created_by
          },
          {
            title: 'Inactive Announcement',
            content: 'Inactive content',
            is_active: false,
            created_by: testAnnouncementInput.created_by
          }
        ])
        .execute();

      const results = await getAllAnnouncements();

      expect(results).toHaveLength(2);
      
      const activeAnnouncement = results.find(a => a.title === 'Active Announcement');
      const inactiveAnnouncement = results.find(a => a.title === 'Inactive Announcement');
      
      expect(activeAnnouncement).toBeDefined();
      expect(activeAnnouncement?.is_active).toBe(true);
      expect(inactiveAnnouncement).toBeDefined();
      expect(inactiveAnnouncement?.is_active).toBe(false);
    });

    it('should return empty array when no announcements exist', async () => {
      const results = await getAllAnnouncements();

      expect(results).toHaveLength(0);
    });
  });

  describe('updateAnnouncementStatus', () => {
    let announcementId: number;

    beforeEach(async () => {
      const result = await db.insert(announcementsTable)
        .values({
          title: 'Test Announcement',
          content: 'Test content',
          is_active: true,
          created_by: testAnnouncementInput.created_by
        })
        .returning()
        .execute();
      
      announcementId = result[0].id;
    });

    it('should deactivate an active announcement', async () => {
      const success = await updateAnnouncementStatus(announcementId, false);

      expect(success).toBe(true);

      const announcement = await db.select()
        .from(announcementsTable)
        .where(eq(announcementsTable.id, announcementId))
        .execute();

      expect(announcement[0].is_active).toBe(false);
    });

    it('should activate an inactive announcement', async () => {
      // First deactivate
      await db.update(announcementsTable)
        .set({ is_active: false })
        .where(eq(announcementsTable.id, announcementId))
        .execute();

      const success = await updateAnnouncementStatus(announcementId, true);

      expect(success).toBe(true);

      const announcement = await db.select()
        .from(announcementsTable)
        .where(eq(announcementsTable.id, announcementId))
        .execute();

      expect(announcement[0].is_active).toBe(true);
    });

    it('should return false for non-existent announcement', async () => {
      const success = await updateAnnouncementStatus(99999, false);

      expect(success).toBe(false);
    });
  });

  describe('deleteAnnouncement', () => {
    let announcementId: number;

    beforeEach(async () => {
      const result = await db.insert(announcementsTable)
        .values({
          title: 'Test Announcement',
          content: 'Test content',
          is_active: true,
          created_by: testAnnouncementInput.created_by
        })
        .returning()
        .execute();
      
      announcementId = result[0].id;
    });

    it('should delete existing announcement', async () => {
      const success = await deleteAnnouncement(announcementId);

      expect(success).toBe(true);

      const announcements = await db.select()
        .from(announcementsTable)
        .where(eq(announcementsTable.id, announcementId))
        .execute();

      expect(announcements).toHaveLength(0);
    });

    it('should return false for non-existent announcement', async () => {
      const success = await deleteAnnouncement(99999);

      expect(success).toBe(false);
    });

    it('should remove announcement from database after deletion', async () => {
      await deleteAnnouncement(announcementId);

      const allAnnouncements = await db.select()
        .from(announcementsTable)
        .execute();

      expect(allAnnouncements.find(a => a.id === announcementId)).toBeUndefined();
    });
  });
});
