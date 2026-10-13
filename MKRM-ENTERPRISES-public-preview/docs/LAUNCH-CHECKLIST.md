# Production launch checklist

This package is intended for local testing. Before making it publicly accessible:

- [ ] Replace local JSON persistence with PostgreSQL/Supabase and configure backups, retention, indexes and authorization policies.
- [ ] Replace the single administrator credential with named accounts, role-based permissions, password reset and account recovery.
- [ ] Store uploaded files in private managed object storage with short-lived authorized access.
- [ ] Configure transactional email and verify actual provider acceptance before showing any sent state.
- [ ] Add CAPTCHA/bot protection and production-grade edge rate limiting.
- [ ] Deploy behind HTTPS and configure secure cookies, environment secrets and monitoring.
- [ ] Review legal pages with a qualified professional.
- [ ] Verify product grades, standards, images, business details, registrations and commercial terms.
- [ ] Test public forms, private routes, file handling, backups and access controls on the production domain.
