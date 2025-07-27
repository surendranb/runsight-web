# Development Guidelines

## Code Quality Standards
- **TypeScript**: All code must be fully typed with strict TypeScript configuration
- **ESLint**: Follow ESLint rules with TypeScript support
- **Component Structure**: Use functional components with hooks, avoid class components
- **Error Handling**: Implement comprehensive error handling with user-friendly messages
- **Testing**: Write unit tests for utility functions and critical business logic

## Security Best Practices
- **Zero Frontend Credentials**: All API keys and secrets must be server-side only
- **Row Level Security**: All database queries must respect RLS policies
- **Input Validation**: Validate all user inputs and API responses
- **Error Messages**: Never expose sensitive information in error messages

## Performance Guidelines
- **Outlier Detection**: Use outlier detection to filter unrealistic data points
- **Data Filtering**: Implement efficient data filtering for large datasets
- **Lazy Loading**: Use React.lazy for code splitting where appropriate
- **Memoization**: Use useMemo and useCallback for expensive calculations

## UI/UX Standards
- **Responsive Design**: All components must work on mobile, tablet, and desktop
- **Loading States**: Provide clear loading indicators for async operations
- **Error States**: Show user-friendly error messages with recovery options
- **Accessibility**: Follow WCAG guidelines for accessibility compliance

## API Integration Patterns
- **Progress Tracking**: Provide real-time progress updates for long-running operations
- **Rate Limiting**: Respect API rate limits with proper backoff strategies
- **Error Recovery**: Implement retry logic with exponential backoff
- **Data Validation**: Validate all API responses before processing

## Database Patterns
- **RLS First**: Always implement Row Level Security for user data
- **Migration Safety**: Write reversible migrations with proper rollback procedures
- **Indexing**: Add appropriate indexes for query performance
- **Data Integrity**: Use constraints and validation at the database level

## Debugging and Monitoring
- **Debug Console**: Use the built-in debug console (Ctrl+Shift+D) for development
- **Comprehensive Logging**: Log important events with appropriate log levels
- **Error Tracking**: Categorize and track errors for better debugging
- **Performance Monitoring**: Monitor sync performance and data processing times