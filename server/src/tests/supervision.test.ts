
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, schoolsTable, regionsTable, supervisionReportsTable, schoolSupervisionTable } from '../db/schema';
import { type CreateSupervisionReportInput } from '../schema';
import {
  createSupervisionReport,
  getSupervisionReportsBySupervisor,
  getSupervisionReportsBySchool,
  assignSchoolToSupervisor,
  getSupervisedSchools,
  removeSchoolSupervision
} from '../handlers/supervision';
import { eq, and } from 'drizzle-orm';

describe('supervision handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let supervisorId: number;
  let schoolId: number;
  let regionId: number;

  beforeEach(async () => {
    // Create test region
    const region = await db.insert(regionsTable)
      .values({
        name: 'Test Region',
        code: 'TR01'
      })
      .returning()
      .execute();
    regionId = region[0].id;

    // Create test school
    const school = await db.insert(schoolsTable)
      .values({
        name: 'Test School',
        npsn: '12345678',
        address: 'Test Address',
        level: 'smp',
        region_id: regionId
      })
      .returning()
      .execute();
    schoolId = school[0].id;

    // Create test supervisor
    const supervisor = await db.insert(usersTable)
      .values({
        username: 'supervisor1',
        email: 'supervisor@test.com',
        password_hash: 'hashed_password',
        full_name: 'Test Supervisor',
        nip: '123456789',
        role: 'pengawas_sekolah',
        region_id: regionId,
        level: 'smp'
      })
      .returning()
      .execute();
    supervisorId = supervisor[0].id;
  });

  describe('createSupervisionReport', () => {
    const testInput: CreateSupervisionReportInput = {
      supervisor_id: 0, // Will be set in test
      school_id: 0, // Will be set in test
      visit_date: new Date('2024-01-15'),
      title: 'Monthly Supervision Visit',
      description: 'Regular supervision visit for January 2024',
      file_path: '/uploads/supervision/report-123.pdf',
      file_name: 'supervision-report-jan-2024.pdf'
    };

    it('should create a supervision report when supervisor has authority', async () => {
      // Assign school to supervisor first
      await assignSchoolToSupervisor(supervisorId, schoolId);

      const input = { ...testInput, supervisor_id: supervisorId, school_id: schoolId };
      const result = await createSupervisionReport(input);

      expect(result.supervisor_id).toEqual(supervisorId);
      expect(result.school_id).toEqual(schoolId);
      expect(result.title).toEqual('Monthly Supervision Visit');
      expect(result.description).toEqual(testInput.description);
      expect(result.file_path).toEqual(testInput.file_path);
      expect(result.file_name).toEqual(testInput.file_name);
      expect(result.visit_date).toEqual(testInput.visit_date);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should save report to database', async () => {
      await assignSchoolToSupervisor(supervisorId, schoolId);

      const input = { ...testInput, supervisor_id: supervisorId, school_id: schoolId };
      const result = await createSupervisionReport(input);

      const reports = await db.select()
        .from(supervisionReportsTable)
        .where(eq(supervisionReportsTable.id, result.id))
        .execute();

      expect(reports).toHaveLength(1);
      expect(reports[0].title).toEqual('Monthly Supervision Visit');
      expect(reports[0].supervisor_id).toEqual(supervisorId);
      expect(reports[0].school_id).toEqual(schoolId);
    });

    it('should throw error when supervisor not found', async () => {
      const input = { ...testInput, supervisor_id: 9999, school_id: schoolId };

      await expect(createSupervisionReport(input)).rejects.toThrow(/supervisor not found/i);
    });

    it('should throw error when school not found', async () => {
      const input = { ...testInput, supervisor_id: supervisorId, school_id: 9999 };

      await expect(createSupervisionReport(input)).rejects.toThrow(/school not found/i);
    });

    it('should throw error when supervisor has no authority over school', async () => {
      const input = { ...testInput, supervisor_id: supervisorId, school_id: schoolId };

      await expect(createSupervisionReport(input)).rejects.toThrow(/does not have authority/i);
    });

    it('should throw error when user is not a supervisor', async () => {
      // Create regular user
      const user = await db.insert(usersTable)
        .values({
          username: 'teacher1',
          email: 'teacher@test.com',
          password_hash: 'hashed_password',
          full_name: 'Test Teacher',
          role: 'guru'
        })
        .returning()
        .execute();

      const input = { ...testInput, supervisor_id: user[0].id, school_id: schoolId };

      await expect(createSupervisionReport(input)).rejects.toThrow(/does not have supervisor role/i);
    });
  });

  describe('getSupervisionReportsBySupervisor', () => {
    it('should return reports by supervisor', async () => {
      await assignSchoolToSupervisor(supervisorId, schoolId);

      // Create test report
      await db.insert(supervisionReportsTable)
        .values({
          supervisor_id: supervisorId,
          school_id: schoolId,
          visit_date: new Date('2024-01-15'),
          title: 'Test Report',
          file_path: '/test/path.pdf',
          file_name: 'test.pdf'
        })
        .execute();

      const results = await getSupervisionReportsBySupervisor(supervisorId);

      expect(results).toHaveLength(1);
      expect(results[0].supervisor_id).toEqual(supervisorId);
      expect(results[0].title).toEqual('Test Report');
    });

    it('should return empty array when no reports exist', async () => {
      const results = await getSupervisionReportsBySupervisor(supervisorId);

      expect(results).toHaveLength(0);
    });
  });

  describe('getSupervisionReportsBySchool', () => {
    it('should return reports by school', async () => {
      await assignSchoolToSupervisor(supervisorId, schoolId);

      // Create test report
      await db.insert(supervisionReportsTable)
        .values({
          supervisor_id: supervisorId,
          school_id: schoolId,
          visit_date: new Date('2024-01-15'),
          title: 'School Report',
          file_path: '/test/path.pdf',
          file_name: 'test.pdf'
        })
        .execute();

      const results = await getSupervisionReportsBySchool(schoolId);

      expect(results).toHaveLength(1);
      expect(results[0].school_id).toEqual(schoolId);
      expect(results[0].title).toEqual('School Report');
    });

    it('should return empty array when no reports exist', async () => {
      const results = await getSupervisionReportsBySchool(schoolId);

      expect(results).toHaveLength(0);
    });
  });

  describe('assignSchoolToSupervisor', () => {
    it('should assign school to supervisor', async () => {
      const result = await assignSchoolToSupervisor(supervisorId, schoolId);

      expect(result).toBe(true);

      // Verify assignment in database
      const assignments = await db.select()
        .from(schoolSupervisionTable)
        .where(and(
          eq(schoolSupervisionTable.supervisor_id, supervisorId),
          eq(schoolSupervisionTable.school_id, schoolId)
        ))
        .execute();

      expect(assignments).toHaveLength(1);
      expect(assignments[0].supervisor_id).toEqual(supervisorId);
      expect(assignments[0].school_id).toEqual(schoolId);
    });

    it('should return true when assignment already exists', async () => {
      // Create initial assignment
      await assignSchoolToSupervisor(supervisorId, schoolId);

      // Try to assign again
      const result = await assignSchoolToSupervisor(supervisorId, schoolId);

      expect(result).toBe(true);

      // Should still have only one assignment
      const assignments = await db.select()
        .from(schoolSupervisionTable)
        .where(and(
          eq(schoolSupervisionTable.supervisor_id, supervisorId),
          eq(schoolSupervisionTable.school_id, schoolId)
        ))
        .execute();

      expect(assignments).toHaveLength(1);
    });

    it('should throw error when supervisor not found', async () => {
      await expect(assignSchoolToSupervisor(9999, schoolId)).rejects.toThrow(/supervisor not found/i);
    });

    it('should throw error when school not found', async () => {
      await expect(assignSchoolToSupervisor(supervisorId, 9999)).rejects.toThrow(/school not found/i);
    });

    it('should throw error when user is not a supervisor', async () => {
      // Create regular user
      const user = await db.insert(usersTable)
        .values({
          username: 'teacher1',
          email: 'teacher@test.com',
          password_hash: 'hashed_password',
          full_name: 'Test Teacher',
          role: 'guru'
        })
        .returning()
        .execute();

      await expect(assignSchoolToSupervisor(user[0].id, schoolId)).rejects.toThrow(/does not have supervisor role/i);
    });
  });

  describe('getSupervisedSchools', () => {
    it('should return supervised schools with details', async () => {
      await assignSchoolToSupervisor(supervisorId, schoolId);

      const results = await getSupervisedSchools(supervisorId);

      expect(results).toHaveLength(1);
      expect(results[0].id).toEqual(schoolId);
      expect(results[0].name).toEqual('Test School');
      expect(results[0].npsn).toEqual('12345678');
      expect(results[0].address).toEqual('Test Address');
      expect(results[0].level).toEqual('smp');
      expect(results[0].region_id).toEqual(regionId);
      expect(results[0].assigned_at).toBeInstanceOf(Date);
      expect(results[0].created_at).toBeInstanceOf(Date);
    });

    it('should return empty array when no schools assigned', async () => {
      const results = await getSupervisedSchools(supervisorId);

      expect(results).toHaveLength(0);
    });
  });

  describe('removeSchoolSupervision', () => {
    it('should remove school supervision assignment', async () => {
      // Create assignment first
      await assignSchoolToSupervisor(supervisorId, schoolId);

      // Verify assignment exists
      let assignments = await db.select()
        .from(schoolSupervisionTable)
        .where(and(
          eq(schoolSupervisionTable.supervisor_id, supervisorId),
          eq(schoolSupervisionTable.school_id, schoolId)
        ))
        .execute();
      expect(assignments).toHaveLength(1);

      // Remove assignment
      const result = await removeSchoolSupervision(supervisorId, schoolId);

      expect(result).toBe(true);

      // Verify assignment removed
      assignments = await db.select()
        .from(schoolSupervisionTable)
        .where(and(
          eq(schoolSupervisionTable.supervisor_id, supervisorId),
          eq(schoolSupervisionTable.school_id, schoolId)
        ))
        .execute();
      expect(assignments).toHaveLength(0);
    });

    it('should return true even when assignment does not exist', async () => {
      const result = await removeSchoolSupervision(supervisorId, schoolId);

      expect(result).toBe(true);
    });
  });
});
