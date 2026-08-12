# Backend Structure and Guidelines

## Core Principles
The backend follows a strict layered, class-based architecture to separate routing, validation, business logic, and database interactions.

## Directory Structure
```text
backend/
├── server.js              # Entry point of the application
├── common/                # Shared utilities and base classes
│   ├── baseController.js  # Base class for all controllers
│   ├── baseService.js     # Base class for all services
│   └── baseRepository.js  # Base class for all repositories
└── features/              # Feature-based modules
    └── [featureName]/
        ├── [featureName]api.js
        ├── [featureName]controller.js
        ├── [featureName]Service.js
        └── [featureName]Repository.js
```

## Layer Responsibilities

### 1. Entry Point (`server.js`)
- Acts as the starting point of the application (initializes server, middleware, route registration).

### 2. API Layer (`*api.js`)
- **Responsibility**: Defines all endpoints/routes for the specific feature.
- Receives the raw HTTP request and routes it to the appropriate Controller method.

### 3. Controller Layer (`*controller.js`)
- **Responsibility**: Input validation and orchestrating the request.
- Performs required validation on the incoming request payload.
- Extracts **only the strictly required parameters** and passes them to the Service layer (never passes the entire unparsed request object).
- Must be a class that inherits from `baseController.js`.

### 4. Service Layer (`*Service.js`)
- **Responsibility**: Core business logic, computations, and external service orchestration.
- Receives sanitized parameters from the Controller.
- Performs all computations, business rules, and data transformations.
- Calls the Repository layer for data persistence or retrieval.
- Must be a class that inherits from `baseService.js`.

### 5. Repository Layer (`*Repository.js`)
- **Responsibility**: Data access and database interactions.
- **STRICT RULE**: ALL SQL queries and database communication MUST reside strictly in this file. No SQL queries are allowed in the Controller or Service layers.
- Must be a class that inherits from `baseRepository.js`.

## Base Classes
All reusable or generic functions used across features must be abstracted into their respective base classes:
- `common/baseController.js`: Common validation logic, request parsing, or response formatting.
- `common/baseService.js`: Common business logic utilities and helpers.
- `common/baseRepository.js`: Common database query builders, connection handling, or execution wrappers.
