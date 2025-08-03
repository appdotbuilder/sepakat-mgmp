
import { db } from '../db';
import { announcementsTable } from '../db/schema';
import { type Announcement, type CreateAnnouncementInput } from '../schema';
import { eq } from 'drizzle-orm';

export async function createAnnouncement(input: CreateAnnouncementInput): Promise<Announcement> {
  try {
    const result = await db.insert(announcementsTable)
      .values({
        title: input.title,
        content: input.content,
        created_by: input.created_by
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Announcement creation failed:', error);
    throw error;
  }
}

export async function getActiveAnnouncements(): Promise<Announcement[]> {
  try {
    const results = await db.select()
      .from(announcementsTable)
      .where(eq(announcementsTable.is_active, true))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch active announcements:', error);
    throw error;
  }
}

export async function getAllAnnouncements(): Promise<Announcement[]> {
  try {
    const results = await db.select()
      .from(announcementsTable)
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch all announcements:', error);
    throw error;
  }
}

export async function updateAnnouncementStatus(id: number, isActive: boolean): Promise<boolean> {
  try {
    const result = await db.update(announcementsTable)
      .set({ is_active: isActive })
      .where(eq(announcementsTable.id, id))
      .returning()
      .execute();

    return result.length > 0;
  } catch (error) {
    console.error('Failed to update announcement status:', error);
    throw error;
  }
}

export async function deleteAnnouncement(id: number): Promise<boolean> {
  try {
    const result = await db.delete(announcementsTable)
      .where(eq(announcementsTable.id, id))
      .returning()
      .execute();

    return result.length > 0;
  } catch (error) {
    console.error('Failed to delete announcement:', error);
    throw error;
  }
}
