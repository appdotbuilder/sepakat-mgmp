
import { db } from '../db';
import { attendanceTable, activitiesTable, groupsTable, groupMembersTable, usersTable } from '../db/schema';
import { type Attendance, type CreateAttendanceInput } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function recordAttendance(input: CreateAttendanceInput): Promise<Attendance> {
  try {
    // First, verify the recorder has admin rights for the activity's group
    const activityWithGroup = await db.select({
      group_id: activitiesTable.group_id
    })
    .from(activitiesTable)
    .where(eq(activitiesTable.id, input.activity_id))
    .execute();

    if (activityWithGroup.length === 0) {
      throw new Error('Activity not found');
    }

    const groupId = activityWithGroup[0].group_id;

    // Check if recorder is admin of the group
    const recorderMembership = await db.select()
      .from(groupMembersTable)
      .where(and(
        eq(groupMembersTable.group_id, groupId),
        eq(groupMembersTable.user_id, input.recorded_by),
        eq(groupMembersTable.is_admin, true)
      ))
      .execute();

    if (recorderMembership.length === 0) {
      throw new Error('Recorder must be an admin of the group');
    }

    // Check if attendance record already exists
    const existingAttendance = await db.select()
      .from(attendanceTable)
      .where(and(
        eq(attendanceTable.activity_id, input.activity_id),
        eq(attendanceTable.user_id, input.user_id)
      ))
      .execute();

    let result;
    if (existingAttendance.length > 0) {
      // Update existing record
      result = await db.update(attendanceTable)
        .set({
          is_present: input.is_present,
          notes: input.notes,
          recorded_by: input.recorded_by,
          recorded_at: new Date()
        })
        .where(and(
          eq(attendanceTable.activity_id, input.activity_id),
          eq(attendanceTable.user_id, input.user_id)
        ))
        .returning()
        .execute();
    } else {
      // Insert new record
      result = await db.insert(attendanceTable)
        .values({
          activity_id: input.activity_id,
          user_id: input.user_id,
          is_present: input.is_present,
          notes: input.notes,
          recorded_by: input.recorded_by
        })
        .returning()
        .execute();
    }

    return result[0];
  } catch (error) {
    console.error('Record attendance failed:', error);
    throw error;
  }
}

export async function getAttendanceByActivity(activityId: number): Promise<Attendance[]> {
  try {
    const results = await db.select()
      .from(attendanceTable)
      .where(eq(attendanceTable.activity_id, activityId))
      .execute();

    return results;
  } catch (error) {
    console.error('Get attendance by activity failed:', error);
    throw error;
  }
}

export async function getUserAttendanceHistory(userId: number): Promise<any[]> {
  try {
    const results = await db.select({
      id: attendanceTable.id,
      activity_id: attendanceTable.activity_id,
      is_present: attendanceTable.is_present,
      notes: attendanceTable.notes,
      recorded_at: attendanceTable.recorded_at,
      activity_title: activitiesTable.title,
      activity_date: activitiesTable.activity_date,
      group_name: groupsTable.name
    })
    .from(attendanceTable)
    .innerJoin(activitiesTable, eq(attendanceTable.activity_id, activitiesTable.id))
    .innerJoin(groupsTable, eq(activitiesTable.group_id, groupsTable.id))
    .where(eq(attendanceTable.user_id, userId))
    .execute();

    return results;
  } catch (error) {
    console.error('Get user attendance history failed:', error);
    throw error;
  }
}

export async function getAttendanceByUser(userId: number, activityId: number): Promise<Attendance | null> {
  try {
    const results = await db.select()
      .from(attendanceTable)
      .where(and(
        eq(attendanceTable.user_id, userId),
        eq(attendanceTable.activity_id, activityId)
      ))
      .execute();

    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Get attendance by user failed:', error);
    throw error;
  }
}

export async function bulkRecordAttendance(attendanceRecords: CreateAttendanceInput[]): Promise<boolean> {
  try {
    if (attendanceRecords.length === 0) {
      return true;
    }

    // Validate all records belong to the same activity and recorder has admin rights
    const activityId = attendanceRecords[0].activity_id;
    const recordedBy = attendanceRecords[0].recorded_by;

    // Check all records have same activity and recorder
    const isConsistent = attendanceRecords.every(record => 
      record.activity_id === activityId && record.recorded_by === recordedBy
    );

    if (!isConsistent) {
      throw new Error('All attendance records must belong to the same activity and recorder');
    }

    // Verify recorder has admin rights
    const activityWithGroup = await db.select({
      group_id: activitiesTable.group_id
    })
    .from(activitiesTable)
    .where(eq(activitiesTable.id, activityId))
    .execute();

    if (activityWithGroup.length === 0) {
      throw new Error('Activity not found');
    }

    const groupId = activityWithGroup[0].group_id;

    const recorderMembership = await db.select()
      .from(groupMembersTable)
      .where(and(
        eq(groupMembersTable.group_id, groupId),
        eq(groupMembersTable.user_id, recordedBy),
        eq(groupMembersTable.is_admin, true)
      ))
      .execute();

    if (recorderMembership.length === 0) {
      throw new Error('Recorder must be an admin of the group');
    }

    // Process each record individually to handle updates/inserts
    for (const record of attendanceRecords) {
      await recordAttendance(record);
    }

    return true;
  } catch (error) {
    console.error('Bulk record attendance failed:', error);
    throw error;
  }
}
