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
