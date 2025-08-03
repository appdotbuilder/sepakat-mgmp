
import { db } from '../db';
import { documentsTable, usersTable, activitiesTable, groupsTable } from '../db/schema';
import { type Document, type CreateDocumentInput } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function uploadDocument(input: CreateDocumentInput): Promise<Document> {
  try {
    // Verify uploaded_by user exists
    const uploader = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.uploaded_by))
      .execute();
    
    if (uploader.length === 0) {
      throw new Error('Uploader user not found');
    }

    // Verify user_id exists if provided
    if (input.user_id) {
      const user = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, input.user_id))
        .execute();
      
      if (user.length === 0) {
        throw new Error('User not found');
      }
    }

    // Verify activity_id exists if provided
    if (input.activity_id) {
      const activity = await db.select()
        .from(activitiesTable)
        .where(eq(activitiesTable.id, input.activity_id))
        .execute();
      
      if (activity.length === 0) {
        throw new Error('Activity not found');
      }
    }

    // Verify group_id exists if provided
    if (input.group_id) {
      const group = await db.select()
        .from(groupsTable)
        .where(eq(groupsTable.id, input.group_id))
        .execute();
      
      if (group.length === 0) {
        throw new Error('Group not found');
      }
    }

    // Insert document record
    const result = await db.insert(documentsTable)
      .values({
        user_id: input.user_id,
        activity_id: input.activity_id,
        group_id: input.group_id,
        title: input.title,
        description: input.description,
        file_path: input.file_path,
        file_name: input.file_name,
        file_size: input.file_size,
        mime_type: input.mime_type,
        document_type: input.document_type,
        uploaded_by: input.uploaded_by
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Document upload failed:', error);
    throw error;
  }
}

export async function getDocumentsByUser(userId: number): Promise<Document[]> {
  try {
    // Verify user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();
    
    if (user.length === 0) {
      throw new Error('User not found');
    }

    const results = await db.select()
      .from(documentsTable)
      .where(eq(documentsTable.user_id, userId))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to get documents by user:', error);
    throw error;
  }
}

export async function getDocumentsByActivity(activityId: number): Promise<Document[]> {
  try {
    // Verify activity exists
    const activity = await db.select()
      .from(activitiesTable)
      .where(eq(activitiesTable.id, activityId))
      .execute();
    
    if (activity.length === 0) {
      throw new Error('Activity not found');
    }

    const results = await db.select()
      .from(documentsTable)
      .where(eq(documentsTable.activity_id, activityId))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to get documents by activity:', error);
    throw error;
  }
}

export async function getDocumentsByGroup(groupId: number): Promise<Document[]> {
  try {
    // Verify group exists
    const group = await db.select()
      .from(groupsTable)
      .where(eq(groupsTable.id, groupId))
      .execute();
    
    if (group.length === 0) {
      throw new Error('Group not found');
    }

    const results = await db.select()
      .from(documentsTable)
      .where(eq(documentsTable.group_id, groupId))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to get documents by group:', error);
    throw error;
  }
}

export async function deleteDocument(id: number, userId: number): Promise<boolean> {
  try {
    // Verify user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();
    
    if (user.length === 0) {
      throw new Error('User not found');
    }

    // Check if document exists and user has permission to delete
    const document = await db.select()
      .from(documentsTable)
      .where(eq(documentsTable.id, id))
      .execute();
    
    if (document.length === 0) {
      throw new Error('Document not found');
    }

    // Only allow deletion by document owner or uploader
    const doc = document[0];
    if (doc.user_id !== userId && doc.uploaded_by !== userId) {
      throw new Error('Permission denied: You can only delete your own documents');
    }

    // Delete the document
    await db.delete(documentsTable)
      .where(eq(documentsTable.id, id))
      .execute();

    return true;
  } catch (error) {
    console.error('Document deletion failed:', error);
    throw error;
  }
}

export async function getDocumentById(id: number): Promise<Document | null> {
  try {
    const results = await db.select()
      .from(documentsTable)
      .where(eq(documentsTable.id, id))
      .execute();

    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Failed to get document by ID:', error);
    throw error;
  }
}
