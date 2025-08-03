
import { db } from '../db';
import { 
  activitiesTable, 
  attendanceTable, 
  groupsTable, 
  usersTable,
  groupMembersTable 
} from '../db/schema';
import { eq, and, count, gte, lte, desc, SQL } from 'drizzle-orm';
import type { UserRole } from '../schema';

interface DashboardStats {
  totalActivities: number;
  upcomingActivities: number;
  completedActivities: number;
  totalParticipants: number;
  totalGroups: number;
  recentActivities: Array<{
    id: number;
    title: string;
    activity_date: Date;
    status: string;
    group_name: string;
  }>;
}

interface ParticipationReportFilters {
  region_id?: number;
  group_id?: number;
  date_from?: Date;
  date_to?: Date;
  user_role?: UserRole;
}

interface ParticipationReport {
  user_id: number;
  full_name: string;
  role: string;
  total_activities: number;
  attended_activities: number;
  attendance_rate: number;
  group_name?: string;
}

interface ActivityFrequencyFilters {
  region_id?: number;
  group_id?: number;
  date_from?: Date;
  date_to?: Date;
}

interface ActivityFrequencyChart {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
  }>;
}

export async function getDashboardStats(userId: number, userRole: string): Promise<DashboardStats> {
  try {
    // Get user's region and school context
    const userContext = await db.select({
      region_id: usersTable.region_id,
      school_id: usersTable.school_id
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .execute();

    const user = userContext[0];
    if (!user) {
      throw new Error('User not found');
    }

    // Current date for filtering
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Total activities query
    let totalActivitiesResult;
    
    if (['kepala_cabdin', 'kepala_bidang', 'pengawas_bina'].includes(userRole) && user.region_id) {
      totalActivitiesResult = await db.select({ count: count() })
        .from(activitiesTable)
        .innerJoin(groupsTable, eq(activitiesTable.group_id, groupsTable.id))
        .where(eq(groupsTable.region_id, user.region_id))
        .execute();
    } else if (userRole === 'admin_grup') {
      // Get groups where user is admin
      const adminGroups = await db.select({ group_id: groupMembersTable.group_id })
        .from(groupMembersTable)
        .where(and(
          eq(groupMembersTable.user_id, userId),
          eq(groupMembersTable.is_admin, true)
        ))
        .execute();
      
      if (adminGroups.length > 0) {
        const groupIds = adminGroups.map(g => g.group_id);
        totalActivitiesResult = await db.select({ count: count() })
          .from(activitiesTable)
          .where(eq(activitiesTable.group_id, groupIds[0]))
          .execute();
      } else {
        totalActivitiesResult = [{ count: 0 }];
      }
    } else if (userRole === 'guru' || userRole === 'kepala_sekolah') {
      // Get user's groups
      const userGroups = await db.select({ group_id: groupMembersTable.group_id })
        .from(groupMembersTable)
        .where(eq(groupMembersTable.user_id, userId))
        .execute();
      
      if (userGroups.length > 0) {
        const groupIds = userGroups.map(g => g.group_id);
        totalActivitiesResult = await db.select({ count: count() })
          .from(activitiesTable)
          .where(eq(activitiesTable.group_id, groupIds[0]))
          .execute();
      } else {
        totalActivitiesResult = [{ count: 0 }];
      }
    } else {
      // Super admin - see all activities
      totalActivitiesResult = await db.select({ count: count() })
        .from(activitiesTable)
        .execute();
    }

    const totalActivities = totalActivitiesResult[0].count;

    // Upcoming activities query
    let upcomingResult;
    
    if (['kepala_cabdin', 'kepala_bidang', 'pengawas_bina'].includes(userRole) && user.region_id) {
      upcomingResult = await db.select({ count: count() })
        .from(activitiesTable)
        .innerJoin(groupsTable, eq(activitiesTable.group_id, groupsTable.id))
        .where(and(
          gte(activitiesTable.activity_date, now),
          eq(activitiesTable.status, 'published'),
          eq(groupsTable.region_id, user.region_id)
        ))
        .execute();
    } else {
      upcomingResult = await db.select({ count: count() })
        .from(activitiesTable)
        .where(and(
          gte(activitiesTable.activity_date, now),
          eq(activitiesTable.status, 'published')
        ))
        .execute();
    }

    const upcomingActivities = upcomingResult[0].count;

    // Completed activities query
    let completedResult;
    
    if (['kepala_cabdin', 'kepala_bidang', 'pengawas_bina'].includes(userRole) && user.region_id) {
      completedResult = await db.select({ count: count() })
        .from(activitiesTable)
        .innerJoin(groupsTable, eq(activitiesTable.group_id, groupsTable.id))
        .where(and(
          eq(activitiesTable.status, 'completed'),
          eq(groupsTable.region_id, user.region_id)
        ))
        .execute();
    } else {
      completedResult = await db.select({ count: count() })
        .from(activitiesTable)
        .where(eq(activitiesTable.status, 'completed'))
        .execute();
    }

    const completedActivities = completedResult[0].count;

    // Total participants query
    let participantsResult;
    
    if (['kepala_cabdin', 'kepala_bidang', 'pengawas_bina'].includes(userRole) && user.region_id) {
      participantsResult = await db.select({ count: count() })
        .from(usersTable)
        .where(and(
          eq(usersTable.is_active, true),
          eq(usersTable.region_id, user.region_id)
        ))
        .execute();
    } else if (userRole === 'pengawas_sekolah' && user.school_id) {
      participantsResult = await db.select({ count: count() })
        .from(usersTable)
        .where(and(
          eq(usersTable.is_active, true),
          eq(usersTable.school_id, user.school_id)
        ))
        .execute();
    } else {
      participantsResult = await db.select({ count: count() })
        .from(usersTable)
        .where(eq(usersTable.is_active, true))
        .execute();
    }

    const totalParticipants = participantsResult[0].count;

    // Total groups query
    let groupsResult;
    
    if (['kepala_cabdin', 'kepala_bidang', 'pengawas_bina'].includes(userRole) && user.region_id) {
      groupsResult = await db.select({ count: count() })
        .from(groupsTable)
        .where(and(
          eq(groupsTable.is_active, true),
          eq(groupsTable.region_id, user.region_id)
        ))
        .execute();
    } else {
      groupsResult = await db.select({ count: count() })
        .from(groupsTable)
        .where(eq(groupsTable.is_active, true))
        .execute();
    }

    const totalGroups = groupsResult[0].count;

    // Recent activities query
    let recentActivities;
    
    if (['kepala_cabdin', 'kepala_bidang', 'pengawas_bina'].includes(userRole) && user.region_id) {
      recentActivities = await db.select({
        id: activitiesTable.id,
        title: activitiesTable.title,
        activity_date: activitiesTable.activity_date,
        status: activitiesTable.status,
        group_name: groupsTable.name
      })
      .from(activitiesTable)
      .innerJoin(groupsTable, eq(activitiesTable.group_id, groupsTable.id))
      .where(and(
        gte(activitiesTable.created_at, startOfMonth),
        eq(groupsTable.region_id, user.region_id)
      ))
      .orderBy(desc(activitiesTable.created_at))
      .limit(5)
      .execute();
    } else {
      recentActivities = await db.select({
        id: activitiesTable.id,
        title: activitiesTable.title,
        activity_date: activitiesTable.activity_date,
        status: activitiesTable.status,
        group_name: groupsTable.name
      })
      .from(activitiesTable)
      .innerJoin(groupsTable, eq(activitiesTable.group_id, groupsTable.id))
      .where(gte(activitiesTable.created_at, startOfMonth))
      .orderBy(desc(activitiesTable.created_at))
      .limit(5)
      .execute();
    }

    return {
      totalActivities,
      upcomingActivities,
      completedActivities,
      totalParticipants,
      totalGroups,
      recentActivities
    };

  } catch (error) {
    console.error('Dashboard stats retrieval failed:', error);
    throw error;
  }
}

export async function getParticipationReport(filters: ParticipationReportFilters): Promise<ParticipationReport[]> {
  try {
    // Build base query with joins
    const baseQuery = db.select({
      user_id: usersTable.id,
      full_name: usersTable.full_name,
      role: usersTable.role,
      group_name: groupsTable.name
    })
    .from(usersTable)
    .leftJoin(groupMembersTable, eq(usersTable.id, groupMembersTable.user_id))
    .leftJoin(groupsTable, eq(groupMembersTable.group_id, groupsTable.id));

    // Build conditions
    const conditions: SQL<unknown>[] = [eq(usersTable.is_active, true)];

    if (filters.region_id) {
      conditions.push(eq(usersTable.region_id, filters.region_id));
    }

    if (filters.group_id) {
      conditions.push(eq(groupsTable.id, filters.group_id));
    }

    if (filters.user_role) {
      conditions.push(eq(usersTable.role, filters.user_role));
    }

    // Apply conditions and execute
    const users = await baseQuery.where(and(...conditions)).execute();

    // Get participation stats for each user
    const participationReports: ParticipationReport[] = [];

    for (const user of users) {
      // Count total activities user could have attended
      let totalActivitiesQuery = db.select({ count: count() })
        .from(activitiesTable)
        .innerJoin(groupMembersTable, eq(activitiesTable.group_id, groupMembersTable.group_id))
        .where(eq(groupMembersTable.user_id, user.user_id));

      // Apply date filters if provided
      if (filters.date_from && filters.date_to) {
        totalActivitiesQuery = db.select({ count: count() })
          .from(activitiesTable)
          .innerJoin(groupMembersTable, eq(activitiesTable.group_id, groupMembersTable.group_id))
          .where(and(
            eq(groupMembersTable.user_id, user.user_id),
            gte(activitiesTable.activity_date, filters.date_from),
            lte(activitiesTable.activity_date, filters.date_to)
          ));
      }

      const totalResult = await totalActivitiesQuery.execute();
      const totalActivities = totalResult[0].count;

      // Count attended activities
      let attendedQuery = db.select({ count: count() })
        .from(attendanceTable)
        .innerJoin(activitiesTable, eq(attendanceTable.activity_id, activitiesTable.id))
        .where(and(
          eq(attendanceTable.user_id, user.user_id),
          eq(attendanceTable.is_present, true)
        ));

      // Apply date filters if provided
      if (filters.date_from && filters.date_to) {
        attendedQuery = db.select({ count: count() })
          .from(attendanceTable)
          .innerJoin(activitiesTable, eq(attendanceTable.activity_id, activitiesTable.id))
          .where(and(
            eq(attendanceTable.user_id, user.user_id),
            eq(attendanceTable.is_present, true),
            gte(activitiesTable.activity_date, filters.date_from),
            lte(activitiesTable.activity_date, filters.date_to)
          ));
      }

      const attendedResult = await attendedQuery.execute();
      const attendedActivities = attendedResult[0].count;

      const attendanceRate = totalActivities > 0 
        ? Math.round((attendedActivities / totalActivities) * 100) 
        : 0;

      participationReports.push({
        user_id: user.user_id,
        full_name: user.full_name,
        role: user.role,
        total_activities: totalActivities,
        attended_activities: attendedActivities,
        attendance_rate: attendanceRate,
        group_name: user.group_name || undefined
      });
    }

    return participationReports;

  } catch (error) {
    console.error('Participation report generation failed:', error);
    throw error;
  }
}

export async function getActivityFrequencyChart(filters: ActivityFrequencyFilters): Promise<ActivityFrequencyChart> {
  try {
    // Default to last 6 months if no date range provided
    const endDate = filters.date_to || new Date();
    const startDate = filters.date_from || new Date(endDate.getFullYear(), endDate.getMonth() - 5, 1);
    
    // Build base query
    let query = db.select({
      activity_date: activitiesTable.activity_date,
      status: activitiesTable.status
    })
    .from(activitiesTable)
    .where(and(
      gte(activitiesTable.activity_date, startDate),
      lte(activitiesTable.activity_date, endDate)
    ));

    // Apply filters
    if (filters.region_id || filters.group_id) {
      const conditions: SQL<unknown>[] = [
        gte(activitiesTable.activity_date, startDate),
        lte(activitiesTable.activity_date, endDate)
      ];

      if (filters.region_id) {
        conditions.push(eq(groupsTable.region_id, filters.region_id));
      }
      
      if (filters.group_id) {
        conditions.push(eq(groupsTable.id, filters.group_id));
      }

      query = db.select({
        activity_date: activitiesTable.activity_date,
        status: activitiesTable.status
      })
      .from(activitiesTable)
      .innerJoin(groupsTable, eq(activitiesTable.group_id, groupsTable.id))
      .where(and(...conditions));
    }

    const activities = await query.execute();

    // Group activities by month
    const monthlyData = new Map<string, { completed: number, total: number }>();
    
    activities.forEach(activity => {
      const monthKey = activity.activity_date.toISOString().substring(0, 7); // YYYY-MM format
      
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, { completed: 0, total: 0 });
      }
      
      const data = monthlyData.get(monthKey)!;
      data.total++;
      
      if (activity.status === 'completed') {
        data.completed++;
      }
    });

    // Generate labels for the chart (all months in range)
    const labels: string[] = [];
    const totalData: number[] = [];
    const completedData: number[] = [];
    
    const current = new Date(startDate);
    while (current <= endDate) {
      const monthKey = current.toISOString().substring(0, 7);
      const monthName = current.toLocaleDateString('id-ID', { year: 'numeric', month: 'short' });
      
      labels.push(monthName);
      
      const data = monthlyData.get(monthKey) || { completed: 0, total: 0 };
      totalData.push(data.total);
      completedData.push(data.completed);
      
      current.setMonth(current.getMonth() + 1);
    }

    return {
      labels,
      datasets: [
        {
          label: 'Total Kegiatan',
          data: totalData
        },
        {
          label: 'Kegiatan Selesai',
          data: completedData
        }
      ]
    };

  } catch (error) {
    console.error('Activity frequency chart generation failed:', error);
    throw error;
  }
}
