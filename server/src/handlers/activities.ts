
import { db } from '../db';
import { activitiesTable, groupsTable, groupMembersTable } from '../db/schema';
import { type Activity, type CreateActivityInput, type GetActivitiesQuery } from '../schema';
import { eq, and, gte, lte, SQL } from 'drizzle-orm';

export async function createActivity(input: CreateActivityInput): Promise<Activity> {
  try {
    // Insert activity record
    const result = await db.insert(activitiesTable)
      .values({
        group_id: input.group_id,
        title: input.title,
        description: input.description,
        activity_date: input.activity_date,
        start_time: input.start_time,
        end_time: input.end_time,
        location: input.location,
        speaker: input.speaker,
        funding_source: input.funding_source,
        created_by: input.created_by
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Activity creation failed:', error);
    throw error;
  }
}

export async function getActivities(query?: GetActivitiesQuery): Promise<Activity[]> {
  try {
    const conditions: SQL<unknown>[] = [];

    if (query?.group_id !== undefined) {
      conditions.push(eq(activitiesTable.group_id, query.group_id));
    }

    if (query?.status !== undefined) {
      conditions.push(eq(activitiesTable.status, query.status));
    }

    if (query?.date_from !== undefined) {
      conditions.push(gte(activitiesTable.activity_date, query.date_from));
    }

    if (query?.date_to !== undefined) {
      conditions.push(lte(activitiesTable.activity_date, query.date_to));
    }

    // Build final query with conditions
    const results = conditions.length > 0
      ? await db.select()
          .from(activitiesTable)
          .where(conditions.length === 1 ? conditions[0] : and(...conditions))
          .execute()
      : await db.select()
          .from(activitiesTable)
          .execute();

    return results;
  } catch (error) {
    console.error('Get activities failed:', error);
    throw error;
  }
}

export async function getActivityById(id: number): Promise<Activity | null> {
  try {
    const results = await db.select()
      .from(activitiesTable)
      .where(eq(activitiesTable.id, id))
      .execute();

    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Get activity by ID failed:', error);
    throw error;
  }
}

export async function updateActivityStatus(id: number, status: string): Promise<boolean> {
  try {
    const result = await db.update(activitiesTable)
      .set({ status: status as any })
      .where(eq(activitiesTable.id, id))
      .returning()
      .execute();

    return result.length > 0;
  } catch (error) {
    console.error('Update activity status failed:', error);
    throw error;
  }
}

export async function getUpcomingActivities(userId: number): Promise<Activity[]> {
  try {
    const today = new Date();
    
    const results = await db.select({
      id: activitiesTable.id,
      group_id: activitiesTable.group_id,
      title: activitiesTable.title,
      description: activitiesTable.description,
      activity_date: activitiesTable.activity_date,
      start_time: activitiesTable.start_time,
      end_time: activitiesTable.end_time,
      location: activitiesTable.location,
      speaker: activitiesTable.speaker,
      funding_source: activitiesTable.funding_source,
      status: activitiesTable.status,
      created_by: activitiesTable.created_by,
      created_at: activitiesTable.created_at
    })
      .from(activitiesTable)
      .innerJoin(groupMembersTable, eq(activitiesTable.group_id, groupMembersTable.group_id))
      .where(
        and(
          eq(groupMembersTable.user_id, userId),
          gte(activitiesTable.activity_date, today)
        )
      )
      .execute();

    return results;
  } catch (error) {
    console.error('Get upcoming activities failed:', error);
    throw error;
  }
}

export async function getActivitiesByGroup(groupId: number): Promise<Activity[]> {
  try {
    const results = await db.select()
      .from(activitiesTable)
      .where(eq(activitiesTable.group_id, groupId))
      .execute();

    return results;
  } catch (error) {
    console.error('Get activities by group failed:', error);
    throw error;
  }
}
