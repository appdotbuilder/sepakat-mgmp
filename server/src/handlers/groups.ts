
import { db } from '../db';
import { groupsTable, groupMembersTable, usersTable, regionsTable, subjectsTable } from '../db/schema';
import { type Group, type CreateGroupInput } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function createGroup(input: CreateGroupInput): Promise<Group> {
  try {
    const result = await db.insert(groupsTable)
      .values({
        name: input.name,
        type: input.type,
        level: input.level,
        region_id: input.region_id,
        subject_id: input.subject_id,
        description: input.description
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Group creation failed:', error);
    throw error;
  }
}

export async function getGroups(): Promise<Group[]> {
  try {
    const results = await db.select()
      .from(groupsTable)
      .where(eq(groupsTable.is_active, true))
      .execute();

    return results;
  } catch (error) {
    console.error('Get groups failed:', error);
    throw error;
  }
}

export async function getGroupById(id: number): Promise<Group | null> {
  try {
    const results = await db.select()
      .from(groupsTable)
      .where(eq(groupsTable.id, id))
      .execute();

    return results[0] || null;
  } catch (error) {
    console.error('Get group by ID failed:', error);
    throw error;
  }
}

export async function addGroupMember(groupId: number, userId: number, isAdmin: boolean = false): Promise<boolean> {
  try {
    // Check if user is already a member
    const existingMember = await db.select()
      .from(groupMembersTable)
      .where(and(
        eq(groupMembersTable.group_id, groupId),
        eq(groupMembersTable.user_id, userId)
      ))
      .execute();

    if (existingMember.length > 0) {
      return false; // User is already a member
    }

    await db.insert(groupMembersTable)
      .values({
        group_id: groupId,
        user_id: userId,
        is_admin: isAdmin
      })
      .execute();

    return true;
  } catch (error) {
    console.error('Add group member failed:', error);
    throw error;
  }
}

export async function removeGroupMember(groupId: number, userId: number): Promise<boolean> {
  try {
    const result = await db.delete(groupMembersTable)
      .where(and(
        eq(groupMembersTable.group_id, groupId),
        eq(groupMembersTable.user_id, userId)
      ))
      .execute();

    return true;
  } catch (error) {
    console.error('Remove group member failed:', error);
    throw error;
  }
}

export async function getGroupMembers(groupId: number): Promise<any[]> {
  try {
    const results = await db.select({
      id: groupMembersTable.id,
      group_id: groupMembersTable.group_id,
      user_id: groupMembersTable.user_id,
      is_admin: groupMembersTable.is_admin,
      joined_at: groupMembersTable.joined_at,
      user_full_name: usersTable.full_name,
      user_email: usersTable.email,
      user_role: usersTable.role
    })
      .from(groupMembersTable)
      .innerJoin(usersTable, eq(groupMembersTable.user_id, usersTable.id))
      .where(eq(groupMembersTable.group_id, groupId))
      .execute();

    return results;
  } catch (error) {
    console.error('Get group members failed:', error);
    throw error;
  }
}

export async function setGroupAdmin(groupId: number, userId: number, isAdmin: boolean): Promise<boolean> {
  try {
    await db.update(groupMembersTable)
      .set({ is_admin: isAdmin })
      .where(and(
        eq(groupMembersTable.group_id, groupId),
        eq(groupMembersTable.user_id, userId)
      ))
      .execute();

    return true;
  } catch (error) {
    console.error('Set group admin failed:', error);
    throw error;
  }
}
