
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import { 
  loginInputSchema, 
  createUserInputSchema, 
  getUsersQuerySchema,
  createGroupInputSchema,
  createActivityInputSchema,
  getActivitiesQuerySchema,
  createAttendanceInputSchema,
  createDocumentInputSchema,
  createSupervisionReportInputSchema,
  createAnnouncementInputSchema
} from './schema';

// Import handlers
import { login, resetPassword } from './handlers/auth';
import { createUser, getUsers, getUserById, updateUserStatus, getUsersByRole } from './handlers/users';
import { createGroup, getGroups, getGroupById, addGroupMember, removeGroupMember, getGroupMembers, setGroupAdmin } from './handlers/groups';
import { createActivity, getActivities, getActivityById, updateActivityStatus, getUpcomingActivities, getActivitiesByGroup } from './handlers/activities';
import { recordAttendance, getAttendanceByActivity, getUserAttendanceHistory, getAttendanceByUser, bulkRecordAttendance } from './handlers/attendance';
import { uploadDocument, getDocumentsByUser, getDocumentsByActivity, getDocumentsByGroup, deleteDocument, getDocumentById } from './handlers/documents';
import { createSupervisionReport, getSupervisionReportsBySupervisor, getSupervisionReportsBySchool, assignSchoolToSupervisor, getSupervisedSchools, removeSchoolSupervision } from './handlers/supervision';
import { getRegions, getSchools, getSubjects, getAcademicYears, createRegion, createSchool, createSubject } from './handlers/master_data';
import { createAnnouncement, getActiveAnnouncements, getAllAnnouncements, updateAnnouncementStatus, deleteAnnouncement } from './handlers/announcements';
import { getDashboardStats, getParticipationReport, getActivityFrequencyChart } from './handlers/dashboard';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Authentication
  login: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => login(input)),
  
  resetPassword: publicProcedure
    .input(z.object({ userId: z.number(), newPassword: z.string() }))
    .mutation(({ input }) => resetPassword(input.userId, input.newPassword)),

  // User management
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),
  
  getUsers: publicProcedure
    .input(getUsersQuerySchema.optional())
    .query(({ input }) => getUsers(input)),
  
  getUserById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getUserById(input.id)),
  
  updateUserStatus: publicProcedure
    .input(z.object({ id: z.number(), isActive: z.boolean() }))
    .mutation(({ input }) => updateUserStatus(input.id, input.isActive)),
  
  getUsersByRole: publicProcedure
    .input(z.object({ role: z.string() }))
    .query(({ input }) => getUsersByRole(input.role)),

  // Group management
  createGroup: publicProcedure
    .input(createGroupInputSchema)
    .mutation(({ input }) => createGroup(input)),
  
  getGroups: publicProcedure
    .query(() => getGroups()),
  
  getGroupById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getGroupById(input.id)),
  
  addGroupMember: publicProcedure
    .input(z.object({ groupId: z.number(), userId: z.number(), isAdmin: z.boolean().optional() }))
    .mutation(({ input }) => addGroupMember(input.groupId, input.userId, input.isAdmin)),
  
  removeGroupMember: publicProcedure
    .input(z.object({ groupId: z.number(), userId: z.number() }))
    .mutation(({ input }) => removeGroupMember(input.groupId, input.userId)),
  
  getGroupMembers: publicProcedure
    .input(z.object({ groupId: z.number() }))
    .query(({ input }) => getGroupMembers(input.groupId)),
  
  setGroupAdmin: publicProcedure
    .input(z.object({ groupId: z.number(), userId: z.number(), isAdmin: z.boolean() }))
    .mutation(({ input }) => setGroupAdmin(input.groupId, input.userId, input.isAdmin)),

  // Activity management
  createActivity: publicProcedure
    .input(createActivityInputSchema)
    .mutation(({ input }) => createActivity(input)),
  
  getActivities: publicProcedure
    .input(getActivitiesQuerySchema.optional())
    .query(({ input }) => getActivities(input)),
  
  getActivityById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getActivityById(input.id)),
  
  updateActivityStatus: publicProcedure
    .input(z.object({ id: z.number(), status: z.string() }))
    .mutation(({ input }) => updateActivityStatus(input.id, input.status)),
  
  getUpcomingActivities: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getUpcomingActivities(input.userId)),
  
  getActivitiesByGroup: publicProcedure
    .input(z.object({ groupId: z.number() }))
    .query(({ input }) => getActivitiesByGroup(input.groupId)),

  // Attendance management
  recordAttendance: publicProcedure
    .input(createAttendanceInputSchema)
    .mutation(({ input }) => recordAttendance(input)),
  
  getAttendanceByActivity: publicProcedure
    .input(z.object({ activityId: z.number() }))
    .query(({ input }) => getAttendanceByActivity(input.activityId)),
  
  getUserAttendanceHistory: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getUserAttendanceHistory(input.userId)),
  
  getAttendanceByUser: publicProcedure
    .input(z.object({ userId: z.number(), activityId: z.number() }))
    .query(({ input }) => getAttendanceByUser(input.userId, input.activityId)),
  
  bulkRecordAttendance: publicProcedure
    .input(z.array(createAttendanceInputSchema))
    .mutation(({ input }) => bulkRecordAttendance(input)),

  // Document management
  uploadDocument: publicProcedure
    .input(createDocumentInputSchema)
    .mutation(({ input }) => uploadDocument(input)),
  
  getDocumentsByUser: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getDocumentsByUser(input.userId)),
  
  getDocumentsByActivity: publicProcedure
    .input(z.object({ activityId: z.number() }))
    .query(({ input }) => getDocumentsByActivity(input.activityId)),
  
  getDocumentsByGroup: publicProcedure
    .input(z.object({ groupId: z.number() }))
    .query(({ input }) => getDocumentsByGroup(input.groupId)),
  
  deleteDocument: publicProcedure
    .input(z.object({ id: z.number(), userId: z.number() }))
    .mutation(({ input }) => deleteDocument(input.id, input.userId)),
  
  getDocumentById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getDocumentById(input.id)),

  // Supervision management
  createSupervisionReport: publicProcedure
    .input(createSupervisionReportInputSchema)
    .mutation(({ input }) => createSupervisionReport(input)),
  
  getSupervisionReportsBySupervisor: publicProcedure
    .input(z.object({ supervisorId: z.number() }))
    .query(({ input }) => getSupervisionReportsBySupervisor(input.supervisorId)),
  
  getSupervisionReportsBySchool: publicProcedure
    .input(z.object({ schoolId: z.number() }))
    .query(({ input }) => getSupervisionReportsBySchool(input.schoolId)),
  
  assignSchoolToSupervisor: publicProcedure
    .input(z.object({ supervisorId: z.number(), schoolId: z.number() }))
    .mutation(({ input }) => assignSchoolToSupervisor(input.supervisorId, input.schoolId)),
  
  getSupervisedSchools: publicProcedure
    .input(z.object({ supervisorId: z.number() }))
    .query(({ input }) => getSupervisedSchools(input.supervisorId)),
  
  removeSchoolSupervision: publicProcedure
    .input(z.object({ supervisorId: z.number(), schoolId: z.number() }))
    .mutation(({ input }) => removeSchoolSupervision(input.supervisorId, input.schoolId)),

  // Master data
  getRegions: publicProcedure
    .query(() => getRegions()),
  
  getSchools: publicProcedure
    .input(z.object({ regionId: z.number().optional() }))
    .query(({ input }) => getSchools(input?.regionId)),
  
  getSubjects: publicProcedure
    .input(z.object({ level: z.string().optional() }))
    .query(({ input }) => getSubjects(input?.level)),
  
  getAcademicYears: publicProcedure
    .query(() => getAcademicYears()),
  
  createRegion: publicProcedure
    .input(z.object({ name: z.string(), code: z.string() }))
    .mutation(({ input }) => createRegion(input.name, input.code)),
  
  createSchool: publicProcedure
    .input(z.object({ name: z.string(), npsn: z.string(), address: z.string(), level: z.string(), regionId: z.number() }))
    .mutation(({ input }) => createSchool(input.name, input.npsn, input.address, input.level, input.regionId)),
  
  createSubject: publicProcedure
    .input(z.object({ name: z.string(), code: z.string(), level: z.string() }))
    .mutation(({ input }) => createSubject(input.name, input.code, input.level)),

  // Announcements
  createAnnouncement: publicProcedure
    .input(createAnnouncementInputSchema)
    .mutation(({ input }) => createAnnouncement(input)),
  
  getActiveAnnouncements: publicProcedure
    .query(() => getActiveAnnouncements()),
  
  getAllAnnouncements: publicProcedure
    .query(() => getAllAnnouncements()),
  
  updateAnnouncementStatus: publicProcedure
    .input(z.object({ id: z.number(), isActive: z.boolean() }))
    .mutation(({ input }) => updateAnnouncementStatus(input.id, input.isActive)),
  
  deleteAnnouncement: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteAnnouncement(input.id)),

  // Dashboard
  getDashboardStats: publicProcedure
    .input(z.object({ userId: z.number(), userRole: z.string() }))
    .query(({ input }) => getDashboardStats(input.userId, input.userRole)),
  
  getParticipationReport: publicProcedure
    .input(z.object({ filters: z.any() }))
    .query(({ input }) => getParticipationReport(input.filters)),
  
  getActivityFrequencyChart: publicProcedure
    .input(z.object({ filters: z.any() }))
    .query(({ input }) => getActivityFrequencyChart(input.filters))
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`SEPAKAT TRPC server listening at port: ${port}`);
}

start();
