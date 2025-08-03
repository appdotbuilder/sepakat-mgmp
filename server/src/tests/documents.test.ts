
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  documentsTable, 
  usersTable, 
  regionsTable, 
  schoolsTable, 
  groupsTable, 
  activitiesTable 
} from '../db/schema';
import { type CreateDocumentInput } from '../schema';
import { eq } from 'drizzle-orm';
import {
  uploadDocument,
  getDocumentsByUser,
  getDocumentsByActivity,
  getDocumentsByGroup,
  deleteDocument,
  getDocumentById
} from '../handlers/documents';

describe('Documents handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Create test data
  const setupTestData = async () => {
    // Create region
    const regionResult = await db.insert(regionsTable)
      .values({
        name: 'Test Region',
        code: 'TR01'
      })
      .returning()
      .execute();
    const region = regionResult[0];

    // Create school
    const schoolResult = await db.insert(schoolsTable)
      .values({
        name: 'Test School',
        npsn: '12345678',
        address: 'Test Address',
        level: 'smp',
        region_id: region.id
      })
      .returning()
      .execute();
    const school = schoolResult[0];

    // Create users
    const userResult = await db.insert(usersTable)
      .values([
        {
          username: 'testuser',
          email: 'test@example.com',
          password_hash: 'hash123',
          full_name: 'Test User',
          nip: '123456789',
          role: 'guru',
          school_id: school.id,
          region_id: region.id,
          level: 'smp'
        },
        {
          username: 'uploader',
          email: 'uploader@example.com',
          password_hash: 'hash456',
          full_name: 'Document Uploader',
          nip: '987654321',
          role: 'admin_grup',
          region_id: region.id
        }
      ])
      .returning()
      .execute();
    const [user, uploader] = userResult;

    // Create group
    const groupResult = await db.insert(groupsTable)
      .values({
        name: 'Test Group',
        type: 'mgmp',
        level: 'smp',
        region_id: region.id,
        description: 'Test group for documents'
      })
      .returning()
      .execute();
    const group = groupResult[0];

    // Create activity
    const activityResult = await db.insert(activitiesTable)
      .values({
        group_id: group.id,
        title: 'Test Activity',
        description: 'Test activity for documents',
        activity_date: new Date('2024-01-15'),
        start_time: '09:00',
        end_time: '12:00',
        location: 'Test Location',
        funding_source: 'apbd',
        created_by: uploader.id
      })
      .returning()
      .execute();
    const activity = activityResult[0];

    return { region, school, user, uploader, group, activity };
  };

  describe('uploadDocument', () => {
    it('should upload document with all valid data', async () => {
      const { user, uploader, group, activity } = await setupTestData();

      const testInput: CreateDocumentInput = {
        user_id: user.id,
        activity_id: activity.id,
        group_id: group.id,
        title: 'Test Document',
        description: 'A test document upload',
        file_path: '/uploads/test.pdf',
        file_name: 'test.pdf',
        file_size: 1024,
        mime_type: 'application/pdf',
        document_type: 'pelatihan_sertifikat',
        uploaded_by: uploader.id
      };

      const result = await uploadDocument(testInput);

      expect(result.id).toBeDefined();
      expect(result.title).toBe('Test Document');
      expect(result.user_id).toBe(user.id);
      expect(result.activity_id).toBe(activity.id);
      expect(result.group_id).toBe(group.id);
      expect(result.file_name).toBe('test.pdf');
      expect(result.file_size).toBe(1024);
      expect(result.document_type).toBe('pelatihan_sertifikat');
      expect(result.uploaded_by).toBe(uploader.id);
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should upload document with minimal data', async () => {
      const { uploader } = await setupTestData();

      const testInput: CreateDocumentInput = {
        user_id: null,
        activity_id: null,
        group_id: null,
        title: 'Minimal Document',
        description: null,
        file_path: '/uploads/minimal.pdf',
        file_name: 'minimal.pdf',
        file_size: 512,
        mime_type: 'application/pdf',
        document_type: 'lainnya',
        uploaded_by: uploader.id
      };

      const result = await uploadDocument(testInput);

      expect(result.id).toBeDefined();
      expect(result.title).toBe('Minimal Document');
      expect(result.user_id).toBeNull();
      expect(result.activity_id).toBeNull();
      expect(result.group_id).toBeNull();
      expect(result.uploaded_by).toBe(uploader.id);
    });

    it('should save document to database', async () => {
      const { user, uploader } = await setupTestData();

      const testInput: CreateDocumentInput = {
        user_id: user.id,
        activity_id: null,
        group_id: null,
        title: 'Database Test Document',
        description: 'Testing database save',
        file_path: '/uploads/db-test.pdf',
        file_name: 'db-test.pdf',
        file_size: 2048,
        mime_type: 'application/pdf',
        document_type: 'karya_ilmiah',
        uploaded_by: uploader.id
      };

      const result = await uploadDocument(testInput);

      const documents = await db.select()
        .from(documentsTable)
        .where(eq(documentsTable.id, result.id))
        .execute();

      expect(documents).toHaveLength(1);
      expect(documents[0].title).toBe('Database Test Document');
      expect(documents[0].file_size).toBe(2048);
      expect(documents[0].document_type).toBe('karya_ilmiah');
    });

    it('should throw error for non-existent uploader', async () => {
      const testInput: CreateDocumentInput = {
        user_id: null,
        activity_id: null,
        group_id: null,
        title: 'Invalid Upload',
        description: null,
        file_path: '/uploads/invalid.pdf',
        file_name: 'invalid.pdf',
        file_size: 1024,
        mime_type: 'application/pdf',
        document_type: 'lainnya',
        uploaded_by: 999
      };

      expect(uploadDocument(testInput)).rejects.toThrow(/uploader user not found/i);
    });

    it('should throw error for non-existent user_id', async () => {
      const { uploader } = await setupTestData();

      const testInput: CreateDocumentInput = {
        user_id: 999,
        activity_id: null,
        group_id: null,
        title: 'Invalid User',
        description: null,
        file_path: '/uploads/invalid.pdf',
        file_name: 'invalid.pdf',
        file_size: 1024,
        mime_type: 'application/pdf',
        document_type: 'lainnya',
        uploaded_by: uploader.id
      };

      expect(uploadDocument(testInput)).rejects.toThrow(/user not found/i);
    });
  });

  describe('getDocumentsByUser', () => {
    it('should return documents for existing user', async () => {
      const { user, uploader } = await setupTestData();

      // Upload test documents
      await uploadDocument({
        user_id: user.id,
        activity_id: null,
        group_id: null,
        title: 'User Document 1',
        description: null,
        file_path: '/uploads/user1.pdf',
        file_name: 'user1.pdf',
        file_size: 1024,
        mime_type: 'application/pdf',
        document_type: 'pelatihan_sertifikat',
        uploaded_by: uploader.id
      });

      await uploadDocument({
        user_id: user.id,
        activity_id: null,
        group_id: null,
        title: 'User Document 2',
        description: null,
        file_path: '/uploads/user2.pdf',
        file_name: 'user2.pdf',
        file_size: 2048,
        mime_type: 'application/pdf',
        document_type: 'workshop',
        uploaded_by: uploader.id
      });

      const results = await getDocumentsByUser(user.id);

      expect(results).toHaveLength(2);
      expect(results[0].user_id).toBe(user.id);
      expect(results[1].user_id).toBe(user.id);
      expect(results.map(d => d.title)).toContain('User Document 1');
      expect(results.map(d => d.title)).toContain('User Document 2');
    });

    it('should return empty array for user with no documents', async () => {
      const { user } = await setupTestData();

      const results = await getDocumentsByUser(user.id);

      expect(results).toHaveLength(0);
    });

    it('should throw error for non-existent user', async () => {
      expect(getDocumentsByUser(999)).rejects.toThrow(/user not found/i);
    });
  });

  describe('getDocumentsByActivity', () => {
    it('should return documents for existing activity', async () => {
      const { uploader, activity } = await setupTestData();

      await uploadDocument({
        user_id: null,
        activity_id: activity.id,
        group_id: null,
        title: 'Activity Document',
        description: 'Document for activity',
        file_path: '/uploads/activity.pdf',
        file_name: 'activity.pdf',
        file_size: 1024,
        mime_type: 'application/pdf',
        document_type: 'seminar',
        uploaded_by: uploader.id
      });

      const results = await getDocumentsByActivity(activity.id);

      expect(results).toHaveLength(1);
      expect(results[0].activity_id).toBe(activity.id);
      expect(results[0].title).toBe('Activity Document');
    });

    it('should throw error for non-existent activity', async () => {
      expect(getDocumentsByActivity(999)).rejects.toThrow(/activity not found/i);
    });
  });

  describe('getDocumentsByGroup', () => {
    it('should return documents for existing group', async () => {
      const { uploader, group } = await setupTestData();

      await uploadDocument({
        user_id: null,
        activity_id: null,
        group_id: group.id,
        title: 'Group Document',
        description: 'Document for group',
        file_path: '/uploads/group.pdf',
        file_name: 'group.pdf',
        file_size: 1024,
        mime_type: 'application/pdf',
        document_type: 'penelitian',
        uploaded_by: uploader.id
      });

      const results = await getDocumentsByGroup(group.id);

      expect(results).toHaveLength(1);
      expect(results[0].group_id).toBe(group.id);
      expect(results[0].title).toBe('Group Document');
    });

    it('should throw error for non-existent group', async () => {
      expect(getDocumentsByGroup(999)).rejects.toThrow(/group not found/i);
    });
  });

  describe('deleteDocument', () => {
    it('should delete document by owner', async () => {
      const { user, uploader } = await setupTestData();

      const doc = await uploadDocument({
        user_id: user.id,
        activity_id: null,
        group_id: null,
        title: 'Document to Delete',
        description: null,
        file_path: '/uploads/delete.pdf',
        file_name: 'delete.pdf',
        file_size: 1024,
        mime_type: 'application/pdf',
        document_type: 'lainnya',
        uploaded_by: uploader.id
      });

      const result = await deleteDocument(doc.id, user.id);

      expect(result).toBe(true);

      const deletedDoc = await getDocumentById(doc.id);
      expect(deletedDoc).toBeNull();
    });

    it('should delete document by uploader', async () => {
      const { user, uploader } = await setupTestData();

      const doc = await uploadDocument({
        user_id: user.id,
        activity_id: null,
        group_id: null,
        title: 'Document to Delete by Uploader',
        description: null,
        file_path: '/uploads/delete2.pdf',
        file_name: 'delete2.pdf',
        file_size: 1024,
        mime_type: 'application/pdf',
        document_type: 'lainnya',
        uploaded_by: uploader.id
      });

      const result = await deleteDocument(doc.id, uploader.id);

      expect(result).toBe(true);
    });

    it('should throw error for non-existent document', async () => {
      const { user } = await setupTestData();

      expect(deleteDocument(999, user.id)).rejects.toThrow(/document not found/i);
    });

    it('should throw error for permission denied', async () => {
      const { user, uploader } = await setupTestData();

      // Create another user
      const otherUserResult = await db.insert(usersTable)
        .values({
          username: 'otheruser',
          email: 'other@example.com',
          password_hash: 'hash789',
          full_name: 'Other User',
          role: 'guru'
        })
        .returning()
        .execute();
      const otherUser = otherUserResult[0];

      const doc = await uploadDocument({
        user_id: user.id,
        activity_id: null,
        group_id: null,
        title: 'Protected Document',
        description: null,
        file_path: '/uploads/protected.pdf',
        file_name: 'protected.pdf',
        file_size: 1024,
        mime_type: 'application/pdf',
        document_type: 'lainnya',
        uploaded_by: uploader.id
      });

      expect(deleteDocument(doc.id, otherUser.id)).rejects.toThrow(/permission denied/i);
    });
  });

  describe('getDocumentById', () => {
    it('should return document for existing ID', async () => {
      const { user, uploader } = await setupTestData();

      const doc = await uploadDocument({
        user_id: user.id,
        activity_id: null,
        group_id: null,
        title: 'Document by ID',
        description: 'Test document retrieval',
        file_path: '/uploads/by-id.pdf',
        file_name: 'by-id.pdf',
        file_size: 1024,
        mime_type: 'application/pdf',
        document_type: 'pendidikan_formal',
        uploaded_by: uploader.id
      });

      const result = await getDocumentById(doc.id);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(doc.id);
      expect(result!.title).toBe('Document by ID');
      expect(result!.document_type).toBe('pendidikan_formal');
    });

    it('should return null for non-existent ID', async () => {
      const result = await getDocumentById(999);

      expect(result).toBeNull();
    });
  });
});
