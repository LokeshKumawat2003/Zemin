# Frontend component structure

This project uses a practical admin-dashboard structure to keep code easy to extend over time.

## Main folders

- src/api: API wrappers and endpoint helpers.
- src/components/layout: shared layout pieces like sidebar and topbar.
- src/components/ui: reusable UI building blocks such as pagination and cards.
- src/components/dashboard: legacy dashboard-specific components kept for compatibility.
- src/pages: route-level pages and page containers.
- src/routes: router guards and route configuration.

## Conventions

- Pages should focus on business logic and page data loading.
- Reusable widgets should live under the component folders and not be duplicated across pages.
- Keep comments short and meaningful when a component needs context.
- Re-export common UI pieces through an index file when the project grows.

## Example

Use layout components for shell-level navigation and UI components for smaller repeated modules.
