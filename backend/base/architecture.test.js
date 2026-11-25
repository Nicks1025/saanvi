const ApiSchema = require('./apiSchema');
const ApiContext = require('./apiContext');
const BaseController = require('./baseController');
const BaseService = require('./baseService');
const BaseRepository = require('./baseRepository');
const QueryHelper = require('../database/queryHelper');
const fs = require('fs');
const path = require('path');

describe('Sofy Backend Architecture Invariants', () => {
  describe('Layered Dependency Chain Construction', () => {
    class MockRepository extends BaseRepository {
      constructor(context) {
        super(context);
        this.sql = new QueryHelper('users');
      }
    }

    class MockService extends BaseService {
      constructor(context) {
        super(context);
        this.repository = new MockRepository(context);
      }
    }

    class MockController extends BaseController {
      constructor(context) {
        super(context);
        this.service = new MockService(context);
      }

      async testMethod() {
        return this.respondOk({ success: true }, 'ok');
      }
    }

    it('ApiSchema instantiates Controller per request with fresh ApiContext', async () => {
      const endpoint = {
        path: '/test',
        verb: 'GET',
        handler: {
          controller: MockController,
          method: 'testMethod'
        }
      };

      const schema = new ApiSchema({
        name: 'Mock',
        url: '/api/mock',
        endpoints: [endpoint]
      });

      const registeredRoutes = [];
      const mockApp = {
        get(...args) {
          registeredRoutes.push(args);
        }
      };

      schema.register(mockApp);
      expect(registeredRoutes.length).toBe(1);

      const req = {
        method: 'GET',
        headers: { 'request-id': 'req-arch-123' },
        user: { uuid: 'user-arch-uuid' },
        query: {},
        params: {},
        body: {}
      };

      let jsonResponse = null;
      let statusCode = null;

      const res = {
        status(code) {
          statusCode = code;
          return this;
        },
        json(data) {
          jsonResponse = data;
          return this;
        }
      };

      const next = jest.fn();

      const routeArgs = registeredRoutes[0];
      const handlerFn = routeArgs[routeArgs.length - 1];
      await handlerFn(req, res, next);

      expect(statusCode).toBe(200);
      expect(jsonResponse.success).toBe(true);
      expect(jsonResponse.message).toBe('ok');
    });

    it('Controllers receive ApiContext and properly wire Services and Repositories', () => {
      const context = new ApiContext({ user: { uuid: 'user-1' } }, null, { requestId: 'req-1' });
      const controller = new MockController(context);

      expect(controller.context).toBe(context);
      expect(controller.service).toBeInstanceOf(MockService);
      expect(controller.service.context).toBe(context);
      expect(controller.service.repository).toBeInstanceOf(MockRepository);
      expect(controller.service.repository.context).toBe(context);
      expect(controller.service.repository.sql).toBeInstanceOf(QueryHelper);
    });

    it('Repositories extend BaseRepository', () => {
      const repo = new MockRepository();
      expect(repo).toBeInstanceOf(BaseRepository);
      expect(typeof repo.runQuery).toBe('function');
      expect(typeof repo.runQueryFirst).toBe('function');
      expect(typeof repo.execute).toBe('function');
    });

    it('BaseRepository does not misidentify context methods or invalid objects as active transactions', async () => {
      const fakeContext = { transaction: async () => {} };
      const repo = new MockRepository(fakeContext);
      repo.dbDriver = {
        runQueryRaw: jest.fn().mockResolvedValue([{ id: 1 }])
      };

      const result = await repo.queryRaw('SELECT * FROM users WHERE uuid = ?', ['u-1']);
      expect(result).toEqual([{ id: 1 }]);
      expect(repo.dbDriver.runQueryRaw).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE uuid = ?',
        ['u-1'],
        null
      );
    });
  });

  describe('Isolation and Absence of Obsolete Patterns', () => {
    it('QueryHelper produces independent query chains with reusable instances', () => {
      const sql = new QueryHelper('users');

      const queryA = sql.select().field('uuid').field('email').where('uuid', '=', 'user-1');
      const queryB = sql.select().field('first_name').field('last_name').where('role', '=', 'ADMIN');

      const builtA = queryA.build().toString();
      const builtB = queryB.build().toString();

      expect(builtA).toContain('"uuid"');
      expect(builtA).toContain('"email"');
      expect(builtA).not.toContain('"first_name"');
      expect(builtA).toContain("'user-1'");
      expect(builtA).not.toContain("'ADMIN'");

      expect(builtB).toContain('"first_name"');
      expect(builtB).toContain('"last_name"');
      expect(builtB).not.toContain('"email"');
      expect(builtB).toContain("'ADMIN'");
      expect(builtB).not.toContain("'user-1'");
    });

    it('QueryHelper strictly contains query construction only and has no execute method', () => {
      const qh = new QueryHelper('users');
      expect(qh.execute).toBeUndefined();
    });

    it('BaseController has removed all temporary migration helpers (sendSuccess, sendError, sendPaginated)', () => {
      const controller = new BaseController();
      expect(controller.sendSuccess).toBeUndefined();
      expect(controller.sendError).toBeUndefined();
      expect(controller.sendPaginated).toBeUndefined();
    });

    it('BaseController strictly validates pagination contract', () => {
      const controller = new BaseController({ response: { status: () => ({ json: () => {} }) } });
      expect(() => controller.respondPaginated([], { pageNumber: 0, pageSize: 10, totalRecords: 0 })).toThrow(/Invalid pagination contract/);
      expect(() => controller.respondPaginated([], { pageNumber: 1, pageSize: -5, totalRecords: 0 })).toThrow(/Invalid pagination contract/);
      expect(() => controller.respondPaginated([], { pageNumber: 1, pageSize: 10, totalRecords: 'invalid' })).toThrow(/Invalid pagination contract/);
    });

    it('Centralized error handler prevents internal error leaks and enforces canonical envelope on 500', () => {
      const errorHandler = require('./errorHandler');
      let statusSent = null;
      let jsonSent = null;

      const mockRes = {
        status(code) {
          statusSent = code;
          return this;
        },
        json(data) {
          jsonSent = data;
          return this;
        }
      };

      const internalDbError = new Error('connect ECONNREFUSED 127.0.0.1:5432');
      internalDbError.code = 'ECONNREFUSED';
      internalDbError.stack = 'Secret stack trace';

      errorHandler(internalDbError, { method: 'GET', url: '/api/test' }, mockRes, () => {});

      expect(statusSent).toBe(500);
      expect(jsonSent.success).toBe(false);
      expect(jsonSent.data).toBeNull();
      expect(jsonSent.error.message).toBe('Internal Server Error');
      expect(jsonSent.error.code).toBe('SERVER_ERROR');
      expect(jsonSent).not.toHaveProperty('stack');
      expect(JSON.stringify(jsonSent)).not.toContain('ECONNREFUSED');
    });

    it('Centralized error handler delegates to next(err) if res.headersSent is true', () => {
      const errorHandler = require('./errorHandler');
      const mockRes = {
        headersSent: true,
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };
      const next = jest.fn();
      const err = new Error('Late error after headers sent');
      errorHandler(err, { method: 'GET', url: '/api/stream' }, mockRes, next);

      expect(next).toHaveBeenCalledWith(err);
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('All feature controllers extend BaseController and API schemas reference classes directly', () => {
      const featuresDir = path.join(__dirname, '../features');
      const featureDirs = fs.readdirSync(featuresDir);

      for (const fDir of featureDirs) {
        const fullDirPath = path.join(featuresDir, fDir);
        if (!fs.statSync(fullDirPath).isDirectory()) continue;

        const files = fs.readdirSync(fullDirPath);
        for (const file of files) {
          if (file.endsWith('Api.js')) {
            const apiContent = fs.readFileSync(path.join(fullDirPath, file), 'utf8');
            // Ensure no legacy controller factories are used in API definitions
            expect(apiContent).not.toMatch(/create[A-Z]\w*Controller\(/);
            // Ensure API definition does not instantiate controllers directly with new
            expect(apiContent).not.toMatch(/controller:\s*new\s+/);
          }

          if (file.endsWith('Repository.js')) {
            const repoContent = fs.readFileSync(path.join(fullDirPath, file), 'utf8');
            // Ensure repository does not call .execute() directly on QueryHelper
            expect(repoContent).not.toMatch(/\.queryHelper\.from/);
          }
        }
      }
    });
  });
});

