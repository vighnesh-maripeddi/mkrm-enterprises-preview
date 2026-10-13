# MKRM ENTERPRISES — Implementation & Handover Status

**Package version:** 1.0 local-host starter  
**Purpose:** a functional, enquiry-led industrial metals sourcing platform for local testing and as a production handover base.

---

## 1. What is included in this package

This ZIP contains all authored application code, styles, local image assets, configuration examples and handover documents required to run the current local version.

| Path | Purpose |
|---|---|
| `server.mjs` | Node.js HTTP server, API routes, local persistence, admin sessions and security controls |
| `package.json` | Run scripts (`npm run dev`, `npm start`) |
| `public/index.html` | HTML document, initial metadata and client entry point |
| `public/app.js` | Full public website, RFQ/supplier forms, client routing and admin UI |
| `public/styles.css` | Responsive design system and layouts |
| `public/images/` | Six locally generated industrial metal images used by the current catalogue |
| `.env.example` | Example environment variable names only—no actual credentials |
| `README.md` | Local run instructions and production hand-off note |
| `docs/LAUNCH-CHECKLIST.md` | Required steps before an internet-facing commercial launch |

### Intentionally not included
- Administrator password, session secret, database credentials, email keys or other secrets.
- Test enquiries, buyer details, supplier offers, uploaded documents or quotation records.
- `node_modules` (there are no external runtime dependencies in this implementation).
- A production database or Supabase project configuration.

When the server starts for the first time, it creates `data/db.json` and `data/uploads/` locally. Those runtime folders are excluded from the delivery package so the package starts clean.

---

## 2. Frontend completed

### Visual system and responsive experience
- Premium navy (`#101F33`) and copper (`#B66A3C`) design system.
- Responsive desktop, tablet and mobile layouts.
- Sticky header, accessible mobile menu, primary Request a Quote CTA and structured footer.
- Semantic HTML, labelled fields, visible focus styles, keyboard-friendly controls and responsive tables.
- Six local industrial material images. Product/category image paths are editable in the administrator area.

### Public pages completed
- Home
- Metals Catalogue
- Individual Product Detail pages
- How We Work
- Industries We Serve
- Quality & Documentation
- International Trade
- About Us
- Contact
- Request a Quote
- Supplier / Supply Materials
- Frequently Asked Questions
- Privacy Policy draft
- Terms of Use draft
- Enquiry & Quotation Disclaimer draft
- Custom not-found state

### Catalogue completed
- Six editable public categories: Copper Products, Copper Scrap, Aluminium Products, Aluminium Scrap, Steel and Other Metals.
- Fourteen seeded, editable product enquiry entries.
- Public keyword search and meaningful family, type and form filters.
- Product cards, breadcrumbs, detail pages, related products and product-specific RFQ preselection.
- Public wording clearly distinguishes enquiry categories from stock/availability claims.
- Price shown only as **Price on Request** with a correct non-binding qualification.

### Buyer RFQ interface completed
- Five-step buyer enquiry flow.
- Multiple material line items with quantity and unit fields.
- Technical fields: grade, standard, composition, dimensions, condition, packaging, inspection, documentation and notes.
- Conditional scrap-specific contamination / condition field.
- Delivery/commercial fields: country, state, city, destination, transaction type, currency, Incoterm, target price and handling requirements.
- Buyer details, pre-submission review, validation, loading states and confirmation page.
- Unique enquiry reference returned after a successful save.
- Optional client-side selection/upload of PDF/JPG/PNG/WEBP support files.

### Supplier interface completed
- Separate supplier-material submission page and workflow.
- Fields for business, contact, material, quantity, specification, price preference, loading, readiness, recurring availability, registration details, attachments and comments.
- Clear non-approval/non-purchase disclaimer.
- Supplier records are stored separately from buyer RFQs.

### Contact and marketing features completed
- Uses the supplied MKRM email and business phone numbers.
- Mobile phone/email links.
- WhatsApp message link with the approved prefilled message.
- No fictional street address, GSTIN, warehouse, client, certification, stock, price or outcome claims.

### SEO foundations completed
- Dynamic page title, description and canonical element.
- Search-friendly direct URL handling for major public pages.
- Generated `robots.txt` and `sitemap.xml` routes.
- Descriptive image alt text and lazy loaded catalogue images.

---

## 3. Backend completed

The current backend is a **custom Node.js server** implemented in `server.mjs`. It is deliberately dependency-free so the project runs after extraction without a package-install step.

### Public API workflows implemented
- `GET /api/public/bootstrap` — returns safe public company settings, categories and active products.
- `POST /api/rfqs` — validates and stores buyer RFQs; returns a generated `RFQ-YYYYMMDD-XXXXXX` reference.
- `POST /api/supplier-enquiries` — validates and stores supplier submissions separately; returns a `SUP-...` reference.
- `POST /api/upload` — validates permitted attachment MIME types and a 5 MB size limit; stores local files with randomised server file names.
- `GET /robots.txt` and `GET /sitemap.xml` — generated discovery routes.

### Admin backend completed
- `POST /api/admin/login` — server-side administrator credential verification.
- `POST /api/admin/logout` and `GET /api/admin/session`.
- `GET /api/admin/overview` — real counts from stored records; no fake statistics.
- Edit public site settings.
- Create/edit categories.
- Create/edit/hide/feature products.
- View and update buyer RFQ status, priority and follow-up date.
- Add private RFQ notes and status history.
- Review/update supplier-enquiry status.
- Save confidential supplier quotes for comparison.
- Create buyer quotation drafts, update draft/sent/accepted/expired/cancelled state and use browser Print / Save PDF.
- Private administrator-only attachment download route.

### Current local data model
The local runtime file is created automatically at `data/db.json` and includes:
- Settings
- Categories
- Products
- Buyer RFQs and RFQ items
- Supplier enquiries
- Supplier quotations
- Buyer quotation drafts
- Private notes
- Status history
- Audit log

### Current security controls implemented
- Admin credentials passed only through environment variables, not bundled into browser JavaScript.
- Server-side HTTP-only, SameSite session cookie.
- Signed server session token.
- CSRF token required on private write endpoints.
- Private routes return `401` without an authorised session.
- Input trimming / sanitisation and strict field limits.
- Basic per-IP rate limits for logins, submissions and file uploads.
- Upload allow-list: PDF, JPG, PNG, WEBP; 5 MB maximum per file.
- Randomised uploaded file name and private admin-only retrieval endpoint.
- Content Security Policy, anti-framing, nosniff, referrer and permissions headers.
- Public and private fields are separated at API level.

---

## 4. Admin features completed

Open locally at: `http://localhost:4173/#/admin`

| Area | Completed capability |
|---|---|
| Overview | Real RFQ, sourcing, supplier, quotation, order and follow-up counts from stored records |
| Buyer enquiries | Review RFQs, read detail, access private attachment, change status/priority/follow-up, add private notes |
| Supplier enquiries | Review supplier submissions and update review status |
| Quotations | Add confidential supplier quote rows, compare terms, prepare buyer quotation drafts, update status, print/save PDF |
| Catalogue | Add/edit/hide categories and products; set category/product images, descriptions, public visibility and featured status |
| Site settings | Edit company name, logo URL, email, phones, WhatsApp, city, address, working hours, social URLs, homepage copy and About copy |

---

## 5. What remains before a real public production launch

These are deliberate production requirements, not cosmetic extras. The current local server is correct for local testing, but it must not be used as the final public system for sensitive commercial data.

### Required backend migration
1. **PostgreSQL / Supabase migration**
   - Replace `data/db.json` with a managed relational database.
   - Create tables for the current entities: products, categories, RFQs, RFQ items, supplier enquiries, supplier quotes, buyer quotations, notes, status history, audit records and settings.
   - Add indexes, foreign keys, timestamps and monetary decimal columns.
2. **Supabase Authentication or equivalent**
   - Replace single environment-password admin access with named admin users, roles and password-reset controls.
   - Add row-level security policies and server-side role verification.
3. **Private managed file storage**
   - Replace local `data/uploads/` with a private storage bucket.
   - Use short-lived signed attachment URLs only for authorised administrators.
4. **Transactional email**
   - Configure Resend, Postmark, SendGrid or an approved provider.
   - Send customer acknowledgements and internal notices only after successful provider acceptance.
   - Implement quotation email delivery only after an administrator reviews and approves the message.
5. **Production rate limiting and spam protection**
   - Add CAPTCHA/bot scoring and edge/reverse-proxy rate limits.
   - Consider email verification and duplicate-detection rules.
6. **Backups, retention and privacy operations**
   - Automated database/storage backups.
   - Data retention schedule.
   - Export, correction and deletion workflow for legitimate privacy requests.
   - Error monitoring and audit-log retention.

### Required commercial/operational configuration
1. Verify/update every product description, grade/standard reference and image before publishing.
2. Upload approved logo and product images through the editable admin paths / eventual managed storage flow.
3. Add only legally verified public address, GSTIN, IEC, working hours and business identifiers—if and when approved for publication.
4. Have Privacy Policy, Terms and Disclaimer independently reviewed by a qualified professional before launch.
5. Add authorised quotation templates, payment terms, tax treatment and conditions.
6. Set internal status ownership, follow-up rules and supplier verification process.
7. Change the initial administrator password to a long unique password before hosting.

### Required hosting/deployment work
1. Create a production Supabase project.
2. Add production environment variables in Vercel, never in source files:
   - `ADMIN_EMAIL` / replacement production auth settings
   - `ADMIN_PASSWORD` / replacement production auth settings
   - `SESSION_SECRET`
   - Supabase URL, anon key and server-only service credentials after migration
   - Email service provider credentials after setup
3. Deploy to Vercel / Render / Railway / VPS using a serverless API or Node hosting plan appropriate for the migrated architecture.
4. Turn on HTTPS and secure cookie settings.
5. Test all workflows with production-domain URLs.
6. Optionally connect a custom domain after the temporary hosting URL works.

---

## 6. Important limitations of the current local starter

- It is **not yet a Supabase/PostgreSQL implementation**. Records persist in a local JSON file only.
- Local files are not suitable for a serverless production host such as Vercel because runtime files may be temporary.
- Email is intentionally not configured and the UI does not falsely report that an email was sent.
- The Print / Save PDF button uses the browser print flow; server-side branded PDF generation remains to be added after production quotation layouts are approved.
- No buyer accounts, supplier portal, live inventory, accounting integration, CRM integration, logistics integration, payment capture or automated market pricing is included. Those were intentionally left as future phases to avoid unreliable early functionality.
- No public domain is connected in this package.

---

## 7. Local testing instructions

### Requirements
- Node.js 20 or newer

### Start the server (macOS/Linux)
```bash
cd mkrm-metals
ADMIN_EMAIL="your-admin-email" \
ADMIN_PASSWORD="your-admin-password" \
SESSION_SECRET="use-a-long-random-value" \
npm run dev
```

### Start the server (Windows PowerShell)
```powershell
cd mkrm-metals
$env:ADMIN_EMAIL="your-admin-email"
$env:ADMIN_PASSWORD="your-admin-password"
$env:SESSION_SECRET="use-a-long-random-value"
npm run dev
```

Open:
- Public website: `http://localhost:4173`
- Private admin: `http://localhost:4173/#/admin`

### Verified during build
- Server and browser JavaScript syntax checks.
- Catalogue bootstrap: 6 categories and 14 products.
- Buyer RFQ creates a unique reference and appears in admin records.
- Supplier enquiry records remain separate from RFQs.
- Private admin endpoint returns `401` without authentication.
- Admin login, catalogue edits, category edits, supplier quote entry and buyer quotation draft workflow were tested.
- Sitemap and robots routes return correctly.
- Generated database was cleaned before package handover; no demo enquiries are included.

---

## 8. Recommended next development phase

**Production backend migration first:** migrate data, auth and private storage to Supabase; then deploy the server/API to Vercel or another host. This protects real buyer/supplier data before marketing the site publicly.


## Administrator password management (local build update)

- The sign-in page has a **Forgot password?** recovery option. In this local build, a one-time recovery URL is printed in the Node.js server terminal instead of emailed because no email provider is configured. The token expires after 15 minutes and is invalidated after one use or server restart.
- Signed-in administrators can use **Account & password** to change their password after confirming the current password. Passwords must be 12–256 characters.
- The password is stored as a salted scrypt hash in `data/admin-auth.json`; plaintext credentials are not written to that file. The file is generated at first run and should be kept private.
- Password-reset tokens are memory-only. All sessions are invalidated after a successful reset. A password change retains the current session and invalidates other sessions.
- `run-local.bat` supplies credentials only for first-time initialization. After a password is changed, the saved local account takes precedence over the launcher defaults.

---

## Responsive-device review

The stylesheet includes responsive breakpoints at 850 px, 650 px and 390 px. The tablet navigation was corrected so the hamburger menu appears when navigation links collapse at widths up to 850 px. This is a code-level responsive review, not a claim of physical testing on every device or browser. The local site is intended for current mainstream browsers; verify the key pages on target devices before production deployment. For a phone to access the development server, it must use the host computer's LAN IP and port 8080 rather than the phone's own `localhost`.



## Public preview hosting update

- Added a Render Blueprint (`render.yaml`) with a Node.js web service, `/api/health` health check, environment-supplied admin credentials and generated session secret.
- Server now listens on `0.0.0.0` using `PORT`, as required by public web hosting.
- Password-recovery URLs use `PUBLIC_URL` or Render's `RENDER_EXTERNAL_URL` and are logged for the service owner; reset email delivery is not implemented.
- Secure session cookies add the `Secure` attribute when the public base URL is HTTPS.
- This is a preview deployment configuration only. Current file-backed database/auth/uploads are ephemeral on Render Free; migrate to managed persistent storage before any real commercial use.
