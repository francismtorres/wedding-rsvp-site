# Wedding RSVP Website

This is a full-stack wedding RSVP website for **Katelyn Somerville and David Gabinet**.

## Included
- Elegant single-page public wedding website
- RSVP form with JSON file storage
- Duplicate email prevention
- Optional email notifications using Resend API
- Admin dashboard at `/admin`
- RSVP stats and delete functionality
- Responsive design using the uploaded floral artwork

## Run locally
1. Install Node.js 18+.
2. Open this folder in Terminal.
3. Create a `.env` file by copying `.env.example` if you want custom settings.
4. Run:
   ```bash
   npm start
   ```
5. Open `http://localhost:3000`

## Environment setup
- `ADMIN_KEY`: protects the admin API if you want a private dashboard.
- `RESEND_API_KEY`: enables email notifications when a guest submits an RSVP.
- `FROM_EMAIL`: sender address used for notification emails.

## Deploy options
This project works well on:
- **Render**
- **Railway**
- **Fly.io**

Because this project stores data in a JSON file, persistent storage should be enabled on your host if you want submissions to survive redeploys.

## Notes
- The current dashboard keeps `RSVPs with Plus One` at `0` because the public form does not include a plus-one field.
- The prompt requested Lucide icons. The current build uses clean emoji icons so it runs with zero package installs. I can swap those to inline SVG icons in a follow-up version.
