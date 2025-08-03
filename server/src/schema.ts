
import { z } from 'zod';

// Enums
export const userRoleSchema = z.enum([
  'super_admin',      // Staf Cabang Dinas
  'kepala_cabdin',    // Kepala Cabang Dinas
  'kepala_bidang',    // Kepala Bidang
  'pengawas_bina',    // Pengawas Bina
  'pengawas_sekolah', // Pengawas Sekolah
  'admin_grup',       // Pengurus MGMP/MKKS
  'guru',             // Guru
  'kepala_sekolah'    // Kepala Sekolah
]);

export const groupTypeSchema = z.enum(['mgmp', 'mkks']);
export const educationLevelSchema = z.enum(['sd', 'smp', 'sma', 'smk']);
export const activityStatusSchema = z.enum(['draft', 'published', 'ongoing', 'completed', 'cancelled']);
export const documentTypeSchema = z.enum(['pelatihan_sertifikat', 'workshop', 'seminar', 'pendidikan_formal', 'penelitian', 'karya_ilmiah', 'lainnya']);
export const fundingSourceSchema = z.enum(['apbd', 'apbn', 'swadaya', 'sponsor', 'lainnya']);

// Base schemas
export const regionSchema = z.object({
  id: z.number(),
  name: z.string(),
  code: z.string(),
  created_at: z.coerce.date()
});

export const schoolSchema = z.object({
  id: z.number(),
  name: z.string(),
  npsn: z.string(),
  address: z.string(),
  level: educationLevelSchema,
  region_id: z.number(),
  created_at: z.coerce.date()
});

export const subjectSchema = z.object({
  id: z.number(),
  name: z.string(),
  code: z.string(),
  level: educationLevelSchema,
  created_at: z.coerce.date()
});

export const academicYearSchema = z.object({
  id: z.number(),
  year: z.string(),
  start_date: z.coerce.date(),
  end_date: z.coerce.date(),
  is_active: z.boolean(),
  created_at: z.coerce.date()
});

export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string(),
  password_hash: z.string(),
  full_name: z.string(),
  nip: z.string().nullable(),
  role: userRoleSchema,
  school_id: z.number().nullable(),
  region_id: z.number().nullable(),
  level: educationLevelSchema.nullable(),
  is_active: z.boolean(),
  last_login: z.coerce.date().nullable(),
  created_at: z.coerce.date()
});

export const groupSchema = z.object({
  id: z.number(),
  name: z.string(),
  type: groupTypeSchema,
  level: educationLevelSchema,
  region_id: z.number(),
  subject_id: z.number().nullable(),
  description: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.coerce.date()
});

export const activitySchema = z.object({
  id: z.number(),
  group_id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  activity_date: z.coerce.date(),
  start_time: z.string(),
  end_time: z.string(),
  location: z.string(),
  speaker: z.string().nullable(),
  funding_source: fundingSourceSchema,
  status: activityStatusSchema,
  created_by: z.number(),
  created_at: z.coerce.date()
});

export const attendanceSchema = z.object({
  id: z.number(),
  activity_id: z.number(),
  user_id: z.number(),
  is_present: z.boolean(),
  notes: z.string().nullable(),
  recorded_by: z.number(),
  recorded_at: z.coerce.date()
});

export const documentSchema = z.object({
  id: z.number(),
  user_id: z.number().nullable(),
  activity_id: z.number().nullable(),
  group_id: z.number().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  file_path: z.string(),
  file_name: z.string(),
  file_size: z.number(),
  mime_type: z.string(),
  document_type: documentTypeSchema,
  uploaded_by: z.number(),
  created_at: z.coerce.date()
});

export const supervisionReportSchema = z.object({
  id: z.number(),
  supervisor_id: z.number(),
  school_id: z.number(),
  visit_date: z.coerce.date(),
  title: z.string(),
  description: z.string().nullable(),
  file_path: z.string(),
  file_name: z.string(),
  created_at: z.coerce.date()
});

export const announcementSchema = z.object({
  id: z.number(),
  title: z.string(),
  content: z.string(),
  is_active: z.boolean(),
  created_by: z.number(),
  created_at: z.coerce.date()
});

// Type exports
export type UserRole = z.infer<typeof userRoleSchema>;
export type GroupType = z.infer<typeof groupTypeSchema>;
export type EducationLevel = z.infer<typeof educationLevelSchema>;
export type ActivityStatus = z.infer<typeof activityStatusSchema>;
export type DocumentType = z.infer<typeof documentTypeSchema>;
export type FundingSource = z.infer<typeof fundingSourceSchema>;

export type Region = z.infer<typeof regionSchema>;
export type School = z.infer<typeof schoolSchema>;
export type Subject = z.infer<typeof subjectSchema>;
export type AcademicYear = z.infer<typeof academicYearSchema>;
export type User = z.infer<typeof userSchema>;
export type Group = z.infer<typeof groupSchema>;
export type Activity = z.infer<typeof activitySchema>;
export type Attendance = z.infer<typeof attendanceSchema>;
export type Document = z.infer<typeof documentSchema>;
export type SupervisionReport = z.infer<typeof supervisionReportSchema>;
export type Announcement = z.infer<typeof announcementSchema>;

// Input schemas for create operations
export const createUserInputSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string(),
  nip: z.string().nullable(),
  role: userRoleSchema,
  school_id: z.number().nullable(),
  region_id: z.number().nullable(),
  level: educationLevelSchema.nullable()
});

export const createGroupInputSchema = z.object({
  name: z.string(),
  type: groupTypeSchema,
  level: educationLevelSchema,
  region_id: z.number(),
  subject_id: z.number().nullable(),
  description: z.string().nullable()
});

export const createActivityInputSchema = z.object({
  group_id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  activity_date: z.coerce.date(),
  start_time: z.string(),
  end_time: z.string(),
  location: z.string(),
  speaker: z.string().nullable(),
  funding_source: fundingSourceSchema,
  created_by: z.number()
});

export const createAttendanceInputSchema = z.object({
  activity_id: z.number(),
  user_id: z.number(),
  is_present: z.boolean(),
  notes: z.string().nullable(),
  recorded_by: z.number()
});

export const createDocumentInputSchema = z.object({
  user_id: z.number().nullable(),
  activity_id: z.number().nullable(),
  group_id: z.number().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  file_path: z.string(),
  file_name: z.string(),
  file_size: z.number(),
  mime_type: z.string(),
  document_type: documentTypeSchema,
  uploaded_by: z.number()
});

export const createSupervisionReportInputSchema = z.object({
  supervisor_id: z.number(),
  school_id: z.number(),
  visit_date: z.coerce.date(),
  title: z.string(),
  description: z.string().nullable(),
  file_path: z.string(),
  file_name: z.string()
});

export const createAnnouncementInputSchema = z.object({
  title: z.string(),
  content: z.string(),
  created_by: z.number()
});

// Input type exports
export type CreateUserInput = z.infer<typeof createUserInputSchema>;
export type CreateGroupInput = z.infer<typeof createGroupInputSchema>;
export type CreateActivityInput = z.infer<typeof createActivityInputSchema>;
export type CreateAttendanceInput = z.infer<typeof createAttendanceInputSchema>;
export type CreateDocumentInput = z.infer<typeof createDocumentInputSchema>;
export type CreateSupervisionReportInput = z.infer<typeof createSupervisionReportInputSchema>;
export type CreateAnnouncementInput = z.infer<typeof createAnnouncementInputSchema>;

// Authentication schemas
export const loginInputSchema = z.object({
  username: z.string(),
  password: z.string()
});

export const loginResponseSchema = z.object({
  user: userSchema,
  token: z.string()
});

export type LoginInput = z.infer<typeof loginInputSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;

// Query schemas
export const getUsersQuerySchema = z.object({
  role: userRoleSchema.optional(),
  region_id: z.number().optional(),
  school_id: z.number().optional(),
  is_active: z.boolean().optional()
});

export const getActivitiesQuerySchema = z.object({
  group_id: z.number().optional(),
  status: activityStatusSchema.optional(),
  date_from: z.coerce.date().optional(),
  date_to: z.coerce.date().optional()
});

export type GetUsersQuery = z.infer<typeof getUsersQuerySchema>;
export type GetActivitiesQuery = z.infer<typeof getActivitiesQuerySchema>;
