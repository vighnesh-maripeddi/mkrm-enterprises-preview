# mkrm-enterprises-preview
A DEMO WEBSITE FOR MKRM IMPORT EXPORT 
[README.md](https://github.com/user-attachments/files/33380266/README.md)
# MKRM ENTERPRISES — Local Chrome Website

This is a local testing build of the MKRM industrial metals enquiry website. It runs on Node.js and is configured for **http://localhost:8080**. The included Windows launcher starts the server and opens Chrome when Chrome is installed.

## Start on Windows 10/11

1. Extract `MKRM-ENTERPRISES-localhost-8080.zip` to a normal folder, such as `D:\MKRM-ENTERPRISES-localhost-8080`.
2. Install **Node.js 20 or newer** from <https://nodejs.org/> if needed. Verify by opening Command Prompt and running `node --version`.
3. Double-click `run-local.bat`.
4. Keep the server terminal window open. The launcher opens Chrome at **http://localhost:8080** once the health endpoint responds.
5. Admin dashboard: **http://localhost:8080/#/admin**.

### Local admin login

- Email: `admin@example.com`
- Password: `Change-this-local-password-2026!`

These are the first-run development credentials configured in `run-local.bat`. Change the password after your first login. After that, use the password you saved in the Account & password screen; changing the launcher variable does not override the saved credential file. The password is saved as a salted hash in `data/admin-auth.json`; subsequent starts use that saved password, not the launcher default. Do not reuse a real password and do not expose this development server to the internet.

## Change or recover the administrator password

- **Change password:** sign in, open the **Account & password** tab, enter the current password, then enter and confirm a new password (at least 12 characters). The change is saved and persists after restarting the server.
- **Forgot password:** on the sign-in screen select **Forgot password?**, enter the administrator email, then look at the black Node.js server terminal window. Copy/open the one-time recovery URL printed there. The link expires after 15 minutes and can be used once.
- Password recovery email is **not configured** in this local project. The site does not claim an email was sent. Recovery tokens are held in memory and become invalid if the server restarts.
- Do not share `data/admin-auth.json`, `data/db.json`, or the contents of the server terminal while a recovery link is visible.

## Stop and restart

- Stop the server by focusing its terminal window and pressing `Ctrl+C`.
- Restart by double-clicking `run-local.bat` again.
- If the launcher says port 8080 is already in use, close the other program using it, or change `PORT` and the URLs in `run-local.bat` consistently.

## Data persistence

The first run creates `data/db.json` and `data/uploads/` automatically. Buyer enquiries, supplier offers and catalogue changes are saved locally. The ZIP intentionally excludes any pre-existing runtime database or uploaded records, so it starts with a clean data set. Back up `data/` if you need to keep local test records. Do not share this folder because it can contain private commercial data.


## Publish a public preview link (Render)

This project includes a `render.yaml` Blueprint for a **public demo**. Render creates a public HTTPS address such as `https://your-service-name.onrender.com`; the final URL is assigned after you deploy. `localhost` is not a public address.

1. Create/sign in to GitHub and create a **private** repository for this project. Upload the project files from this folder, including `render.yaml`. Do not upload `.env`, `data/db.json`, `data/admin-auth.json`, or uploaded documents. The included `.gitignore` excludes those runtime files.
2. Create/sign in to Render at <https://render.com/> and choose **New → Blueprint**. Connect your GitHub account and select the repository.
3. When prompted, enter `ADMIN_EMAIL` and a unique `ADMIN_PASSWORD` of at least 12 characters. Render generates `SESSION_SECRET`. Do not reuse a personal password.
4. Create the Blueprint and wait for the deploy to finish. Open the `onrender.com` URL shown in the Render dashboard. Share that HTTPS link with friends; it works on phones, tablets and computers with an internet connection.
5. Test the public catalogue and enquiry flow. Open `/api/health` on your service URL to verify the server is responding.

### Important: public demo only

The free Render web service is suitable for a preview, not real customer operations. Its local filesystem is ephemeral: the JSON database, uploaded files, changed admin password and submitted enquiries can be lost when the service restarts, redeploys or spins down. The free service may also sleep after 15 minutes without traffic, so first load may take about a minute. Do not collect real buyer/supplier information or use the admin dashboard for live commercial data until persistent database/storage, transactional email, production authentication and backups are configured.

Password recovery does not send email in this build. For a hosted preview, the one-time recovery link is written to the service logs and expires after 15 minutes; only the project owner should access those logs.

## Responsive and device compatibility

- The layout includes responsive CSS breakpoints for desktop/tablet (850 px), mobile (650 px), and narrow phones (390 px).
- Product grids, forms, footer sections, and admin tables adapt for smaller viewports; the admin tables can scroll horizontally when needed.
- The tablet navigation has been adjusted so the menu button is available at widths up to 850 px.
- The code uses standard HTML, CSS, and JavaScript and is intended for current versions of Chrome, Edge, Firefox, and Safari. This package has not been physically tested on every phone, tablet, browser, or screen size, so device-specific differences may still exist.
- `localhost:8080` opens the site on the computer running the server. To test from a phone on the same Wi-Fi, use the computer's local network IP address with `:8080` and allow the connection through the computer firewall if prompted. Do not expose this local development server to the public internet.

## Included features

- Responsive public website and material catalogue (6 categories, 14 starting products)
- Catalogue search and filters
- Buyer RFQ submission with generated reference numbers
- Separate supplier material-offer submission
- Protected local admin login, change-password screen and one-time password recovery flow
- Local JSON persistence
- Six bundled local material-image assets

## Limitations

- This build is for local testing, not production hosting.
- Transactional email is not configured.
- Records use a local JSON file rather than PostgreSQL/Supabase.
- The local admin account is a single account with a persistent salted password hash; email reset delivery and multi-user roles are not configured.
- Review legal text, company details, product specifications and image licensing before publishing.

No `npm install` step is required; this project has no external runtime dependencies.
