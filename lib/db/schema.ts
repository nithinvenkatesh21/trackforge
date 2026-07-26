import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  real,
  jsonb,
  pgEnum,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Postgres Enums
// ---------------------------------------------------------------------------

export const userRoleEnum = pgEnum("user_role", ["admin", "user", "member"]);

export const creatorRoleEnum = pgEnum("creator_role", [
  "artist",
  "producer",
  "mixer",
  "engineer",
]);

export const projectRoleEnum = pgEnum("project_role", [
  "owner",
  "producer",
  "engineer",
  "mixer",
  "artist",
  "viewer",
]);

export const projectVisibilityEnum = pgEnum("project_visibility", [
  "public",
  "private",
]);

export const projectStatusEnum = pgEnum("project_status", [
  "open",
  "in_progress",
  "final",
]);

export const issueStatusEnum = pgEnum("issue_status", [
  "open",
  "in_progress",
  "resolved",
  "closed",
]);

export const collabRequestStatusEnum = pgEnum("collab_request_status", [
  "pending",
  "accepted",
  "rejected",
]);

export const marketplaceAssetTypeEnum = pgEnum("marketplace_asset_type", [
  "loop",
  "acapella",
  "drumkit",
  "preset",
  "midi_pack",
  "sound_fx",
  "bundle",
]);

export const creditTransactionTypeEnum = pgEnum("credit_transaction_type", [
  "earned",
  "spent",
  "refund",
]);

export const serviceRequestTypeEnum = pgEnum("service_request_type", [
  "mix",
  "master",
  "vocal_feature",
  "instrumental_addon",
]);

export const serviceRequestStatusEnum = pgEnum("service_request_status", [
  "open",
  "in_progress",
  "completed",
  "cancelled",
]);

export const serviceApplicationStatusEnum = pgEnum("service_application_status", [
  "pending",
  "accepted",
  "rejected",
  "completed",
]);

export const milestoneStatusEnum = pgEnum("milestone_status", [
  "pending",
  "released",
  "completed",
]);

export const fileTypeEnum = pgEnum("file_type", [
  "project",
  "audio",
  "midi",
  "preset",
  "other",
]);

// ---------------------------------------------------------------------------
// 1. Users
// ---------------------------------------------------------------------------
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkId: text("clerk_id").notNull().unique(),
    email: text("email").notNull(),
    name: text("name"),
    imageUrl: text("image_url"),
    emailVerifiedAt: timestamp("email_verified_at"),
    isAnonymous: boolean("is_anonymous").default(false).notNull(),
    role: userRoleEnum("role").default("user").notNull(),
    bio: text("bio"),
    creatorRoles: text("creator_roles").array(),
    genres: text("genres").array(),
    daw: text("daw"),
    lookingFor: text("looking_for").array(),
    socialLinks: jsonb("social_links"),
    rating: real("rating").default(0).notNull(),
    totalRatings: integer("total_ratings").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("users_clerk_id_idx").on(table.clerkId),
    index("users_email_idx").on(table.email),
  ]
);

// ---------------------------------------------------------------------------
// 2. Notifications
// ---------------------------------------------------------------------------
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    projectId: uuid("project_id"),
    versionId: uuid("version_id"),
    commentId: uuid("comment_id"),
    issueId: uuid("issue_id"),
    fromUserId: uuid("from_user_id"),
    read: boolean("read").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("notifications_user_id_idx").on(table.userId),
    index("notifications_user_read_idx").on(table.userId, table.read),
  ]
);

// ---------------------------------------------------------------------------
// 3. Projects
// ---------------------------------------------------------------------------
export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    description: text("description"),
    genre: text("genre"),
    bpm: integer("bpm"),
    key: text("key"),
    creatorId: uuid("creator_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    visibility: projectVisibilityEnum("visibility")
      .default("public")
      .notNull(),
    status: projectStatusEnum("status").default("open").notNull(),
    neededRoles: text("needed_roles").array(),
    coverArtKey: text("cover_art_key"),
    defaultCoverIndex: integer("default_cover_index").default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("projects_creator_id_idx").on(table.creatorId),
    index("projects_status_idx").on(table.status),
    index("projects_visibility_idx").on(table.visibility),
    index("projects_genre_idx").on(table.genre),
  ]
);

// ---------------------------------------------------------------------------
// 4. Versions
// ---------------------------------------------------------------------------
export const versions = pgTable(
  "versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    parentVersionId: uuid("parent_version_id"),
    fileKey: text("file_key"),
    fileName: text("file_name").notNull(),
    fileSize: integer("file_size"),
    uploaderId: uuid("uploader_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    notes: text("notes"),
    versionNumber: integer("version_number").notNull(),
    isBundle: boolean("is_bundle").default(false).notNull(),
    isPinnedRelease: boolean("is_pinned_release").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("versions_project_id_idx").on(table.projectId),
    index("versions_uploader_id_idx").on(table.uploaderId),
    index("versions_parent_version_id_idx").on(table.parentVersionId),
  ]
);

// ---------------------------------------------------------------------------
// 5. Version Waveforms
// ---------------------------------------------------------------------------
export const versionWaveforms = pgTable(
  "version_waveforms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    versionId: uuid("version_id")
      .notNull()
      .unique()
      .references(() => versions.id, { onDelete: "cascade" }),
    peaks: jsonb("peaks").notNull(), // number[]
    durationSeconds: real("duration_seconds").notNull(),
    sampleRate: integer("sample_rate").default(44100).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("version_waveforms_version_id_idx").on(table.versionId)]
);

// ---------------------------------------------------------------------------
// 6. Project Files
// ---------------------------------------------------------------------------
export const projectFiles = pgTable(
  "project_files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    versionId: uuid("version_id")
      .notNull()
      .references(() => versions.id, { onDelete: "cascade" }),
    fileName: text("file_name").notNull(),
    filePath: text("file_path").notNull(),
    fileType: fileTypeEnum("file_type").default("other").notNull(),
    fileKey: text("file_key"),
    fileSize: integer("file_size"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("project_files_version_id_idx").on(table.versionId)]
);

// ---------------------------------------------------------------------------
// 7. Comments
// ---------------------------------------------------------------------------
export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    versionId: uuid("version_id")
      .notNull()
      .references(() => versions.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    parentCommentId: uuid("parent_comment_id"),
    timestampSeconds: real("timestamp_seconds"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("comments_version_id_idx").on(table.versionId),
    index("comments_project_id_idx").on(table.projectId),
    index("comments_author_id_idx").on(table.authorId),
  ]
);

// ---------------------------------------------------------------------------
// 8. Collab Requests
// ---------------------------------------------------------------------------
export const collabRequests = pgTable(
  "collab_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    fromUserId: uuid("from_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    toUserId: uuid("to_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    creatorRole: creatorRoleEnum("creator_role").notNull(),
    message: text("message"),
    status: collabRequestStatusEnum("status").default("pending").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("collab_requests_project_id_idx").on(table.projectId),
    index("collab_requests_from_user_id_idx").on(table.fromUserId),
    index("collab_requests_to_user_id_idx").on(table.toUserId),
    index("collab_requests_status_idx").on(table.status),
  ]
);

// ---------------------------------------------------------------------------
// 9. Ratings
// ---------------------------------------------------------------------------
export const ratings = pgTable(
  "ratings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fromUserId: uuid("from_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    toUserId: uuid("to_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "cascade",
    }),
    serviceRequestId: uuid("service_request_id"),
    stars: integer("stars").notNull(),
    comment: text("comment"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("ratings_from_user_id_idx").on(table.fromUserId),
    index("ratings_to_user_id_idx").on(table.toUserId),
    index("ratings_project_id_idx").on(table.projectId),
  ]
);

// ---------------------------------------------------------------------------
// 10. Messages
// ---------------------------------------------------------------------------
export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("messages_project_id_idx").on(table.projectId),
    index("messages_sender_id_idx").on(table.senderId),
  ]
);

// ---------------------------------------------------------------------------
// 11. Service Requests
// ---------------------------------------------------------------------------
export const serviceRequests = pgTable(
  "service_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    creatorId: uuid("creator_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: serviceRequestTypeEnum("type").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    budgetMin: integer("budget_min").notNull(),
    budgetMax: integer("budget_max").notNull(),
    deadline: timestamp("deadline"),
    status: serviceRequestStatusEnum("status").default("open").notNull(),
    acceptedApplicationId: uuid("accepted_application_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("service_requests_project_id_idx").on(table.projectId),
    index("service_requests_creator_id_idx").on(table.creatorId),
    index("service_requests_status_idx").on(table.status),
  ]
);

// ---------------------------------------------------------------------------
// 12. Service Applications
// ---------------------------------------------------------------------------
export const serviceApplications = pgTable(
  "service_applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => serviceRequests.id, { onDelete: "cascade" }),
    applicantId: uuid("applicant_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    proposal: text("proposal").notNull(),
    proposedPrice: integer("proposed_price").notNull(),
    status: serviceApplicationStatusEnum("status")
      .default("pending")
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("service_applications_request_id_idx").on(table.requestId),
    index("service_applications_applicant_id_idx").on(table.applicantId),
    index("service_applications_status_idx").on(table.status),
  ]
);

// ---------------------------------------------------------------------------
// 13. Milestones
// ---------------------------------------------------------------------------
export const milestones = pgTable(
  "milestones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => serviceRequests.id, { onDelete: "cascade" }),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => serviceApplications.id, { onDelete: "cascade" }),
    applicantId: uuid("applicant_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(),
    status: milestoneStatusEnum("status").default("pending").notNull(),
    releaseDate: timestamp("release_date"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("milestones_request_id_idx").on(table.requestId),
    index("milestones_application_id_idx").on(table.applicationId),
    index("milestones_applicant_id_idx").on(table.applicantId),
  ]
);

// ---------------------------------------------------------------------------
// 14. User Credits
// ---------------------------------------------------------------------------
export const userCredits = pgTable(
  "user_credits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    balance: integer("balance").default(0).notNull(),
    totalEarned: integer("total_earned").default(0).notNull(),
    totalSpent: integer("total_spent").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("user_credits_user_id_idx").on(table.userId)]
);

// ---------------------------------------------------------------------------
// 15. Credit Transactions
// ---------------------------------------------------------------------------
export const creditTransactions = pgTable(
  "credit_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(),
    type: creditTransactionTypeEnum("type").notNull(),
    relatedId: uuid("related_id"),
    description: text("description").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("credit_transactions_user_id_idx").on(table.userId)]
);

// ---------------------------------------------------------------------------
// 16. Issues
// ---------------------------------------------------------------------------
export const issues = pgTable(
  "issues",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    creatorId: uuid("creator_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    status: issueStatusEnum("status").default("open").notNull(),
    tags: text("tags").array(),
    versionId: uuid("version_id").references(() => versions.id, {
      onDelete: "set null",
    }),
    timestampSeconds: real("timestamp_seconds"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("issues_project_id_idx").on(table.projectId),
    index("issues_creator_id_idx").on(table.creatorId),
    index("issues_status_idx").on(table.status),
  ]
);

// ---------------------------------------------------------------------------
// 17. Issue Replies
// ---------------------------------------------------------------------------
export const issueReplies = pgTable(
  "issue_replies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    issueId: uuid("issue_id")
      .notNull()
      .references(() => issues.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    parentReplyId: uuid("parent_reply_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("issue_replies_issue_id_idx").on(table.issueId),
    index("issue_replies_author_id_idx").on(table.authorId),
  ]
);

// ---------------------------------------------------------------------------
// 18. Project Collaborators
// ---------------------------------------------------------------------------
export const projectCollaborators = pgTable(
  "project_collaborators",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("project_collaborators_proj_user_idx").on(
      table.projectId,
      table.userId
    ),
  ]
);

// ---------------------------------------------------------------------------
// 19. Project Collaborator Roles
// ---------------------------------------------------------------------------
export const projectCollaboratorRoles = pgTable(
  "project_collaborator_roles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: projectRoleEnum("role").default("viewer").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("project_collaborator_roles_proj_user_idx").on(
      table.projectId,
      table.userId
    ),
  ]
);

// ---------------------------------------------------------------------------
// 20. Marketplace Assets
// ---------------------------------------------------------------------------
export const marketplaceAssets = pgTable(
  "marketplace_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    creatorId: uuid("creator_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    type: marketplaceAssetTypeEnum("type").notNull(),
    genre: text("genre"),
    bpm: integer("bpm"),
    key: text("key"),
    price: integer("price").notNull(),
    licenseType: text("license_type").notNull(),
    fileKey: text("file_key").notNull(),
    previewKey: text("preview_key"),
    coverImageKey: text("cover_image_key"),
    tags: text("tags").array(),
    downloads: integer("downloads").default(0).notNull(),
    rating: real("rating").default(0).notNull(),
    reviewCount: integer("review_count").default(0).notNull(),
    featured: boolean("featured").default(false).notNull(),
    searchVector: text("search_vector"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("marketplace_assets_creator_id_idx").on(table.creatorId),
    index("marketplace_assets_type_idx").on(table.type),
    index("marketplace_assets_genre_idx").on(table.genre),
    index("marketplace_assets_featured_idx").on(table.featured),
  ]
);

// ---------------------------------------------------------------------------
// 21. Marketplace Purchases
// ---------------------------------------------------------------------------
export const marketplacePurchases = pgTable(
  "marketplace_purchases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => marketplaceAssets.id, { onDelete: "cascade" }),
    price: integer("price").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("marketplace_purchases_user_asset_idx").on(
      table.userId,
      table.assetId
    ),
  ]
);

// ---------------------------------------------------------------------------
// 22. Marketplace Reviews
// ---------------------------------------------------------------------------
export const marketplaceReviews = pgTable(
  "marketplace_reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reviewerId: uuid("reviewer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => marketplaceAssets.id, { onDelete: "cascade" }),
    stars: integer("stars").notNull(),
    comment: text("comment"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("marketplace_reviews_reviewer_asset_idx").on(
      table.reviewerId,
      table.assetId
    ),
  ]
);

// ---------------------------------------------------------------------------
// 23. Marketplace Collections
// ---------------------------------------------------------------------------
export const marketplaceCollections = pgTable(
  "marketplace_collections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    assetIds: uuid("asset_ids").array().notNull(),
    isPublic: boolean("is_public").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("marketplace_collections_user_id_idx").on(table.userId)]
);

// ---------------------------------------------------------------------------
// 24. Audio Playbacks
// ---------------------------------------------------------------------------
export const audioPlaybacks = pgTable(
  "audio_playbacks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    versionId: uuid("version_id")
      .notNull()
      .references(() => versions.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    timestampSeconds: real("timestamp_seconds"),
    durationSeconds: real("duration_seconds"),
    completed: boolean("completed").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("audio_playbacks_version_id_idx").on(table.versionId),
    index("audio_playbacks_user_id_idx").on(table.userId),
    index("audio_playbacks_version_user_idx").on(
      table.versionId,
      table.userId
    ),
  ]
);

// ---------------------------------------------------------------------------
// Relations definitions
// ---------------------------------------------------------------------------

export const usersRelations = relations(users, ({ many, one }) => ({
  projects: many(projects),
  versions: many(versions),
  comments: many(comments),
  collaborations: many(projectCollaborators),
  credits: one(userCredits, {
    fields: [users.id],
    references: [userCredits.userId],
  }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  creator: one(users, {
    fields: [projects.creatorId],
    references: [users.id],
  }),
  versions: many(versions),
  collaborators: many(projectCollaborators),
  collaboratorRoles: many(projectCollaboratorRoles),
  comments: many(comments),
  issues: many(issues),
  messages: many(messages),
}));

export const versionsRelations = relations(versions, ({ one, many }) => ({
  project: one(projects, {
    fields: [versions.projectId],
    references: [projects.id],
  }),
  uploader: one(users, {
    fields: [versions.uploaderId],
    references: [users.id],
  }),
  parentVersion: one(versions, {
    fields: [versions.parentVersionId],
    references: [versions.id],
    relationName: "version_parent",
  }),
  childVersions: many(versions, { relationName: "version_parent" }),
  files: many(projectFiles),
  waveform: one(versionWaveforms, {
    fields: [versions.id],
    references: [versionWaveforms.versionId],
  }),
  comments: many(comments),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  version: one(versions, {
    fields: [comments.versionId],
    references: [versions.id],
  }),
  project: one(projects, {
    fields: [comments.projectId],
    references: [projects.id],
  }),
  author: one(users, {
    fields: [comments.authorId],
    references: [users.id],
  }),
}));

export const projectCollaboratorsRelations = relations(
  projectCollaborators,
  ({ one }) => ({
    project: one(projects, {
      fields: [projectCollaborators.projectId],
      references: [projects.id],
    }),
    user: one(users, {
      fields: [projectCollaborators.userId],
      references: [users.id],
    }),
  })
);

export const projectCollaboratorRolesRelations = relations(
  projectCollaboratorRoles,
  ({ one }) => ({
    project: one(projects, {
      fields: [projectCollaboratorRoles.projectId],
      references: [projects.id],
    }),
    user: one(users, {
      fields: [projectCollaboratorRoles.userId],
      references: [users.id],
    }),
  })
);

export const marketplaceAssetsRelations = relations(
  marketplaceAssets,
  ({ one, many }) => ({
    creator: one(users, {
      fields: [marketplaceAssets.creatorId],
      references: [users.id],
    }),
    purchases: many(marketplacePurchases),
    reviews: many(marketplaceReviews),
  })
);

export const serviceRequestsRelations = relations(
  serviceRequests,
  ({ one, many }) => ({
    creator: one(users, {
      fields: [serviceRequests.creatorId],
      references: [users.id],
    }),
    project: one(projects, {
      fields: [serviceRequests.projectId],
      references: [projects.id],
    }),
    applications: many(serviceApplications),
    milestones: many(milestones),
  })
);
