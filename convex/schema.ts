import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const streamerGroup = v.union(v.literal("TVA"), v.literal("KVA"), v.literal("Admins"), v.literal("Others"));
const requestStatus = v.union(v.literal("pending"), v.literal("reviewed"), v.literal("approved"), v.literal("rejected"));
const kickAccount = v.object({
  slug: v.string(),
  avatarUrl: v.optional(v.string()),
  fallbackThumbnailUrl: v.optional(v.string()),
  profileUrl: v.optional(v.string()),
});
const youtubeAccount = v.object({
  channelId: v.optional(v.string()),
  handle: v.optional(v.string()),
  avatarUrl: v.optional(v.string()),
  fallbackThumbnailUrl: v.optional(v.string()),
  profileUrl: v.optional(v.string()),
});

export default defineSchema({
  streamers: defineTable({
    id: v.string(),
    displayName: v.string(),
    group: streamerGroup,
    kick: v.optional(kickAccount),
    youtube: v.optional(youtubeAccount),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_streamer_id", ["id"])
    .index("by_active", ["isActive"])
    .index("by_group", ["group"]),

  streamerRequests: defineTable({
    streamerName: v.string(),
    kickUrl: v.optional(v.string()),
    youtubeUrl: v.optional(v.string()),
    status: requestStatus,
    createdAt: v.number(),
  })
    .index("by_created_at", ["createdAt"])
    .index("by_status", ["status"]),
});
