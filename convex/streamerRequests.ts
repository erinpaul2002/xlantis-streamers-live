import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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

export const create = mutation({
  args: {
    streamerName: v.string(),
    kickUrl: v.optional(v.string()),
    youtubeUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("streamerRequests", {
      streamerName: args.streamerName,
      kickUrl: args.kickUrl,
      youtubeUrl: args.youtubeUrl,
      status: "pending",
      createdAt: Date.now(),
    });

    return await ctx.db.get(id);
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("streamerRequests").withIndex("by_created_at").order("desc").collect();
  },
});

export const deleteById = mutation({
  args: {
    requestId: v.string(),
  },
  handler: async (ctx, args) => {
    const requestId = ctx.db.normalizeId("streamerRequests", args.requestId);

    if (!requestId) {
      throw new Error("Streamer request not found.");
    }

    await ctx.db.delete(requestId);

    return { deleted: true };
  },
});

export const approveAndDelete = mutation({
  args: {
    requestId: v.string(),
    relatedRequestIds: v.optional(v.array(v.string())),
    streamer: streamerInput,
    targetDatabaseId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const requestId = ctx.db.normalizeId("streamerRequests", args.requestId);

    if (!requestId) {
      throw new Error("Streamer request not found.");
    }

    const request = await ctx.db.get(requestId);

    if (!request) {
      throw new Error("Streamer request not found.");
    }

    const now = Date.now();
    let savedStreamerId;

    if (args.targetDatabaseId) {
      const targetStreamerId = ctx.db.normalizeId("streamers", args.targetDatabaseId);

      if (!targetStreamerId) {
        throw new Error("Target streamer not found.");
      }

      const current = await ctx.db.get(targetStreamerId);

      if (!current) {
        throw new Error("Target streamer not found.");
      }

      await ctx.db.replace(targetStreamerId, {
        ...args.streamer,
        createdAt: current.createdAt,
        updatedAt: now,
      });

      savedStreamerId = targetStreamerId;
    } else {
      savedStreamerId = await ctx.db.insert("streamers", {
        ...args.streamer,
        createdAt: now,
        updatedAt: now,
      });
    }

    const requestIdsToDelete = Array.from(new Set([args.requestId, ...(args.relatedRequestIds ?? [])]));
    const deletedRequestIds: string[] = [];

    for (const rawRequestId of requestIdsToDelete) {
      const normalizedRequestId = ctx.db.normalizeId("streamerRequests", rawRequestId);

      if (!normalizedRequestId) {
        continue;
      }

      const existingRequest = await ctx.db.get(normalizedRequestId);

      if (!existingRequest) {
        continue;
      }

      await ctx.db.delete(normalizedRequestId);
      deletedRequestIds.push(rawRequestId);
    }

    return {
      deletedRequestIds,
      streamer: await ctx.db.get(savedStreamerId),
      request,
    };
  },
});
