# Backend Architecture Instruction Set

This document outlines the strict rules and regulations for all future backend feature development. **These rules must be followed before implementing any new feature.**

## 1. Directory & Class Structure
Every new feature must reside in `backend/features/<featureName>/` and contain exactly four files using a class-based design:
- `<featureName>api.js`: Defines Express endpoints and handles dependency injection.
- `<featureName>controller.js`: Extends `BaseController`. Handles request validation, extracts ONLY necessary parameters, and calls the service. **NO SQL or business logic.**
- `<featureName>Service.js`: Extends `BaseService`. Houses all business rules, calculations, and logic. Calls the repository. **NO SQL or HTTP parsing.**
- `<featureName>Repository.js`: Extends `BaseRepository`. Owns all feature-specific database queries. Builds queries using `this.queryHelper` and calls `this.queryHelper.execute()`.

## 2. Database Isolation (The Golden Rule)
- **NEVER** import or use `@supabase/supabase-js` or any other database client directly within a repository, service, or controller.
- **NEVER** directly call Supabase methods such as `supabase.from(...)`, `supabase.rpc(...)`, or `supabase.auth(...)` inside a repository.
- The `execute()` function lives EXCLUSIVELY inside `backend/database/queryHelper.js`.
- Do not create a separate `execute.js` file. 
- All database communication MUST flow through: `Repository -> this.queryHelper -> execute() -> Supabase`.

## 3. Environment & Configuration
- All secrets, API keys, and connection strings must be stored in `.env`.
- Never hardcode credentials in the source code.
- Do not hardcode configurable limits (e.g., `MAX_IMAGES`, `MAX_FILE_SIZE`) in the source code. Always read these from environment variables (`process.env` on backend, `import.meta.env` on frontend) with safe fallbacks.
- `server.js` is responsible for failing fast at startup if critical environment variables (like `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`) are missing.

## 4. Error Handling
- Do not swallow database errors silently.
- Securely log database errors on the backend inside `queryHelper.js` without exposing credentials or internal database schemas.
- Throw generic exceptions up to the repository/service layer to be handled by the controller's standard response formatting.

## 5. Dependency Management
- Maintain a lightweight setup. Do not introduce ORMs (like Prisma/TypeORM) or unnecessary abstractions unless explicitly required. The `queryHelper.js` is the sole database abstraction.

## 6. Frontend Architecture & API Calls
- **NEVER** make direct API calls (e.g., using `fetch` or `axios`) inside a React component.
- All API interactions MUST be abstracted into a dedicated `service/` folder within the respective feature directory.
- React components should only import and invoke these service functions to maintain separation of concerns.

## 7. Localization (i18n)
- **NEVER** use static hardcoded text strings in the frontend UI.
- All user-facing text MUST be made dynamic using `react-i18next` (`useTranslation` hook or `t` function).
- Ensure all text keys are added to both `en.json` and `hi.json` language files in the backend.

## 8. Authorization & Role-Based Access Control (RBAC)
- **Role-Based Authorization**: Saanvi uses strict role-based authorization. Users receive permissions exclusively through roles.
- **Authorization Chain**: The mapping strictly follows: `User -> user_roles -> roles -> role_permissions -> permissions`.
- **NO Direct Mapping**: There is NO direct user-to-permission relationship. The `user_permissions` table MUST NOT be used or recreated. Never store calculated effective permissions directly against users.
- **Effective Permissions**: Effective permissions are the union of permissions from all active roles. Duplicate effective permissions must be removed. Users can have multiple roles.
- **Naming Convention**: Permission names MUST strictly follow the folder structure (e.g., `admin.users`, `games.words.wordsearch`).
- **Centralized Security**: Backend authorization is the definitive security boundary. Every protected API MUST enforce its required permission using the centralized middleware (`requirePermission('...')`). Do NOT implement custom permission checks inside individual controllers.
- **Frontend Page Authorization**: Every protected frontend page MUST declare its required permission. Frontend permission checks are for UX only.
- **Frontend UX vs Security**: Hiding navigation links is strictly for UX. It does not replace backend API security. Never trust frontend permission state for backend validation.
- **Status Codes**: Use `401 Unauthorized` for unauthenticated requests, and `403 Forbidden` for authenticated but unauthorized requests.
- **Database Rules**: `permissions` is the master table. Only actual permission UUIDs may be assigned to roles. Do not use hardcoded `isAdmin` authorization.
- **Permission Tree UI**: Permission management MUST use a hierarchical permission tree. Parent/group tree nodes in the permission tree are UI-only and must NEVER be stored in `role_permissions`. Only actual permission UUIDs may be assigned to roles. The tree component must support arbitrary permission depth and its search functionality must preserve the relevant parent hierarchy.

## 9. QueryHelper Standards — Simple Condition → Simple Syntax

**The primary rule:** Use the simplest valid queryHelper syntax that correctly represents the condition. Do not route simple conditions through unnecessary intermediate abstractions.

### Core requirements
- **Always** use `queryHelper` for database queries. Repositories must not access `queryHelper.db` directly unless building correlated subqueries (JSON aggregation, outer-alias references, compound JOIN ON clauses) that genuinely cannot be expressed as a top-level `queryHelper` chain. Document each such exception with a comment.
- **Always** use `.field()` for field selection. Never manually construct SELECT column lists.
- **Never** create specialised helper functions for conditions that `.where()`, `.and()`, or `.or()` can already express. This explicitly prohibits: `whereLike()`, `whereOr()`, `whereAnd()`, `whereRaw()`, `rawWhere()`, `rawCondition()`, `rawJoin()`, `leftJoinOn()`, etc.

### WHERE / AND / OR conditions
- **Preferred form** — plain condition string with direct interpolation for simple queries:
  ```js
  .where(`cr.sender_uuid = '${userUuid}' OR cr.receiver_uuid = '${userUuid}'`)
  ```
- **Do not** chain `.or()` or `.and()`, as they are not supported by the queryHelper.
- **Do not** use `.whereOr([...])` condition-object arrays, `db.ref()`, or `db.val()`.
- **Do not** use `?` placeholder arrays when direct interpolation is safe (see security rule below).

### LIKE / ILIKE searches
- Use `.where()` with standard SQL `OR` clauses and direct interpolation. Do **not** create a `whereLike()` helper:
  ```js
  const safe = query.replace(/'/g, "''"); // SQL-escape before interpolating
  qh.where(`u.email ILIKE '%${safe}%' OR ud.display_name ILIKE '%${safe}%'`)
  ```

### JOIN conditions
- Use `.leftJoin(table, alias, 'col = col')` for single-column ON clauses.
- For compound ON clauses access `queryHelper.db` and pass a `db.raw(...)` string as the join argument. Document with a comment. Do **not** use callback-based `this.on()` / `this.andOn()`.

### Security — interpolation safety rules

| Value source | Rule |
|---|---|
| JWT session UUID (`req.user.uuid`) | Safe to interpolate directly — UUIDs contain only `[0-9a-f-]` |
| Joi-validated UUID (request body/param) | Safe to interpolate directly |
| Free-text user input (`req.query.*`, `req.body` string fields) | **Must SQL-escape** (`'` → `''`) before interpolating — never interpolate raw |

**Never interpolate free-text user input without SQL-escaping first.** Column names and table aliases are developer-written and always safe.


## 10. Reusable Frontend Components
- **ALWAYS** use `SButton` instead of a native `<button>` element whenever the `SButton` component supports the required behavior.
- **ALWAYS** use `STextField` instead of a native `<input type="text">` or `<input type="search">` when an equivalent reusable component exists.
- Before creating any new UI component, search the existing `/src/components/common/` directory for an equivalent.
- Do not create duplicate versions of any reusable component.
- `<input type="file">` hidden elements used purely as file-picker triggers are exempt from the `STextField` rule — these must remain native `<input>` elements.

## 11. Static Configuration vs. Component Logic
- Static configuration data (theme lists, attachment categories, MIME type mappings, option lists, static labels) must live in dedicated files under `/src/features/<feature>/` or `/src/constants/`, NOT inside component files.
- Components must import and consume configuration data; they must not define it inline.
- Theme definitions for the chat background system must live in `/src/features/chat/chatThemes.js`.
- Attachment category definitions must live in `/src/features/chat/attachmentTypes.js`.
- Attachment type detection and routing logic must be centralized (e.g., `attachmentUtils.js`) rather than duplicated across components.
- Missing or deleted attachments MUST trigger a standardized fallback UI (e.g., `MissingAttachment`) rather than rendering raw metadata or filenames. Always hook native media elements with `onError` handlers to detect storage failures gracefully.

## 12. Inline CSS
- Avoid `style={{ ... }}` for static presentational styling. Move all static styles to the feature's `.css` file and apply via `className`.
- Dynamic inline styles are acceptable **only** when the value is genuinely computed at runtime (e.g. wallpaper `transform`, dynamic dimensions, user-controlled colors). Even then, minimize the number of inline properties.
- Never use inline `style` to work around a missing CSS class. Add the class instead.

## 13. User-Facing Text (i18n)
- **NEVER** use static hardcoded user-facing text strings in frontend UI components (already defined in Rule 7 — reiterated here for enforcement).
- All user-facing strings must use `react-i18next` (`useTranslation` hook and `t()` function).
- New translation keys must be added to both `backend/language/en.json` and `backend/language/hi.json`.

## 14. Reusability First
Before creating any new helper, component, utility, or service:
1. Search existing codebase for an equivalent.
2. Prefer extending an existing abstraction over creating a new one.
3. Only create something new when no suitable abstraction exists.
   Order of preference: Existing component → Existing utility → Existing queryHelper method → Extend existing abstraction → Create new.

