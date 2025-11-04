# Real-Time Task Manager

A modern, real-time task management application built with React, TypeScript, and SignalR. This application provides live updates across all connected clients, allowing teams to collaborate on tasks and notes in real-time.

## ✨ Features

### Core Functionality

- **Task Management**: Create, update, delete, and complete tasks
- **Notes System**: Add detailed notes to tasks for better context
- **Real-Time Updates**: Instant synchronization across all clients using SignalR WebSockets
- **Dashboard**: Overview with statistics, completion rates, and recent activity
- **Responsive Design**: Mobile-first approach with adaptive UI for all screen sizes

### Technical Features

- **Real-Time Communication**: SignalR hub for instant updates
- **Network Status Monitoring**: Automatic detection and handling of offline scenarios
- **Performance Monitoring**: Built-in performance tracking and optimization
- **Health Checks**: Backend connectivity monitoring
- **Error Tracking**: Comprehensive error handling and reporting
- **Material-UI Components**: Modern, accessible UI components
- **Type Safety**: Full TypeScript implementation

## 🚀 Tech Stack

### Frontend

- **React 19** - UI framework
- **TypeScript** - Type safety and better developer experience
- **Vite** - Fast build tool and development server
- **Material-UI (MUI)** - Component library
- **Emotion** - CSS-in-JS styling
- **Axios** - HTTP client
- **SignalR Client** - Real-time communication

### Development Tools

- **ESLint** - Code linting
- **TypeScript ESLint** - TypeScript-specific linting rules
- **Vite** - Build tool with HMR (Hot Module Replacement)

## 📋 Prerequisites

- **Node.js** 18.x or higher
- **npm** or **yarn** package manager
- **Backend API** running (default: `https://localhost:44355`)

## 🛠️ Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd real-time-task-manager
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment** (optional)

   Create a `.env` file in the root directory if you need to customize the SignalR hub URL:

   ```env
   VITE_SIGNALR_HUB_URL=https://localhost:44355/taskManagerHub
   ```

4. **Ensure backend is running**

   The application expects a backend API at `https://localhost:44355` by default. Make sure your backend server is running before starting the frontend.

## 🏃 Running the Application

### Development Mode

```bash
npm run dev
```

The application will start at `http://localhost:5173` (default Vite port)

### Build for Production

```bash
npm run build
```

Optimized production build will be created in the `dist` folder.

### Preview Production Build

```bash
npm run preview
```

Preview the production build locally.

## 📜 Available Scripts

| Script                   | Description                                |
| ------------------------ | ------------------------------------------ |
| `npm run dev`            | Start development server with HMR          |
| `npm run build`          | Build for production                       |
| `npm run build:prod`     | Build with production environment variable |
| `npm run preview`        | Preview production build                   |
| `npm run lint`           | Run ESLint on the codebase                 |
| `npm run lint:fix`       | Auto-fix ESLint issues                     |
| `npm run type-check`     | Run TypeScript type checking               |
| `npm run analyze`        | Analyze bundle size                        |
| `npm run docker:build`   | Build Docker image                         |
| `npm run docker:run`     | Run Docker container                       |
| `npm run security:audit` | Run security audit                         |
| `npm run security:fix`   | Auto-fix security vulnerabilities          |

## 🏗️ Project Structure

```
real-time-task-manager/
├── public/                    # Static assets
├── src/
│   ├── components/           # React components
│   │   ├── Dashboard.tsx     # Main dashboard view
│   │   ├── Tasks.tsx         # Task management component
│   │   ├── Notes.tsx         # Notes management component
│   │   ├── SignalRStatus.tsx # Connection status indicator
│   │   ├── HealthCheck.tsx   # Backend health monitoring
│   │   └── ErrorBoundary.tsx # Error boundary wrapper
│   ├── contexts/             # React contexts
│   │   ├── SignalRContext.tsx # SignalR connection management
│   │   └── ToastContext.tsx   # Toast notification system
│   ├── hooks/                # Custom React hooks
│   │   └── useNetworkStatus.ts # Network connectivity hook
│   ├── services/             # API and service layer
│   │   ├── api.ts            # REST API client
│   │   └── signalr.ts        # SignalR service
│   ├── types/                # TypeScript type definitions
│   │   └── index.ts          # Shared types and interfaces
│   ├── utils/                # Utility functions
│   │   ├── errorTracking.ts  # Error tracking utilities
│   │   └── performance.ts    # Performance monitoring
│   ├── App.tsx               # Main application component
│   ├── main.tsx              # Application entry point
│   └── App.css               # Global styles
├── index.html                # HTML template
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── vite.config.ts            # Vite configuration
└── README.md                 # This file
```

## 🔧 Configuration

### Vite Proxy Configuration

The application is configured to proxy API requests to the backend server:

```typescript
// vite.config.ts
server: {
  proxy: {
    '/api': {
      target: 'https://localhost:44355',
      changeOrigin: true,
      secure: false,
      ws: true, // WebSocket support for SignalR
    },
  },
}
```

### SignalR Configuration

SignalR connection is configured with:

- **WebSocket transport** for optimal performance
- **Automatic reconnection** with exponential backoff
- **Connection state management** through React Context
- **Event-driven architecture** for real-time updates

## 🌐 API Integration

The application connects to a backend API with the following endpoints:

### Tasks

- `GET /api/tasks` - Fetch all tasks
- `POST /api/tasks` - Create a new task
- `PUT /api/tasks/{id}` - Update a task
- `DELETE /api/tasks/{id}` - Delete a task
- `PATCH /api/tasks/{id}/complete` - Toggle task completion

### Notes

- `GET /api/notes` - Fetch all notes
- `GET /api/notes/task/{taskId}` - Fetch notes for a specific task
- `POST /api/notes` - Create a new note
- `PUT /api/notes/{id}` - Update a note
- `DELETE /api/notes/{id}` - Delete a note

### Dashboard

- `GET /api/dashboard` - Fetch dashboard statistics and activities

### Health Check

- `GET /api/health` - Backend health status

## 🔄 Real-Time Events

The application listens for the following SignalR events:

### Task Events

- `TaskCreated` - New task created
- `TaskUpdated` - Task details updated
- `TaskDeleted` - Task deleted
- `TaskCompletionChanged` - Task completion status changed

### Note Events

- `NoteAdded` - New note added to a task
- `NoteUpdated` - Note content updated
- `NoteDeleted` - Note deleted

### Activity Events

- `ActivityUpdate` - New activity logged in the system

## 🎨 UI/UX Features

- **Material Design**: Following Material-UI design principles
- **Responsive Layout**: Adapts to mobile, tablet, and desktop screens
- **Dark Sidebar**: Gradient purple sidebar for navigation
- **Toast Notifications**: Non-intrusive feedback system
- **Loading States**: Skeleton loaders for better perceived performance
- **Error Handling**: User-friendly error messages
- **Offline Support**: Graceful degradation when network is unavailable

## 🐳 Docker Support

Build and run the application using Docker:

```bash
# Build Docker image
npm run docker:build

# Run container
npm run docker:run
```

The containerized app will be available at `http://localhost:3000`

## 🔒 Security

- **Audit Dependencies**: Regular security audits using `npm audit`
- **HTTPS**: Configured for secure connections
- **CORS**: Proper CORS headers in Vite proxy
- **Environment Variables**: Sensitive data stored in environment variables

Run security checks:

```bash
npm run security:audit
npm run security:fix
```

## 🧪 Development Guidelines

### Code Style

- Follow ESLint rules configured in the project
- Use TypeScript for type safety
- Follow React best practices and hooks guidelines
- Use functional components with hooks

### Component Structure

- Keep components small and focused
- Use custom hooks for reusable logic
- Separate business logic from presentation
- Implement proper error boundaries

### State Management

- Use React Context for global state (SignalR, Toasts)
- Local state with `useState` for component-specific data
- Proper cleanup in `useEffect` hooks

## 🐛 Troubleshooting

### SignalR Connection Issues

1. Ensure backend server is running at the configured URL
2. Check browser console for connection errors
3. Verify WebSocket support in your browser
4. Check firewall/proxy settings

### Build Errors

1. Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
2. Clear Vite cache: `rm -rf node_modules/.vite`
3. Check Node.js version compatibility

### CORS Errors

1. Verify backend CORS configuration
2. Check Vite proxy settings in `vite.config.ts`
3. Ensure backend is accessible from the frontend

## 📈 Performance

- **Code Splitting**: Automatic route-based code splitting with Vite
- **Lazy Loading**: Components loaded on demand
- **Performance Monitoring**: Built-in performance tracking
- **Bundle Analysis**: Use `npm run analyze` to check bundle size

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/your-feature`
5. Submit a pull request

## 📝 License

This project is private and proprietary.

## 👥 Authors

- Your Name / Team Name

## 🙏 Acknowledgments

- Material-UI for the component library
- Microsoft SignalR for real-time communication
- Vite team for the amazing build tool
- React team for the UI framework

---

**Note**: This is a frontend application that requires a backend API to function properly. Make sure to set up and configure the backend server before running this application.
