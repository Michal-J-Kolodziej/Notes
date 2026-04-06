const clerkJwtIssuerDomain = (
  process.env.CLERK_JWT_ISSUER_DOMAIN ??
  process.env.VITE_CLERK_JWT_ISSUER_DOMAIN
)?.trim()

export default {
  providers: clerkJwtIssuerDomain
    ? [
        {
          applicationID: 'convex',
          domain: clerkJwtIssuerDomain,
        },
      ]
    : [],
}
