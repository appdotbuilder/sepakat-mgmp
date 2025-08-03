
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  regionsTable, 
  schoolsTable, 
  usersTable, 
  groupsTable, 
  activitiesTable,
  attendanceTable,
  groupMembersTable
} from '../db/schema';
import { getDashboardStats, getParticipationReport, getActivityFrequencyChart } from '../handlers/dashboard';

describe('Dashboard Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Test data setup helper
  const setupTestData = async () => {
    // Create regions
    const regions = await db.insert(regionsTable)
      .values([
        { name: 'Jakarta Pusat', code: 'JP' },
        { name: 'Jakarta Selatan', code: 'JS' }
      ])
      .returning()
      .execute();

    // Create schools
    const schools = await db.insert(schoolsTable)
      .values([
        { 
          name: 'SDN 001', 
          npsn: '001', 
          address: 'Jl. Test 1', 
          level: 'sd', 
          region_id: regions[0].id 
        },
        { 
          name: 'SMPN 002', 
          npsn: '002', 
          address: 'Jl. Test 2', 
          level: 'smp', 
          region_id: regions[1].id 
        }
      ])
      .returning()
      .execute();

    // Create users
    const users = await db.insert(usersTable)
      .values([
        {
          username: 'admin',
          email: 'admin@test.com',
          password_hash: 'hash1',
          full_name: 'Super Admin',
          role: 'super_admin',
          region_id: regions[0].id,
          school_id: schools[0].id,
          is_active: true
        },
        {
          username: 'teacher1',
          email: 'teacher1@test.com',
          password_hash: 'hash2',
          full_name: 'Teacher One',
          role: 'guru',
          region_id: regions[0].id,
          school_id: schools[0].id,
          is_active: true
        },
        {
          username: 'teacher2',
          email: 'teacher2@test.com',
          password_hash: 'hash3',
          full_name: 'Teacher Two',
          role: 'guru',
          region_id: regions[1].id,
          school_id: schools[1].id,
          is_active: true
        }
      ])
      .returning()
      .execute();

    // Create groups
    const groups = await db.insert(groupsTable)
      .values([
        {
          name: 'MGMP Matematika SD',
          type: 'mgmp',
          level: 'sd',
          region_id: regions[0].id,
          is_active: true
        },
        {
          name: 'MKKS SMP',
          type: 'mkks',
          level: 'smp',
          region_id: regions[1].id,
          is_active: true
        }
      ])
      .returning()
      .execute();

    // Create group memberships
    await db.insert(groupMembersTable)
      .values([
        { group_id: groups[0].id, user_id: users[1].id, is_admin: false },
        { group_id: groups[1].id, user_id: users[2].id, is_admin: true }
      ])
      .execute();

    // Create activities
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    const activities = await db.insert(activitiesTable)
      .values([
        {
          group_id: groups[0].id,
          title: 'Workshop Matematika',
          activity_date: tomorrow,
          start_time: '09:00',
          end_time: '12:00',
          location: 'Aula Sekolah',
          funding_source: 'apbd',
          status: 'published',
          created_by: users[0].id
        },
        {
          group_id: groups[0].id,
          title: 'Seminar Pendidikan',
          activity_date: yesterday,
          start_time: '13:00',
          end_time: '16:00',
          location: 'Gedung Dinas',
          funding_source: 'apbn',
          status: 'completed',
          created_by: users[0].id
        },
        {
          group_id: groups[1].id,
          title: 'Rapat Koordinasi',
          activity_date: now,
          start_time: '10:00',
          end_time: '11:00',
          location: 'Ruang Rapat',
          funding_source: 'swadaya',
          status: 'ongoing',
          created_by: users[0].id
        }
      ])
      .returning()
      .execute();

    // Create attendance records
    await db.insert(attendanceTable)
      .values([
        {
          activity_id: activities[1].id,
          user_id: users[1].id,
          is_present: true,
          recorded_by: users[0].id
        },
        {
          activity_id: activities[1].id,
          user_id: users[2].id,
          is_present: false,
          recorded_by: users[0].id
        }
      ])
      .execute();

    return { regions, schools, users, groups, activities };
  };

  describe('getDashboardStats', () => {
    it('should return dashboard stats for super admin', async () => {
      const testData = await setupTestData();
      
      const result = await getDashboardStats(testData.users[0].id, 'super_admin');

      expect(result.totalActivities).toBeGreaterThan(0);
      expect(result.upcomingActivities).toBeGreaterThan(0);
      expect(result.completedActivities).toBeGreaterThan(0);
      expect(result.totalParticipants).toEqual(3);
      expect(result.totalGroups).toEqual(2);
      expect(result.recentActivities).toBeInstanceOf(Array);
      expect(result.recentActivities.length).toBeGreaterThan(0);

      // Verify recent activities structure
      const recentActivity = result.recentActivities[0];
      expect(recentActivity.id).toBeDefined();
      expect(recentActivity.title).toBeDefined();
      expect(recentActivity.activity_date).toBeInstanceOf(Date);
      expect(recentActivity.status).toBeDefined();
      expect(recentActivity.group_name).toBeDefined();
    });

    it('should return filtered stats for regional role', async () => {
      const testData = await setupTestData();
      
      const result = await getDashboardStats(testData.users[1].id, 'kepala_cabdin');

      expect(result.totalActivities).toBeGreaterThan(0);
      expect(result.totalParticipants).toBeGreaterThan(0);
      expect(result.totalGroups).toBeGreaterThan(0);
      expect(result.recentActivities).toBeInstanceOf(Array);
    });

    it('should handle user not found', async () => {
      await setupTestData();
      
      await expect(getDashboardStats(999, 'super_admin')).rejects.toThrow(/user not found/i);
    });

    it('should return stats for admin grup role', async () => {
      const testData = await setupTestData();
      
      const result = await getDashboardStats(testData.users[2].id, 'admin_grup');

      expect(result.totalActivities).toBeGreaterThanOrEqual(0);
      expect(result.upcomingActivities).toBeGreaterThanOrEqual(0);
      expect(result.completedActivities).toBeGreaterThanOrEqual(0);
      expect(result.totalParticipants).toBeGreaterThanOrEqual(0);
      expect(result.totalGroups).toBeGreaterThanOrEqual(0);
      expect(result.recentActivities).toBeInstanceOf(Array);
    });
  });

  describe('getParticipationReport', () => {
    it('should return participation report without filters', async () => {
      const testData = await setupTestData();
      
      const result = await getParticipationReport({});

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);

      const report = result[0];
      expect(report.user_id).toBeDefined();
      expect(report.full_name).toBeDefined();
      expect(report.role).toBeDefined();
      expect(typeof report.total_activities).toBe('number');
      expect(typeof report.attended_activities).toBe('number');
      expect(typeof report.attendance_rate).toBe('number');
    });

    it('should filter by region_id', async () => {
      const testData = await setupTestData();
      
      const result = await getParticipationReport({
        region_id: testData.regions[0].id
      });

      expect(result).toBeInstanceOf(Array);
      result.forEach(report => {
        expect(report.user_id).toBeDefined();
        expect(report.full_name).toBeDefined();
      });
    });

    it('should filter by user role', async () => {
      const testData = await setupTestData();
      
      const result = await getParticipationReport({
        user_role: 'guru'
      });

      expect(result).toBeInstanceOf(Array);
      result.forEach(report => {
        expect(report.role).toEqual('guru');
      });
    });

    it('should calculate attendance rate correctly', async () => {
      const testData = await setupTestData();
      
      const result = await getParticipationReport({});

      result.forEach(report => {
        if (report.total_activities > 0) {
          const expectedRate = Math.round((report.attended_activities / report.total_activities) * 100);
          expect(report.attendance_rate).toEqual(expectedRate);
        } else {
          expect(report.attendance_rate).toEqual(0);
        }
      });
    });
  });

  describe('getActivityFrequencyChart', () => {
    it('should return activity frequency chart without filters', async () => {
      await setupTestData();
      
      const result = await getActivityFrequencyChart({});

      expect(result.labels).toBeInstanceOf(Array);
      expect(result.datasets).toBeInstanceOf(Array);
      expect(result.datasets).toHaveLength(2);
      
      const totalDataset = result.datasets[0];
      const completedDataset = result.datasets[1];
      
      expect(totalDataset.label).toEqual('Total Kegiatan');
      expect(totalDataset.data).toBeInstanceOf(Array);
      expect(completedDataset.label).toEqual('Kegiatan Selesai');
      expect(completedDataset.data).toBeInstanceOf(Array);
      
      expect(result.labels.length).toEqual(totalDataset.data.length);
      expect(result.labels.length).toEqual(completedDataset.data.length);
    });

    it('should filter by date range', async () => {
      await setupTestData();
      
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 2);
      const endDate = new Date();
      
      const result = await getActivityFrequencyChart({
        date_from: startDate,
        date_to: endDate
      });

      expect(result.labels).toBeInstanceOf(Array);
      expect(result.datasets).toBeInstanceOf(Array);
      expect(result.labels.length).toBeGreaterThan(0);
    });

    it('should filter by region_id', async () => {
      const testData = await setupTestData();
      
      const result = await getActivityFrequencyChart({
        region_id: testData.regions[0].id
      });

      expect(result.labels).toBeInstanceOf(Array);
      expect(result.datasets).toBeInstanceOf(Array);
      expect(result.datasets).toHaveLength(2);
    });

    it('should handle empty data gracefully', async () => {
      // Setup data but query with non-existent region
      await setupTestData();
      
      const result = await getActivityFrequencyChart({
        region_id: 999
      });

      expect(result.labels).toBeInstanceOf(Array);
      expect(result.datasets).toBeInstanceOf(Array);
      expect(result.datasets).toHaveLength(2);
      
      // Data arrays should exist but may be empty or zero-filled
      result.datasets.forEach(dataset => {
        expect(dataset.data).toBeInstanceOf(Array);
        dataset.data.forEach(value => {
          expect(typeof value).toBe('number');
        });
      });
    });
  });
});
