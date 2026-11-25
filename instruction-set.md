# Saanvi Backend Architecture & Development Standards

Authoritative standard for the hardened Sofy-inspired backend architecture across the Saanvi application.

---

## 1. Architectural Overview

The backend strictly adheres to a 5-tier layered architecture:

```text
API Definition (ApiSchema)
      │
      ▼
Controller extends BaseController
      │
      ▼
Service extends BaseService
      │
      ▼
Repository extends BaseRepository
      │
      ▼
DbDriver (Knex / PostgreSQL)
```

- **QueryHelper**: Query construction ONLY. Table-bound in repository constructors, producing independent, reusable query chains. Tracks explicit query types (`SELECT`, `INSERT`, `UPDATE`, `DELETE`).
- **ApiContext**: Request-scoped container carrying request, response, authenticated user, request ID, scoped logger, shared DbDriver, and active transaction.
- **DbDriver**: Central database execution boundary managing the shared Knex pool, transactions, and PostgreSQL error metadata.
- **Centralized Error Handler**: Uniform error handler preventing internal leaks on 500 errors and guaranteeing canonical envelopes.

---

## 2. Core Architectural Invariants

1. **API References Controller Classes**: Endpoint definitions point directly to the Controller class and method name:
   ```javascript
   handler: {
     controller: UserController,
     method: 'getUser'
   }
   ```
2. **ApiSchema Constructs Request-Scoped Controllers**:
   `ApiSchema` instantiates the Controller per request with the active `ApiContext`:
   ```javascript
   const context = new ApiContext(req, res);
   const ControllerClass = endpoint.handler.controller;
   const controller = new ControllerClass(context);
   await controller[endpoint.handler.method](req, res);
   ```
   No legacy factories or fallback `try { new C() } catch { C() }` are permitted.
3. **Controllers Construct Services**:
   Controllers instantiate domain services passing `this.context`.
4. **Services Construct Repositories**:
   Services instantiate domain repositories passing `this.context`.
5. **Repositories Initialize Table-Bound QueryHelpers**:
   Initialized once in the constructor (`this.sql = new QueryHelper('table_name', 'alias')`).
6. **QueryHelper Uses `.select().field()`**:
   SELECT queries require explicit field selection. Bare `.select()` does not add `*`. To select all fields, explicitly call `.select().field('*')`. Building an empty SELECT throws an error.
7. **Query-State Isolation & Type Tracking**:
   Every query chain spawned from `this.sql` (`.select()`, `.insert()`, `.update()`, `.delete()`) is completely isolated. Active query chains track their query type and cannot transition between incompatible types (e.g., SELECT to UPDATE).
8. **Preceding WHERE for Mutations**:
   Query chains allow `.where()` conditions to precede `.update()` and `.delete()` calls while rejecting `.field()` on mutation queries.
9. **BaseRepository Delegates Execution to DbDriver**:
   Repositories never execute queries directly; they delegate to `this.runQuery()`, `this.runQueryFirst()`, or `this.execute()`.
10. **DbDriver Owns Database Execution & Transactions**:
    Strict result contracts:
    - `runQuery(query, params, trx)` -> `Promise<Array>`
    - `runQueryFirst(query, params, trx)` -> `Promise<Object|null>`
    - `execute(query, params, trx)` -> `Promise<{ affectedRows: number, rows: Array }>`
    Transactions throw immediately if a query cannot be bound (`transacting`).
11. **Shared Pool Ownership**:
    Only the initial application-level creator of the shared Knex pool owns it and can destroy it. Secondary `DbDriver` instances cannot destroy the shared pool.
12. **ApiContext Carries Request-Scoped Dependencies**:
    `req`, `res`, `user`, `requestId`, `logger`, `connection`, `transaction`.
13. **One Canonical Response Contract**:
    `this.respondOk(data, message)`
    `this.respondError(message, statusCode, code, details)`
    `this.respondPaginated(data, pagination, message)`
    No explicit `res` parameters; no legacy migration aliases.
14. **One Canonical Pagination Contract**:
    Strictly enforces `{ pageNumber, pageSize, totalRecords, totalPages }` with safe integer validation.
15. **Centralized Error Handling**:
    All unhandled errors routed through `errorHandler.js`. HTTP 500 errors never leak raw PostgreSQL errors, SQL queries, or stack traces.
16. **SQL Parameterization & Security**:
    All runtime values bound through parameterization (`?`). Raw SQL must use `.whereRaw(sql, [bindings])` with explicit allowlists for dynamic identifiers.

---

## 3. QueryHelper Specifications (`backend/database/queryHelper.js`)

### Sofy-Style SELECT Convention
```javascript
// Selecting specific fields
const query = this.sql
  .select()
  .field('u.uuid')
  .field('u.email')
  .field('u.status')
  .field('r.name as role_name')
  .leftJoin('user_roles as ur', 'u.uuid', 'ur.user_uuid')
  .leftJoin('roles as r', 'ur.role_uuid', 'r.uuid')
  .where('u.email', '=', email);

// Selecting all fields explicitly
const queryAll = this.sql
  .select()
  .field('*')
  .where('status', '=', 'active');
```

### Explicit Query Type Tracking
- `_queryType` tracks `'SELECT'`, `'INSERT'`, `'UPDATE'`, `'DELETE'`.
- Attempting to call `.update()`, `.delete()`, or `.insert()` on an active SELECT chain throws:
  `QueryHelper Error: Cannot change query type from SELECT to UPDATE.`
- Calling `.field()` or `.fields()` on an UPDATE, DELETE, or INSERT chain throws:
  `QueryHelper Error: Cannot select fields on a UPDATE query.`
- Preceding WHERE conditions are supported:
  ```javascript
  const updateQuery = this.sql
    .where('uuid', '=', userUuid)
    .update({ status: 'archived' });
  ```

### Strict WHERE, Identifiers & Operators
- Allowed operators: `=`, `!=`, `<>`, `>`, `>=`, `<`, `<=`, `LIKE`, `ILIKE`, `IN`, `NOT IN`, `IS`, `IS NOT`.
- Explicit null checks: Use `.whereNull(column)` and `.whereNotNull(column)` instead of `.where(col, '=', null)`.
- Undefined binding rejection: Passing `undefined` as a value or binding throws immediately.
- Arrays enforced: `.whereIn(col, array)` and `.whereNotIn(col, array)` strictly validate non-empty arrays.
- Forwarding fix: `.and(...args)` and `.orWhere(...args)` cleanly forward exact arguments without appending `undefined`.
- ORDER BY validation: Accepts only `'asc'` or `'desc'` (case-insensitive).
- LIMIT & OFFSET: Strictly validated using `Number.isSafeInteger()` (must be >= 0).
- Identifiers: Validates that tables, aliases, and column names do not contain illegal characters (`;`, `--`, `/*`).

---

## 4. DbDriver Specifications (`backend/database/dbDriver.js`)

### Strict Result Contracts
- `runQuery`: Throws `DbDriver Contract Violation` if the result is not an array.
- `runQueryFirst`: Returns the first object of the array or `null`.
- `execute`: Validates that mutation results return an array of rows or numeric rowCount; rejects arbitrary single-object or null responses.

### Transaction Safety
If a transaction is supplied to `runQuery`, `runQueryFirst`, or `execute`, DbDriver verifies that the query supports `.transacting()`. If not, it throws an error immediately to prevent queries from silently executing outside the active transaction.

### Shared Pool Ownership & Strict Config Parsing
- Environment variables `DB_POOL_MIN`, `DB_POOL_MAX`, and `DB_CONNECTION_TIMEOUT` are strictly parsed as integers (rejecting strings with trailing characters, floats, or NaNs).
- Only the driver instance that created the shared Knex pool can close it. Secondary instances cannot destroy the shared pool.
- PostgreSQL error codes (`23505`, etc.) and constraint metadata are preserved.

---

## 5. BaseController & Centralized Error Handling

### Canonical Controller Methods
```javascript
// Success
this.respondOk(data, 'Optional success message');

// Error
this.respondError('Validation failed', 400, 'VALIDATION_ERROR', errors);

// Paginated
this.respondPaginated(data, {
  pageNumber: 1,
  pageSize: 20,
  totalRecords: 100,
  totalPages: 5
}, 'Optional message');
```

### Centralized Errors
- HTTP 500 errors never leak raw PostgreSQL error messages, SQL strings, or stack traces to clients.
- Centralized error handler `errorHandler.js` formats all unhandled errors using the canonical error envelope:
  ```json
  {
    "success": false,
    "data": null,
    "error": {
      "code": "SERVER_ERROR",
      "message": "Internal Server Error",
      "details": []
    }
  }
  ```

---

## 6. Complete Feature Implementation Example

### 6.1 API Definition (`backend/features/example/exampleApi.js`)
```javascript
const Joi = require('joi');
const ApiSchema = require('../../base/apiSchema');
const ExampleController = require('./exampleController');

const getItems = {
  path: '/',
  verb: 'GET',
  auditMessage: 'fetching items',
  handler: {
    controller: ExampleController,
    method: 'listItems'
  },
  middleware: {
    requireAuth: true
  }
};

const createItem = {
  path: '/',
  verb: 'POST',
  auditMessage: 'creating item',
  handler: {
    controller: ExampleController,
    method: 'createItem'
  },
  validation: {
    body: Joi.object({
      name: Joi.string().required().trim(),
      description: Joi.string().optional().allow('', null)
    })
  },
  middleware: {
    requireAuth: true
  }
};

module.exports = new ApiSchema({
  name: 'Example',
  url: '/api/example',
  endpoints: [getItems, createItem]
});
```

### 6.2 Controller (`backend/features/example/exampleController.js`)
```javascript
const BaseController = require('../../base/baseController');
const ExampleService = require('./exampleService');

class ExampleController extends BaseController {
  constructor(context = null) {
    super(context);
    this.exampleService = new ExampleService(context);
  }

  async listItems(req, res) {
    const userUuid = this.context.user?.uuid;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;

    const result = await this.exampleService.listItems(userUuid, page, limit);
    return this.respondPaginated(result.items, result.pagination);
  }

  async createItem(req, res) {
    const userUuid = this.context.user?.uuid;
    const item = await this.exampleService.createItem(userUuid, req.body);
    return this.respondOk(item, 'Item created successfully');
  }
}

module.exports = ExampleController;
```

### 6.3 Service (`backend/features/example/exampleService.js`)
```javascript
const BaseService = require('../../base/baseService');
const ExampleRepository = require('./exampleRepository');

class ExampleService extends BaseService {
  constructor(context = null) {
    super(context);
    this.exampleRepository = new ExampleRepository(context);
  }

  async listItems(userUuid, pageNumber, pageSize) {
    const totalRecords = await this.exampleRepository.countItems(userUuid);
    const rows = await this.exampleRepository.findItems(userUuid, pageNumber, pageSize);

    const items = rows.map(r => ({
      uuid: r.uuid,
      name: r.name,
      description: r.description,
      createdAt: r.created_at
    }));

    const totalPages = Math.ceil(totalRecords / pageSize) || 1;

    return {
      items,
      pagination: {
        pageNumber,
        pageSize,
        totalRecords,
        totalPages
      }
    };
  }

  async createItem(userUuid, payload) {
    const row = await this.exampleRepository.createItem({
      user_uuid: userUuid,
      name: payload.name,
      description: payload.description || null
    });

    return {
      uuid: row.uuid,
      name: row.name,
      description: row.description,
      createdAt: row.created_at
    };
  }
}

module.exports = ExampleService;
```

### 6.4 Repository (`backend/features/example/exampleRepository.js`)
```javascript
const { v4: uuidv4 } = require('uuid');
const BaseRepository = require('../../base/baseRepository');
const QueryHelper = require('../../database/queryHelper');

class ExampleRepository extends BaseRepository {
  constructor(context = null) {
    super(context);
    this.sql = new QueryHelper('example_items', 'ei');
  }

  async countItems(userUuid) {
    const query = this.sql
      .select()
      .field('count(*) as count')
      .where('ei.user_uuid', '=', userUuid)
      .whereNull('ei.archived_at');

    const row = await this.runQueryFirst(query);
    return parseInt(row?.count, 10) || 0;
  }

  async findItems(userUuid, pageNumber, pageSize) {
    const offset = (pageNumber - 1) * pageSize;
    const query = this.sql
      .select()
      .field('ei.uuid')
      .field('ei.name')
      .field('ei.description')
      .field('ei.created_at')
      .where('ei.user_uuid', '=', userUuid)
      .whereNull('ei.archived_at')
      .orderBy('ei.created_at', 'desc')
      .limit(pageSize)
      .offset(offset);

    return this.runQuery(query);
  }

  async createItem(itemData) {
    const uuid = uuidv4();
    const query = this.sql.insert({
      uuid,
      ...itemData
    });

    const result = await this.execute(query);
    return result.rows[0];
  }
}

module.exports = ExampleRepository;
```

---

## 7. Testing Requirements

- Architecture tests verify layer isolation, controller instantiation, and absence of obsolete patterns (`base/architecture.test.js`).
- Unit and contract tests for QueryHelper (`database/queryHelper.test.js`) and DbDriver (`database/dbDriver.test.js`).
- Feature test suites verify services and repositories with explicit mocks or test context.
- Full regression command: `npx jest --runInBand`.

---

## 8. Reference Login Implementation & Authentication Security

The `features/login/` module serves as the canonical reference implementation for secure authentication, token rotation, and authorization in Saanvi.

### 8.1 Atomic Refresh-Token Rotation & Concurrency Policy
- **Atomic Token Consumption (`consumeRefreshToken`)**: To prevent token replay vulnerabilities and concurrent race conditions, refresh tokens are consumed in a single atomic PostgreSQL `UPDATE ... RETURNING *` query:
  ```javascript
  const query = this.sqlRefresh
    .where('token_hash', '=', tokenHash)
    .whereNull('revoked_at')
    .whereRaw('expires_at > NOW()')
    .update({ revoked_at: new Date() });
  ```
  - Exactly 1 affected row: the token is revoked and returned for replacement.
  - 0 affected rows: the token has already been consumed, expired, or does not exist; returns `null` and throws `'Invalid or expired refresh token'`.
  - Database-level row locking ensures that if two concurrent requests attempt to consume the same token, exactly one succeeds and the other receives 0 affected rows.
  - The 30-second grace window has been completely eliminated in favor of strict atomic consumption.
- **Transactional Rotation (`processRefreshToken`)**: The entire rotation sequence runs inside a single PostgreSQL transaction (`this.repository.transaction(async (trx) => { ... })`):
  1. Atomically consume the existing token.
  2. Retrieve the user's latest account status, roles, and permissions within the transaction.
  3. Generate and persist the replacement refresh token within the transaction.
  4. If any step fails (e.g. database error, inactive user), the entire transaction rolls back, preventing the old token from being consumed without a committed replacement.
- **Frontend Single-Flight Mechanism (`axios.client.js`)**:
  - When multiple API calls encounter HTTP 401 simultaneously, they share a single `refreshAuthToken()` promise (`if (refreshPromise) return refreshPromise;`).
  - Exactly one `/api/login/refresh-token` HTTP request is dispatched.
  - All pending requests await the same refresh resolution, eliminating client-side concurrency races.
- **Token Leak Prevention & Cookie Security**:
  - Refresh tokens are transmitted strictly via `httpOnly` cookies and destructured out so they never appear in JSON response payloads (`const { refreshToken: newRefreshToken, ...responseData } = result;`).
  ```javascript
  {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
  ```

### 8.2 Deterministic Roles & Permissions
- To prevent row-multiplication from database joins affecting `runQueryFirst()`, user authentication records are retrieved cleanly, followed by dedicated, sorted queries for roles and permissions:
  ```javascript
  // Deterministic roles ordered alphabetically
  const query = this.sqlUserRoles
    .select()
    .field('r.name')
    .innerJoin('roles as r', 'ur.role_uuid', 'r.uuid')
    .where('ur.user_uuid', '=', userUuid)
    .where('r.is_active', '=', true)
    .whereNull('r.archived_at')
    .orderBy('r.name', 'asc');
  ```
- Fails closed: archived (`archived_at IS NOT NULL`), suspended (`status = 'archived'`), locked (`status = 'locked'`), and unverified (`is_email_verified = false`) accounts are rejected with explicit, mapped authentication error codes.

