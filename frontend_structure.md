# Frontend Structure and Guidelines

## Core Principles
The frontend follows a feature-based architecture with strict separation between routing/permissions (pages) and business logic (features).

## Directory Structure
```text
frontend/
└── src/
    ├── pages/          # Routing, RBAC, store/head registration
    │   └── admin/      # Example: Admin pages
    ├── features/       # Actual code and heavy logic (mirrors pages structure)
    │   └── [feature]/
    │       ├── service/ # Contains all API call functions
    │       └── [Feature].jsx
    └── components/     # Large and reusable UI components
        └── common/     # Highly reusable building blocks
```

## 1. Pages (`/src/pages`)
- **Responsibility**: Route definition, RBAC (Role-Based Access Control), store registration, and head (meta tags) management.
- **Rule**: Pages **MUST NOT** include heavy actual code. They should only import and render components from the `features` directory.
- **Routing**: Routing is file/folder-based.
- **RBAC**: Permissions map directly to the folder structure. Users must possess the exact permission string to access a route.
  - *Example*: A route structured as `admin/feature/games/truth&dare` requires the exact permission string `admin.feature.games.truthanddare`.

## 2. Features (`/src/features`)
- **Responsibility**: Contains the actual business logic, API calls, state management logic, and heavy UI components.
- **Structure**: Mirrors the exact folder structure of `pages` to maintain predictability.
- **API Calls**: React components MUST NOT call APIs directly using `fetch` or `axios` inline. All API calls must be abstracted into a `service/` folder within the feature (e.g., `features/login/service/loginService.js`).

## 3. Components (`/src/components`)
- **Responsibility**: Houses larger, composite components used across different features.
- **Common Components (`/src/components/common`)**: Contains foundational, highly reusable UI elements.

### Standard Common Components API
- `s-data-table`
  - **Props**: `columns`, `data`, `pagination` (which includes `sortColu`, `sortOrder`, `no of pages to display`)
- `s-button`
  - **Props**: `size` (`xs`, `s`, `m`, `xl`), `color`, `text`, `label`
- `s-text-field`
  - **Props**: `text`, `label`, `placeholder`, `width`
