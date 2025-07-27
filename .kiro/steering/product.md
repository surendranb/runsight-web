# Product Overview

RunSight Web is a mature, open-source running analytics application that provides comprehensive insights about running performance by integrating with Strava and OpenWeatherMap APIs.

## Core Features
- **Strava Integration**: Secure OAuth authentication and robust automatic run data synchronization with real-time progress tracking
- **Weather Analytics**: Historical weather conditions enrichment for each run via OpenWeatherMap API
- **Modern Dashboard**: Interactive KPI cards, pace trend charts, activity timeline, and performance insights with outlier detection
- **Advanced Insights Engine**: 10+ specialized analytics including:
  - Consistency tracking and performance trends
  - Elevation effort analysis and correlation
  - Weather performance correlation (temperature, humidity, wind)
  - Time-of-day performance patterns
  - Workout type performance comparisons
  - Personal records tracking
  - Location intelligence and route analysis
  - Advanced performance metrics
- **Goals System**: Database-ready goal tracking system (UI in development)
- **AI Coach Integration**: AI-powered insights and coaching recommendations
- **Security-First**: Row-level security with user-scoped data access and secure serverless architecture
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices with modern UI/UX
- **Debug Tools**: Built-in debug console and comprehensive error handling

## Target Users
- Recreational and competitive runners who use Strava
- Data-driven athletes seeking deeper insights into their performance
- Users interested in understanding how weather conditions affect their running
- Runners who want to track goals and receive AI-powered coaching insights

## Deployment Model
- One-click deployment to Netlify + Supabase
- Serverless architecture with Netlify Functions
- PostgreSQL database with Supabase backend
- Zero frontend credential exposure (all API keys server-side)
- Production-ready with comprehensive error handling and logging

## Current Status
- **Production Ready**: Fully functional application with comprehensive features
- **Open Source Ready**: Clean codebase with proper documentation
- **Extensible**: Well-architected for future enhancements