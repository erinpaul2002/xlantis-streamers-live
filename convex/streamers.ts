import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

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

const streamerInput = v.object({
  id: v.string(),
  displayName: v.string(),
  group: v.union(v.literal("TVA"), v.literal("KVA"), v.literal("Admins"), v.literal("Others")),
  isActive: v.boolean(),
  kick: v.optional(kickAccount),
  youtube: v.optional(youtubeAccount),
});

function compareByName(a: { displayName: string }, b: { displayName: string }) {
  return a.displayName.localeCompare(b.displayName);
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const streamers = await ctx.db.query("streamers").collect();

    return streamers.sort(compareByName);
  },
});

export const replaceAll = mutation({
  args: {
    streamers: v.array(streamerInput),
  },
  handler: async (ctx, args) => {
    for (const streamer of args.streamers) {
      if (!streamer.kick && !streamer.youtube) {
        throw new Error(`Streamer ${streamer.id} must include at least one platform account.`);
      }
    }

    const existing = await ctx.db.query("streamers").collect();

    for (const streamer of existing) {
      await ctx.db.delete(streamer._id);
    }

    const now = Date.now();

    for (const streamer of args.streamers) {
      await ctx.db.insert("streamers", {
        ...streamer,
        createdAt: now,
        updatedAt: now,
      });
    }

    return {
      deleted: existing.length,
      inserted: args.streamers.length,
    };
  },
});

export const listActive = query({
  args: {},
  handler: async (ctx) => {
    const streamers = await ctx.db
      .query("streamers")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    return streamers.sort(compareByName);
  },
});

export const create = mutation({
  args: {
    streamer: streamerInput,
  },
  handler: async (ctx, args) => {
    if (!args.streamer.kick && !args.streamer.youtube) {
      throw new Error("A streamer must include at least one platform account.");
    }

    const now = Date.now();
    const id = await ctx.db.insert("streamers", {
      ...args.streamer,
      createdAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(id);
  },
});

export const update = mutation({
  args: {
    databaseId: v.string(),
    streamer: streamerInput,
  },
  handler: async (ctx, args) => {
    if (!args.streamer.kick && !args.streamer.youtube) {
      throw new Error("A streamer must include at least one platform account.");
    }

    const streamerId = ctx.db.normalizeId("streamers", args.databaseId);

    if (!streamerId) {
      throw new Error("Streamer record not found.");
    }

    const current = await ctx.db.get(streamerId);

    if (!current) {
      throw new Error("Streamer record not found.");
    }

    await ctx.db.replace(streamerId, {
      ...args.streamer,
      createdAt: current.createdAt,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(streamerId);
  },
});

export const deleteById = mutation({
  args: {
    databaseId: v.string(),
  },
  handler: async (ctx, args) => {
    const streamerId = ctx.db.normalizeId("streamers", args.databaseId);

    if (!streamerId) {
      throw new Error("Streamer record not found.");
    }

    const current = await ctx.db.get(streamerId);

    if (!current) {
      throw new Error("Streamer record not found.");
    }

    await ctx.db.delete(streamerId);

    return {
      deleted: true,
      streamer: current,
    };
  },
});
