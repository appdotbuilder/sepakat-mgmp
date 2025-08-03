
import { serial, text, pgTable, timestamp, boolean, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', [
  'super_admin',
  'kepala_cabdin',
  'kepala_bidang',
  'pengawas_bina',
  'pengawas_sekolah',
  'admin_grup',
  'guru',
  'kepala_sekolah'
]);

export const groupTypeEnum = pgEnum('group_type', ['mgmp', 'mkks']);
export const educationLevelEnum = pgEnum('education_level', ['sd', 'smp', 'sma', 'smk']);
export const activityStatusEnum = pgEnum('activity_status', ['draft', 'published', 'ongoing', 'completed', 'cancelled']);
export const documentTypeEnum = pgEnum('document_type', ['pelatihan_sertifikat', 'workshop', 'seminar', 'pendidikan_formal', 'penelitian', 'karya_ilmiah', 'lainnya']);
export const fundingSourceEnum = pgEnum('funding_source', ['apbd', 'apbn', 'swadaya', 'sponsor', 'lainnya']);

// Tables
export const regionsTable = pgTable('regions', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  code: text('code').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

export const schoolsTable = pgTable('schools', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  npsn: text('npsn').notNull(),
  address: text('address').notNull(),
  level: educationLevelEnum('level').notNull(),
  region_id: integer('region_id').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

export const subjectsTable = pgTable('subjects', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  code: text('code').notNull(),
  level: educationLevelEnum('level').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

export const academicYearsTable = pgTable('academic_years', {
  id: serial('id').primaryKey(),
  year: text('year').notNull(),
  start_date: timestamp('start_date').notNull(),
  end_date: timestamp('end_date').notNull(),
  is_active: boolean('is_active').default(false).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull(),
  email: text('email').notNull(),
  password_hash: text('password_hash').notNull(),
  full_name: text('full_name').notNull(),
  nip: text('nip'),
  role: userRoleEnum('role').notNull(),
  school_id: integer('school_id'),
  region_id: integer('region_id'),
  level: educationLevelEnum('level'),
  is_active: boolean('is_active').default(true).notNull(),
  last_login: timestamp('last_login'),
  created_at: timestamp('created_at').defaultNow().notNull()
});

export const groupsTable = pgTable('groups', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  type: groupTypeEnum('type').notNull(),
  level: educationLevelEnum('level').notNull(),
  region_id: integer('region_id').notNull(),
  subject_id: integer('subject_id'),
  description: text('description'),
  is_active: boolean('is_active').default(true).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

export const groupMembersTable = pgTable('group_members', {
  id: serial('id').primaryKey(),
  group_id: integer('group_id').notNull(),
  user_id: integer('user_id').notNull(),
  is_admin: boolean('is_admin').default(false).notNull(),
  joined_at: timestamp('joined_at').defaultNow().notNull()
});

export const activitiesTable = pgTable('activities', {
  id: serial('id').primaryKey(),
  group_id: integer('group_id').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  activity_date: timestamp('activity_date').notNull(),
  start_time: text('start_time').notNull(),
  end_time: text('end_time').notNull(),
  location: text('location').notNull(),
  speaker: text('speaker'),
  funding_source: fundingSourceEnum('funding_source').notNull(),
  status: activityStatusEnum('status').default('draft').notNull(),
  created_by: integer('created_by').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

export const attendanceTable = pgTable('attendance', {
  id: serial('id').primaryKey(),
  activity_id: integer('activity_id').notNull(),
  user_id: integer('user_id').notNull(),
  is_present: boolean('is_present').notNull(),
  notes: text('notes'),
  recorded_by: integer('recorded_by').notNull(),
  recorded_at: timestamp('recorded_at').defaultNow().notNull()
});

export const documentsTable = pgTable('documents', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id'),
  activity_id: integer('activity_id'),
  group_id: integer('group_id'),
  title: text('title').notNull(),
  description: text('description'),
  file_path: text('file_path').notNull(),
  file_name: text('file_name').notNull(),
  file_size: integer('file_size').notNull(),
  mime_type: text('mime_type').notNull(),
  document_type: documentTypeEnum('document_type').notNull(),
  uploaded_by: integer('uploaded_by').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

export const supervisionReportsTable = pgTable('supervision_reports', {
  id: serial('id').primaryKey(),
  supervisor_id: integer('supervisor_id').notNull(),
  school_id: integer('school_id').notNull(),
  visit_date: timestamp('visit_date').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  file_path: text('file_path').notNull(),
  file_name: text('file_name').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

export const schoolSupervisionTable = pgTable('school_supervision', {
  id: serial('id').primaryKey(),
  supervisor_id: integer('supervisor_id').notNull(),
  school_id: integer('school_id').notNull(),
  assigned_at: timestamp('assigned_at').defaultNow().notNull()
});

export const announcementsTable = pgTable('announcements', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  is_active: boolean('is_active').default(true).notNull(),
  created_by: integer('created_by').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Relations
export const schoolsRelations = relations(schoolsTable, ({ one, many }) => ({
  region: one(regionsTable, {
    fields: [schoolsTable.region_id],
    references: [regionsTable.id]
  }),
  users: many(usersTable),
  supervisionReports: many(supervisionReportsTable)
}));

export const usersRelations = relations(usersTable, ({ one, many }) => ({
  school: one(schoolsTable, {
    fields: [usersTable.school_id],
    references: [schoolsTable.id]
  }),
  region: one(regionsTable, {
    fields: [usersTable.region_id],
    references: [regionsTable.id]
  }),
  groupMemberships: many(groupMembersTable),
  createdActivities: many(activitiesTable),
  attendance: many(attendanceTable),
  documents: many(documentsTable),
  supervisionReports: many(supervisionReportsTable)
}));

export const groupsRelations = relations(groupsTable, ({ one, many }) => ({
  region: one(regionsTable, {
    fields: [groupsTable.region_id],
    references: [regionsTable.id]
  }),
  subject: one(subjectsTable, {
    fields: [groupsTable.subject_id],
    references: [subjectsTable.id]
  }),
  members: many(groupMembersTable),
  activities: many(activitiesTable),
  documents: many(documentsTable)
}));

export const groupMembersRelations = relations(groupMembersTable, ({ one }) => ({
  group: one(groupsTable, {
    fields: [groupMembersTable.group_id],
    references: [groupsTable.id]
  }),
  user: one(usersTable, {
    fields: [groupMembersTable.user_id],
    references: [usersTable.id]
  })
}));

export const activitiesRelations = relations(activitiesTable, ({ one, many }) => ({
  group: one(groupsTable, {
    fields: [activitiesTable.group_id],
    references: [groupsTable.id]
  }),
  creator: one(usersTable, {
    fields: [activitiesTable.created_by],
    references: [usersTable.id]
  }),
  attendance: many(attendanceTable),
  documents: many(documentsTable)
}));

export const attendanceRelations = relations(attendanceTable, ({ one }) => ({
  activity: one(activitiesTable, {
    fields: [attendanceTable.activity_id],
    references: [activitiesTable.id]
  }),
  user: one(usersTable, {
    fields: [attendanceTable.user_id],
    references: [usersTable.id]
  }),
  recorder: one(usersTable, {
    fields: [attendanceTable.recorded_by],
    references: [usersTable.id]
  })
}));

export const documentsRelations = relations(documentsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [documentsTable.user_id],
    references: [usersTable.id]
  }),
  activity: one(activitiesTable, {
    fields: [documentsTable.activity_id],
    references: [activitiesTable.id]
  }),
  group: one(groupsTable, {
    fields: [documentsTable.group_id],
    references: [groupsTable.id]
  }),
  uploader: one(usersTable, {
    fields: [documentsTable.uploaded_by],
    references: [usersTable.id]
  })
}));

export const supervisionReportsRelations = relations(supervisionReportsTable, ({ one }) => ({
  supervisor: one(usersTable, {
    fields: [supervisionReportsTable.supervisor_id],
    references: [usersTable.id]
  }),
  school: one(schoolsTable, {
    fields: [supervisionReportsTable.school_id],
    references: [schoolsTable.id]
  })
}));

export const schoolSupervisionRelations = relations(schoolSupervisionTable, ({ one }) => ({
  supervisor: one(usersTable, {
    fields: [schoolSupervisionTable.supervisor_id],
    references: [usersTable.id]
  }),
  school: one(schoolsTable, {
    fields: [schoolSupervisionTable.school_id],
    references: [schoolsTable.id]
  })
}));

export const announcementsRelations = relations(announcementsTable, ({ one }) => ({
  creator: one(usersTable, {
    fields: [announcementsTable.created_by],
    references: [usersTable.id]
  })
}));

// Export all tables for proper query building
export const tables = {
  regions: regionsTable,
  schools: schoolsTable,
  subjects: subjectsTable,
  academicYears: academicYearsTable,
  users: usersTable,
  groups: groupsTable,
  groupMembers: groupMembersTable,
  activities: activitiesTable,
  attendance: attendanceTable,
  documents: documentsTable,
  supervisionReports: supervisionReportsTable,
  schoolSupervision: schoolSupervisionTable,
  announcements: announcementsTable
};
