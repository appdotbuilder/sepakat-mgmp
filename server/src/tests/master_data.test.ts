
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { regionsTable, schoolsTable, subjectsTable, academicYearsTable } from '../db/schema';
import { 
  getRegions, 
  getSchools, 
  getSubjects, 
  getAcademicYears,
  createRegion,
  createSchool,
  createSubject
} from '../handlers/master_data';
import { eq } from 'drizzle-orm';

describe('Master Data Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('getRegions', () => {
    it('should return empty array when no regions exist', async () => {
      const result = await getRegions();
      expect(result).toEqual([]);
    });

    it('should return all regions', async () => {
      // Create test regions
      await db.insert(regionsTable)
        .values([
          { name: 'Jakarta Pusat', code: 'JKT001' },
          { name: 'Jakarta Selatan', code: 'JKT002' }
        ])
        .execute();

      const result = await getRegions();

      expect(result).toHaveLength(2);
      expect(result[0].name).toEqual('Jakarta Pusat');
      expect(result[0].code).toEqual('JKT001');
      expect(result[1].name).toEqual('Jakarta Selatan');
      expect(result[1].code).toEqual('JKT002');
      result.forEach(region => {
        expect(region.id).toBeDefined();
        expect(region.created_at).toBeInstanceOf(Date);
      });
    });
  });

  describe('getSchools', () => {
    it('should return empty array when no schools exist', async () => {
      const result = await getSchools();
      expect(result).toEqual([]);
    });

    it('should return all schools when no regionId provided', async () => {
      // Create test region first
      const regionResult = await db.insert(regionsTable)
        .values({ name: 'Jakarta Pusat', code: 'JKT001' })
        .returning()
        .execute();
      const regionId = regionResult[0].id;

      // Create test schools
      await db.insert(schoolsTable)
        .values([
          { name: 'SMA 1 Jakarta', npsn: '20100001', address: 'Jl. Sudirman 1', level: 'sma', region_id: regionId },
          { name: 'SMP 2 Jakarta', npsn: '20200001', address: 'Jl. Thamrin 2', level: 'smp', region_id: regionId }
        ])
        .execute();

      const result = await getSchools();

      expect(result).toHaveLength(2);
      expect(result[0].name).toEqual('SMA 1 Jakarta');
      expect(result[0].level).toEqual('sma');
      expect(result[1].name).toEqual('SMP 2 Jakarta');
      expect(result[1].level).toEqual('smp');
    });

    it('should filter schools by region_id', async () => {
      // Create test regions
      const region1Result = await db.insert(regionsTable)
        .values({ name: 'Jakarta Pusat', code: 'JKT001' })
        .returning()
        .execute();
      const region1Id = region1Result[0].id;

      const region2Result = await db.insert(regionsTable)
        .values({ name: 'Jakarta Selatan', code: 'JKT002' })
        .returning()
        .execute();
      const region2Id = region2Result[0].id;

      // Create schools in different regions
      await db.insert(schoolsTable)
        .values([
          { name: 'SMA 1 Jakarta Pusat', npsn: '20100001', address: 'Jl. Sudirman 1', level: 'sma', region_id: region1Id },
          { name: 'SMA 1 Jakarta Selatan', npsn: '20100002', address: 'Jl. Kemang 1', level: 'sma', region_id: region2Id }
        ])
        .execute();

      const result = await getSchools(region1Id);

      expect(result).toHaveLength(1);
      expect(result[0].name).toEqual('SMA 1 Jakarta Pusat');
      expect(result[0].region_id).toEqual(region1Id);
    });
  });

  describe('getSubjects', () => {
    it('should return empty array when no subjects exist', async () => {
      const result = await getSubjects();
      expect(result).toEqual([]);
    });

    it('should return all subjects when no level provided', async () => {
      // Create test subjects
      await db.insert(subjectsTable)
        .values([
          { name: 'Matematika', code: 'MAT', level: 'sma' },
          { name: 'Bahasa Indonesia', code: 'BIN', level: 'smp' }
        ])
        .execute();

      const result = await getSubjects();

      expect(result).toHaveLength(2);
      expect(result[0].name).toEqual('Matematika');
      expect(result[0].level).toEqual('sma');
      expect(result[1].name).toEqual('Bahasa Indonesia');
      expect(result[1].level).toEqual('smp');
    });

    it('should filter subjects by level', async () => {
      // Create test subjects
      await db.insert(subjectsTable)
        .values([
          { name: 'Matematika SMA', code: 'MAT-SMA', level: 'sma' },
          { name: 'Matematika SMP', code: 'MAT-SMP', level: 'smp' }
        ])
        .execute();

      const result = await getSubjects('sma');

      expect(result).toHaveLength(1);
      expect(result[0].name).toEqual('Matematika SMA');
      expect(result[0].level).toEqual('sma');
    });
  });

  describe('getAcademicYears', () => {
    it('should return empty array when no academic years exist', async () => {
      const result = await getAcademicYears();
      expect(result).toEqual([]);
    });

    it('should return all academic years', async () => {
      // Create test academic years
      await db.insert(academicYearsTable)
        .values([
          { 
            year: '2023/2024', 
            start_date: new Date('2023-07-01'), 
            end_date: new Date('2024-06-30'),
            is_active: true
          },
          { 
            year: '2024/2025', 
            start_date: new Date('2024-07-01'), 
            end_date: new Date('2025-06-30'),
            is_active: false
          }
        ])
        .execute();

      const result = await getAcademicYears();

      expect(result).toHaveLength(2);
      expect(result[0].year).toEqual('2023/2024');
      expect(result[0].is_active).toBe(true);
      expect(result[1].year).toEqual('2024/2025');
      expect(result[1].is_active).toBe(false);
      result.forEach(year => {
        expect(year.start_date).toBeInstanceOf(Date);
        expect(year.end_date).toBeInstanceOf(Date);
      });
    });
  });

  describe('createRegion', () => {
    it('should create a new region', async () => {
      const result = await createRegion('Jakarta Pusat', 'JKT001');

      expect(result.name).toEqual('Jakarta Pusat');
      expect(result.code).toEqual('JKT001');
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should save region to database', async () => {
      const result = await createRegion('Jakarta Selatan', 'JKT002');

      const regions = await db.select()
        .from(regionsTable)
        .where(eq(regionsTable.id, result.id))
        .execute();

      expect(regions).toHaveLength(1);
      expect(regions[0].name).toEqual('Jakarta Selatan');
      expect(regions[0].code).toEqual('JKT002');
    });
  });

  describe('createSchool', () => {
    it('should create a new school', async () => {
      // Create region first
      const regionResult = await createRegion('Jakarta Pusat', 'JKT001');

      const result = await createSchool(
        'SMA Negeri 1 Jakarta', 
        '20100001', 
        'Jl. Sudirman No. 1', 
        'sma', 
        regionResult.id
      );

      expect(result.name).toEqual('SMA Negeri 1 Jakarta');
      expect(result.npsn).toEqual('20100001');
      expect(result.address).toEqual('Jl. Sudirman No. 1');
      expect(result.level).toEqual('sma');
      expect(result.region_id).toEqual(regionResult.id);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should throw error when region does not exist', async () => {
      await expect(
        createSchool('SMA Test', '20100001', 'Jl. Test', 'sma', 999)
      ).rejects.toThrow(/Region with id 999 does not exist/i);
    });

    it('should save school to database', async () => {
      // Create region first
      const regionResult = await createRegion('Jakarta Selatan', 'JKT002');

      const result = await createSchool(
        'SMP Negeri 2 Jakarta', 
        '20200001', 
        'Jl. Kemang No. 2', 
        'smp', 
        regionResult.id
      );

      const schools = await db.select()
        .from(schoolsTable)
        .where(eq(schoolsTable.id, result.id))
        .execute();

      expect(schools).toHaveLength(1);
      expect(schools[0].name).toEqual('SMP Negeri 2 Jakarta');
      expect(schools[0].level).toEqual('smp');
      expect(schools[0].region_id).toEqual(regionResult.id);
    });
  });

  describe('createSubject', () => {
    it('should create a new subject', async () => {
      const result = await createSubject('Matematika', 'MAT', 'sma');

      expect(result.name).toEqual('Matematika');
      expect(result.code).toEqual('MAT');
      expect(result.level).toEqual('sma');
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should save subject to database', async () => {
      const result = await createSubject('Bahasa Indonesia', 'BIN', 'smp');

      const subjects = await db.select()
        .from(subjectsTable)
        .where(eq(subjectsTable.id, result.id))
        .execute();

      expect(subjects).toHaveLength(1);
      expect(subjects[0].name).toEqual('Bahasa Indonesia');
      expect(subjects[0].code).toEqual('BIN');
      expect(subjects[0].level).toEqual('smp');
    });
  });
});
