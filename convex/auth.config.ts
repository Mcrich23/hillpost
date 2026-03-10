const clerkJwtIssuerDomain = process.env.CLERK_JWT_ISSUER_DOMAIN;

if (!clerkJwtIssuerDomain) {
  throw new Error(
    "Missing environment variable CLERK_JWT_ISSUER_DOMAIN required for auth configuration."
  );
}

export default {
  providers: [
    {
      domain: clerkJwtIssuerDomain,
    },
  ],
};
