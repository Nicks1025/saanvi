const { verifyToken, requirePermission } = require('./authMiddleware');
const ApiContext = require('./apiContext');
const errorHandler = require('./errorHandler');

const trim = (value, expr = '/') => String(value).replace(new RegExp(`^${expr}*(.*?)${expr}*$`), '$1');

class ApiSchema {
  constructor(schemaDef) {
    if (!schemaDef || typeof schemaDef !== 'object') {
      throw new Error('ApiSchema Error: Invalid schema definition provided.');
    }
    this.name = schemaDef.name;
    this.url = trim(schemaDef.url);
    this.endpoints = schemaDef.endpoints || [];
  }

  register(app) {
    const prefix = '';
    console.log(`Registering endpoints for /${this.url}`);

    this.endpoints.forEach((endpoint) => {
      this._registerEndpoint(app, prefix, endpoint);
    });
  }

  _registerEndpoint(app, prefix, endpoint) {
    // 0. Startup Validation of Endpoint and Handler Definition
    if (!endpoint || !endpoint.path || !endpoint.verb) {
      throw new Error(`ApiSchema Startup Error: Endpoint in schema "${this.name}" is missing path or verb.`);
    }

    const ControllerClass = endpoint.handler?.controller;
    const method = endpoint.handler?.method;

    if (typeof ControllerClass !== 'function') {
      throw new Error(
        `ApiSchema Startup Error: Endpoint "${endpoint.verb} ${endpoint.path}" in "${this.name}" must reference a Controller class directly.`
      );
    }

    if (!method || typeof method !== 'string') {
      throw new Error(
        `ApiSchema Startup Error: Endpoint "${endpoint.verb} ${endpoint.path}" in "${this.name}" must specify a method name string.`
      );
    }

    if (typeof ControllerClass.prototype[method] !== 'function') {
      throw new Error(
        `ApiSchema Startup Error: Controller method "${method}" is not defined on ${ControllerClass.name || 'Controller'} prototype for endpoint "${endpoint.verb} ${endpoint.path}".`
      );
    }

    let path = trim(endpoint.path);
    let verb = endpoint.verb.toLowerCase();

    // Construct full URL
    const url = this.url ? `${prefix}/${this.url}/${path}` : `${prefix}/${path}`;
    const finalUrl = url.replace(/\/$/, '');

    const routeArguments = [finalUrl];

    // Audit Message Middleware
    if (endpoint.auditMessage) {
      routeArguments.push((req, res, next) => {
        req.auditMessage = endpoint.auditMessage;
        next();
      });
    }

    // 1. Auth and Permissions Middleware
    if (endpoint.middleware) {
      if (endpoint.middleware.requirePermission) {
        routeArguments.push(verifyToken);
        for (const perm of endpoint.middleware.requirePermission) {
          routeArguments.push(requirePermission(perm));
        }
      } else if (endpoint.middleware.requireAuth) {
        routeArguments.push(verifyToken);
      }

      if (endpoint.middleware.custom && Array.isArray(endpoint.middleware.custom)) {
        for (const customMiddleware of endpoint.middleware.custom) {
          routeArguments.push(customMiddleware);
        }
      }
    }

    // 2. Joi Validation Middleware
    if (endpoint.request) {
      routeArguments.push((req, res, next) => {
        const stripBody = endpoint.request.stripUnknown === false ? false : true;
        if (endpoint.request.body) {
          const { error, value } = endpoint.request.body.validate(req.body, { abortEarly: false, stripUnknown: stripBody });
          if (error) {
            return res.status(400).json({
              success: false,
              data: null,
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Invalid request parameter',
                details: error.details.map((x) => x.message)
              }
            });
          }
          req.body = value;
        }
        if (endpoint.request.query) {
          const { error, value } = endpoint.request.query.validate(req.query, { abortEarly: false, stripUnknown: true });
          if (error) {
            return res.status(400).json({
              success: false,
              data: null,
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Invalid request parameter',
                details: error.details.map((x) => x.message)
              }
            });
          }
          Object.defineProperty(req, 'query', { value, writable: true, enumerable: true, configurable: true });
        }
        if (endpoint.request.params) {
          const { error, value } = endpoint.request.params.validate(req.params, { abortEarly: false, stripUnknown: true });
          if (error) {
            return res.status(400).json({
              success: false,
              data: null,
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Invalid request parameter',
                details: error.details.map((x) => x.message)
              }
            });
          }
          Object.defineProperty(req, 'params', { value, writable: true, enumerable: true, configurable: true });
        }
        next();
      });
    }

    // 3. Controller Handler with Request-Scoped ApiContext
    const handlerFn = async (req, res, next) => {
      try {
        const context = new ApiContext(req, res);
        const controller = new ControllerClass(context);

        await controller[method](req, res);
      } catch (error) {
        return errorHandler(error, req, res, next);
      }
    };
    routeArguments.push(handlerFn);

    // Register route on Express app
    app[verb].apply(app, routeArguments);
  }
}

module.exports = ApiSchema;
