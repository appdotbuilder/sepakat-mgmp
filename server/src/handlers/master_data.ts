
import { db } from '../db';
import { regionsTable, schoolsTable, subjectsTable, academicYearsTable } from '../db/schema';
import { type Region, type School, type Subject, type AcademicYear, type EducationLevel } from '../schema';
import { eq } from 'drizzle-orm';

export async function getRegions(): Promise<Region[]> {
  try {
    const results = await db.select()
      .from(regionsTable)
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch regions:', error);
    throw error;
  }
}

export async function getSchools(regionId?: number): Promise<School[]> {
  try {
    let query = db.select().from(schoolsTable);

    if (regionId !== undefined) {
      const results = await query.where(eq(schoolsTable.region_id, regionId)).execute();
      return results;
    }

    const results = await query.execute();
    return results;
  } catch (error) {
    console.error('Failed to fetch schools:', error);
    throw error;
  }
}

export async function getSubjects(level?: string): Promise<Subject[]> {
  try {
    let query = db.select().from(subjectsTable);

    if (level) {
      const results = await query.where(eq(subjectsTable.level, level as EducationLevel)).execute();
      return results;
    }

    const results = await query.execute();
    return results;
  } catch (error) {
    console.error('Failed to fetch subjects:', error);
    throw error;
  }
}

export async function getAcademicYears(): Promise<AcademicYear[]> {
  try {
    const results = await db.select()
      .from(academicYearsTable)
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch academic years:', error);
    throw error;
  }
}

export async function createRegion(name: string, code: string): Promise<Region> {
  try {
    const result = await db.insert(regionsTable)
      .values({
        name,
        code
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Region creation failed:', error);
    throw error;
  }
}

export async function createSchool(name: string, npsn: string, address: string, level: string, regionId: number): Promise<School> {
  try {
    // Verify region exists
    const regionExists = await db.select()
      .from(regionsTable)
      .where(eq(regionsTable.id, regionId))
      .execute();

    if (regionExists.length === 0) {
      throw new Error(`Region with id ${regionId} does not exist`);
    }

    const result = await db.insert(schoolsTable)
      .values({
        name,
        npsn,
        address,
        level: level as EducationLevel,
        region_id: regionId
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('School creation failed:', error);
    throw error;
  }
}

export async function createSubject(name: string, code: string, level: string): Promise<Subject> {
  try {
    const result = await db.insert(subjectsTable)
      .values({
        name,
        code,
        level: level as EducationLevel
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Subject creation failed:', error);
    throw error;
  }
}
