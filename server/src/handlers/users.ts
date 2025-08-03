
import { db } from '../db';
import { usersTable, regionsTable, schoolsTable } from '../db/schema';
import { type User, type CreateUserInput, type GetUsersQuery } from '../schema';
import { eq, and, SQL } from 'drizzle-orm';

export async function createUser(input: CreateUserInput): Promise<User> {
  try {
    // Hash the password using Bun's built-in password hashing
    const passwordHash = await Bun.password.hash(input.password);

    // Insert user into database
    const result = await db.insert(usersTable)
      .values({
        username: input.username,
        email: input.email,
        password_hash: passwordHash,
        full_name: input.full_name,
        nip: input.nip,
        role: input.role,
        school_id: input.school_id,
        region_id: input.region_id,
        level: input.level
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
}

export async function getUsers(query?: GetUsersQuery): Promise<User[]> {
  try {
    let baseQuery = db.select().from(usersTable);

    // Build conditions array for filtering
    const conditions: SQL<unknown>[] = [];

    if (query?.role) {
      conditions.push(eq(usersTable.role, query.role));
    }

    if (query?.region_id) {
      conditions.push(eq(usersTable.region_id, query.region_id));
    }

    if (query?.school_id) {
      conditions.push(eq(usersTable.school_id, query.school_id));
    }

    if (query?.is_active !== undefined) {
      conditions.push(eq(usersTable.is_active, query.is_active));
    }

    // Apply where clause if conditions exist
    const finalQuery = conditions.length > 0
      ? baseQuery.where(conditions.length === 1 ? conditions[0] : and(...conditions))
      : baseQuery;

    const results = await finalQuery.execute();
    return results;
  } catch (error) {
    console.error('Getting users failed:', error);
    throw error;
  }
}

export async function getUserById(id: number): Promise<User | null> {
  try {
    const results = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .execute();

    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Getting user by ID failed:', error);
    throw error;
  }
}

export async function updateUserStatus(id: number, isActive: boolean): Promise<boolean> {
  try {
    const result = await db.update(usersTable)
      .set({ is_active: isActive })
      .where(eq(usersTable.id, id))
      .execute();

    return result.rowCount !== null && result.rowCount > 0;
  } catch (error) {
    console.error('Updating user status failed:', error);
    throw error;
  }
}

export async function getUsersByRole(role: string): Promise<User[]> {
  try {
    const results = await db.select()
      .from(usersTable)
      .where(eq(usersTable.role, role as any))
      .execute();

    return results;
  } catch (error) {
    console.error('Getting users by role failed:', error);
    throw error;
  }
}
