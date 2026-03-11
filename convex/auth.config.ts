const clerkDomain = process.env.CLERK_JWT_ISSUER_DOMAIN;

if (!clerkDomain) {
  throw new Error(
    "Environment variable CLERK_JWT_ISSUER_DOMAIN is required for Convex auth configuration."
  );
}

export default {
  providers: [
    {
      domain: clerkDomain,
      applicationID: "convex",
    },
  ],
} as const;
