# Technology Stack

## Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 5.4+ with React plugin
- **Styling**: Tailwind CSS 3.4+ with PostCSS and Autoprefixer
- **UI Components**: Lucide React icons, Recharts for data visualization
- **State Management**: React hooks and context (no external state library)

## Backend & Infrastructure
- **Hosting**: Netlify with serverless functions
- **Database**: Supabase (PostgreSQL) with Row Level Security (RLS)
- **Functions**: Netlify Functions with esbuild bundler
- **Node Version**: 18+

## External APIs
- **Strava API**: OAuth authentication and activity data
- **OpenWeatherMap API**: Historical weather data enrichment
- **Supabase**: Database operations and authentication

## Development Tools
- **Linting**: ESLint 9+ with TypeScript support
- **Type Checking**: TypeScript 5.5+
- **Package Manager**: npm
- **Environment**: Node.js with ES modules

## Common Commands

### Development
```bash
npm run dev          # Start development server (port 12000)
npm run build        # Production build with env check
npm run build:skip-check  # Build without environment validation
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run check-env    # Validate environment variables
```

### Environment Setup
```bash
npm install          # Install dependencies
cp .env.example .env # Copy environment template
```

## Key Configuration Files
- `vite.config.ts`: Vite configuration with React plugin
- `tailwind.config.js`: Tailwind CSS configuration
- `netlify.toml`: Netlify deployment and function configuration
- `tsconfig.json`: TypeScript project references
- `package.json`: Dependencies and scripts