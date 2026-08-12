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
