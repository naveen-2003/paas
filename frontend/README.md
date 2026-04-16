# Mini PaaS Frontend

A modern, responsive React + Vite frontend for the Mini PaaS platform-as-a-service system.

## Tech Stack

- **React 19** - UI framework
- **Vite** - Build tool (instant HMR)
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling
- **React Router** - Client-side routing
- **Zustand** - Lightweight state management
- **React Hook Form + Zod** - Form validation
- **Axios** - HTTP client
- **Headless UI** - Unstyled, accessible components
- **Lucide React** - Icon library

## Project Structure

```
src/
├── components/        # Reusable components
├── layouts/          # Layout components
├── pages/            # Page components
├── services/         # API service clients
├── stores/           # Zustand state stores
├── types/            # TypeScript type definitions
├── hooks/            # Custom React hooks
├── App.tsx           # Main app component with routing
├── main.tsx          # Entry point
└── index.css         # Global styles
```

## Getting Started

### Prerequisites

- Node.js 16+ and npm 7+

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

3. Update the `VITE_API_URL` to point to your backend API

### Development

Start the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build

Build for production:

```bash
npm run build
```

### Linting

Run ESLint:

```bash
npm run lint
```

### Preview

Preview the production build locally:

```bash
npm run preview
```

## Features

### ✅ Implemented

- **Authentication**
  - User registration and login
  - JWT token management
  - Protected routes
  - Automatic logout on token expiration

- **Dashboard**
  - Welcome page with app stats
  - Navigation layout

- **Applications**
  - List all applications
  - Search applications
  - View app status and deployments
  - Links to create new apps

- **UI Components**
  - Responsive navigation
  - Form validation
  - Error messages
  - Loading states

### 🚀 Coming Soon

- Application creation form
- Application detail view
- Deployment logs
- Provider management
- API key management
- Settings page

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API base URL | `http://localhost:3000/api` |

## API Integration

The frontend communicates with the backend API through the `apiClient` (Axios instance) located in `src/services/api.ts`.

**Features:**
- Automatic JWT token injection in request headers
- Automatic redirect to login on 401 responses
- Request timeout of 10 seconds
- Error handling

## Authentication Flow

1. User registers or logs in → `POST /api/auth/register` or `/api/auth/login`
2. Backend returns user data and JWT token
3. Token stored in `localStorage`
4. Token automatically added to all subsequent requests
5. On 401 response, user is logged out and redirected to login page

## Component Architecture

### Protected Route
Wraps protected pages. Redirects to login if no token.

### Main Layout
Provides navigation bar, user menu, and logout functionality.

### Page Components
- `LoginPage` - User login form
- `RegisterPage` - User registration form
- `DashboardPage` - Dashboard home with stats
- `AppsPage` - List of applications

## State Management

Uses Zustand for minimal state management:

- `useAuthStore` - Authentication state (user, token, login/register/logout)

Additional stores can be created for apps, providers, etc.

## Form Validation

Uses React Hook Form with Zod schemas:

```typescript
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
```

## Development Tips

- Hot Module Replacement (HMR) is enabled - changes reflect instantly
- Use Tailwind CSS classes for styling
- Add TypeScript types for all props and state
- Keep components small and focused
- Use custom hooks for reusable logic

## Troubleshooting

### API Connection Issues
- Ensure backend is running on the correct port
- Check `VITE_API_URL` env variable
- Check browser console for CORS errors

### Authentication Issues
- Clear localStorage and try again
- Check if token is being sent in request headers
- Verify JWT token format

### Build Issues
- Delete `node_modules` and `dist`
- Run `npm install` again
- Clear Vite cache: `rm -rf .vite`

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
