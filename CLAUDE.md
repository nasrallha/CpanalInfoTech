# InfoTech Control Panel (infotech-cpanal)

> ملف التعليمات لـ Claude Code: بيتقري أوتوماتيك في كل جلسة.

## The owner and how to work with him
- Owner: Mohamed. **Always reply in Arabic (Egyptian dialect is fine in chat).** Never switch to English.
- **UI text must be formal Arabic (فصحى)**, never colloquial. Translations live in `messages/ar.json` and `messages/en.json`, and every string goes in both.
- Terminal / CLI: **English only**. Windows commands for **CMD**, not PowerShell.
- Apply changes **directly to the files**. **Discuss bigger features first**; small fixes, just do them.
- Setup/deployment: one step at a time, and wait for his result.
- Runs on Windows locally; must also run on Linux (production VPS).

## What this project is
- The owner's control panel for the multi-company ERP. Its own DB holds: staff and roles, companies, plans, activities, role/payment templates, backups, and settings.
- Each client company has its own ERP database, created by provisioning (`lib/provision.js`).
  - The panel writes the `subscription` copy into the company DB (`writeSubscription`, via `trySync`).
  - It also writes company info (`writeCompanyRow` / `pushCompanyInfo` on edit).
- The ERP project is `G:\projects\nextjs\firstapp` (see its CLAUDE.md).
  - This panel reads `lib/module-catalog.js`, `lib/permissions.js` and `messages/*.json` from it at runtime (`lib/erp-meta.js`, path from `ERP_MIGRATIONS_DIR`).
  - "تحديث القواعد" applies ERP migrations to the chosen company DBs.
- Dev server: `npm run dev` (port 3100).

## Code structure
- Same pattern as the ERP: `validations/` (Zod) → `services/` (Prisma, server-only) → `actions/` (`runAction`). Pages live in `app/[locale]/(panel)/...` with views in `components/...`.
- Permissions: `lib/permissions.js`. Audit important actions with `audit(user, "x.y", {...})`.
- Comments in code are in Arabic.

## Database / migrations
- Handwritten SQL migrations in `prisma/migrations/`, kept in sync with `schema.prisma`, data-safe (defaults, `INSERT IGNORE`). He runs `npm run db:deploy`.
- Don't read or echo `.env` secrets (`PANEL_SECRET_KEY`, DB root password…), and don't change them.

## UI rules (always)
- Theme: calm teal primary + charcoal sidebar. Solid buttons (no gradients), soft shadows.
  - **All colors live in `theme/colors.js` (`C`), the single source.** Use `C.x` in JSX and `var(--cp-x)` in CSS; the vars are generated from `C` and injected in `app/[locale]/layout.jsx`. The antd theme is built from `C` in `theme/antd.js`.
  - Never hardcode a hex color in components or CSS. Add it to `C` first.
- **Responsive is a must**: every screen has to work on phones (see the responsive section at the end of `globals.css`). Tables get `scroll={{ x }}`, filter bars use `.cp-filters`.
- Money: show it with `formatMoney` and edit it with `moneyInputProps` (`lib/money.js`).
  - **Switches and status tags are green.**
  - List tags inside tables are neutral gray: `className="cp-chip"`, not blue.
- **Full-width screens**: settings cards use `.settings-masonry`. Forms put fields 3–4 per row, with `className="cp-compact-form"`.
- **Compact modals**: short fields side by side, and hints as `tooltip` (❔).
- Activities screen = cards (`.activity-cards`). The companies list stays a table.
- **No browser autocomplete anywhere** (`components/common/useNoAutofill.js` + `autoComplete="off"`, and `new-password` for passwords).
- **Every search field runs on Enter**, and keeps the button too.
- Font: IBM Plex Sans Arabic (`var(--font-main)`).

## Checks before finishing
- Make sure changed files build and lint. Re-read the diff, and don't reformat unrelated code.
