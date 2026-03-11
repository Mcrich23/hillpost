const clerkDomain = process.env.CLERK_JWT_ISSUER_DOMAIN;

if (!clerkDomain) {
  console.error(
    "[auth.config] CLERK_JWT_ISSUER_DOMAIN is not set. " +
      "Add it in the Convex dashboard → Settings → Environment Variables " +
      "(e.g. https://<your-clerk-instance>.clerk.accounts.dev). " +
      "Convex auth will not work until this is configured."
  );
}

export default {
  providers: clerkDomain
    ? [{ domain: clerkDomain, applicationID: "convex" }]
    : [],
} as const;
