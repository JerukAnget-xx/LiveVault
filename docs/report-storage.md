# Report Screenshot Storage

Live.Vault stores report metadata in PostgreSQL through Drizzle and stores the
original screenshot in a private Supabase Storage bucket. Supabase Auth is not
used.

## Required setup

Create a **private** bucket named `report-screenshots` in the Supabase dashboard.
Configure its file-size limit to 10 MB and allow only `image/jpeg`, `image/png`,
and `image/webp`. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only; the application
uses it only inside the report image storage adapter.

Set these variables in `.env.local`:

```dotenv
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_ONLY_SERVICE_ROLE_KEY
SUPABASE_REPORT_SCREENSHOTS_BUCKET=report-screenshots
```

The database stores an object path such as
`reports/{cycleId}/{recipientId}/{uuid}.png`, never a public URL.

## Failure handling

Validation and duplicate checks happen before upload. If a database insert or
replacement fails after upload, the new object is removed as compensation.
During replacement, the previous object remains until the database points to
the new object. During deletion, storage removal must succeed before the report
row is deleted. Cleanup failures are logged without credentials.

## Known naming debt

The existing `aiDetectedIncome`, `aiConfidence`, and `aiRawResponse` columns now
hold local OCR audit data. Their names are retained to avoid a schema migration;
renaming them can be considered in a future migration.
