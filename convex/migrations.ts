import { internalMutation } from "./_generated/server";

export const removeBackgroundImageUrl = internalMutation({
  args: {},
  handler: async (ctx) => {
    const hackathons = await ctx.db.query("hackathons").collect();
    for (const h of hackathons) {
      if ((h as any).backgroundImageUrl !== undefined) {
        const { backgroundImageUrl, ...rest } = h as any;
        await ctx.db.replace(h._id, rest);
      }
    }
  },
});
