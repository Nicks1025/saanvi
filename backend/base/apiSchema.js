const { verifyToken, requirePermission } = require('./authMiddleware');

const trim = (value, expr = '/') => String(value).replace(new RegExp(`^${expr}*(.*?)${expr}*$`), '$1');

class ApiSchema {
  constructor(schemaDef) {
    this.name = schemaDef.name;
    this.url = trim(schemaDef.url);
    this.endpoints = schemaDef.endpoints || [];
  }

  register(app) {
    const prefix = ''; // Define any global prefix if needed
    console.log(`Registering endpoints for /${this.url}`);
    
    this.endpoints.forEach((endpoint) => {
      this._registerEndpoint(app, prefix, endpoint);
    });
  }

  _registerEndpoint(app, prefix, endpoint) {
    let path = trim(endpoint.path);
    let verb = endpoint.verb.toLowerCase();

    // Construct full URL
    const url = this.url ? `${prefix}/${this.url}/${path}` : `${prefix}/${path}`;
    // Remove trailing slash if path was empty
    const finalUrl = url.replace(/\/$/, '');

    const routeArguments = [finalUrl];

    // Audit Message Middleware (mocked for future integration)
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
    }

    // 2. Joi Validation Middleware
    if (endpoint.request) {
      routeArguments.push((req, res, next) => {
        if (endpoint.request.body) {
          const { error, value } = endpoint.request.body.validate(req.body, { abortEarly: false, stripUnknown: true });
          if (error) {
            return res.status(400).json({ success: false, error: 'Validation Error', details: error.details.map(x => x.message) });
          }
          req.body = value;
        }
        if (endpoint.request.query) {
          const { error, value } = endpoint.request.query.validate(req.query, { abortEarly: false, stripUnknown: true });
          if (error) {
            return res.status(400).json({ success: false, error: 'Validation Error', details: error.details.map(x => x.message) });
          }
          req.query = value;
        }
        if (endpoint.request.params) {
          const { error, value } = endpoint.request.params.validate(req.params, { abortEarly: false, stripUnknown: true });
          if (error) {
            return res.status(400).json({ success: false, error: 'Validation Error', details: error.details.map(x => x.message) });
          }
          req.params = value;
        }
        next();
      });
    }

    // 3. Controller Handler
    const handlerFn = async (req, res, next) => {
      try {
        const controller = endpoint.handler.controller;
        const method = endpoint.handler.method;
        await controller[method](req, res);
      } catch (error) {
        next(error);
      }
    };
    routeArguments.push(handlerFn);

    // Register route on Express app
    app[verb].apply(app, routeArguments);
  }
}

module.exports = ApiSchema;
