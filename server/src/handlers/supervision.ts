
import { db } from '../db';
import { supervisionReportsTable, schoolSupervisionTable, schoolsTable, usersTable } from '../db/schema';
import { type SupervisionReport, type CreateSupervisionReportInput } from '../schema';
import { eq, and } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

export async function createSupervisionReport(input: CreateSupervisionReportInput): Promise<SupervisionReport> {
  try {
    // Verify supervisor exists and has appropriate role
    const supervisor = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.supervisor_id))
      .execute();

    if (supervisor.length === 0) {
      throw new Error('Supervisor not found');
    }

    if (!['pengawas_sekolah', 'pengawas_bina', 'kepala_bidang'].includes(supervisor[0].role)) {
      throw new Error('User does not have supervisor role');
    }

    // Verify school exists
    const school = await db.select()
      .from(schoolsTable)
      .where(eq(schoolsTable.id, input.school_id))
      .execute();

    if (school.length === 0) {
      throw new Error('School not found');
    }

    // Verify supervisor has authority over the school
    const supervision = await db.select()
      .from(schoolSupervisionTable)
      .where(and(
        eq(schoolSupervisionTable.supervisor_id, input.supervisor_id),
        eq(schoolSupervisionTable.school_id, input.school_id)
      ))
      .execute();

    if (supervision.length === 0) {
      throw new Error('Supervisor does not have authority over this school');
    }

    // Insert supervision report
    const result = await db.insert(supervisionReportsTable)
      .values({
        supervisor_id: input.supervisor_id,
        school_id: input.school_id,
        visit_date: input.visit_date,
        title: input.title,
        description: input.description,
        file_path: input.file_path,
        file_name: input.file_name
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Supervision report creation failed:', error);
    throw error;
  }
}

export async function getSupervisionReportsBySupervisor(supervisorId: number): Promise<SupervisionReport[]> {
  try {
    const results = await db.select()
      .from(supervisionReportsTable)
      .where(eq(supervisionReportsTable.supervisor_id, supervisorId))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch supervision reports by supervisor:', error);
    throw error;
  }
}

export async function getSupervisionReportsBySchool(schoolId: number): Promise<SupervisionReport[]> {
  try {
    const results = await db.select()
      .from(supervisionReportsTable)
      .where(eq(supervisionReportsTable.school_id, schoolId))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch supervision reports by school:', error);
    throw error;
  }
}

export async function assignSchoolToSupervisor(supervisorId: number, schoolId: number): Promise<boolean> {
  try {
    // Verify supervisor exists and has appropriate role
    const supervisor = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, supervisorId))
      .execute();

    if (supervisor.length === 0) {
      throw new Error('Supervisor not found');
    }

    if (!['pengawas_sekolah', 'pengawas_bina', 'kepala_bidang'].includes(supervisor[0].role)) {
      throw new Error('User does not have supervisor role');
    }

    // Verify school exists
    const school = await db.select()
      .from(schoolsTable)
      .where(eq(schoolsTable.id, schoolId))
      .execute();

    if (school.length === 0) {
      throw new Error('School not found');
    }

    // Check if assignment already exists
    const existing = await db.select()
      .from(schoolSupervisionTable)
      .where(and(
        eq(schoolSupervisionTable.supervisor_id, supervisorId),
        eq(schoolSupervisionTable.school_id, schoolId)
      ))
      .execute();

    if (existing.length > 0) {
      return true; // Already assigned
    }

    // Create assignment
    await db.insert(schoolSupervisionTable)
      .values({
        supervisor_id: supervisorId,
        school_id: schoolId
      })
      .execute();

    return true;
  } catch (error) {
    console.error('School assignment failed:', error);
    throw error;
  }
}

export async function getSupervisedSchools(supervisorId: number): Promise<any[]> {
  try {
    const results = await db.select()
      .from(schoolSupervisionTable)
      .innerJoin(schoolsTable, eq(schoolSupervisionTable.school_id, schoolsTable.id))
      .where(eq(schoolSupervisionTable.supervisor_id, supervisorId))
      .execute();

    return results.map(result => ({
      id: result.schools.id,
      name: result.schools.name,
      npsn: result.schools.npsn,
      address: result.schools.address,
      level: result.schools.level,
      region_id: result.schools.region_id,
      assigned_at: result.school_supervision.assigned_at,
      created_at: result.schools.created_at
    }));
  } catch (error) {
    console.error('Failed to fetch supervised schools:', error);
    throw error;
  }
}

export async function removeSchoolSupervision(supervisorId: number, schoolId: number): Promise<boolean> {
  try {
    const result = await db.delete(schoolSupervisionTable)
      .where(and(
        eq(schoolSupervisionTable.supervisor_id, supervisorId),
        eq(schoolSupervisionTable.school_id, schoolId)
      ))
      .execute();

    return true;
  } catch (error) {
    console.error('Failed to remove school supervision:', error);
    throw error;
  }
}
