---
inclusion: always
---

# Superwizard AI Development Standards

## Code Quality Standards

### TypeScript Guidelines
- Use strict TypeScript configuration with no implicit any
- Define explicit interfaces for all data structures
- Use proper error handling with typed exceptions
- Implement comprehensive JSDoc comments for public APIs

### React Component Standards
- Use functional components with hooks exclusively
- Implement proper prop validation with TypeScript interfaces
- Follow React best practices for state management
- Use proper cleanup in useEffect hooks

### Chrome Extension Best Practices
- Minimize permissions to only what's necessary
- Use proper message passing between contexts
- Implement proper error boundaries for content scripts
- Follow Chrome extension security guidelines

## Architecture Patterns

### State Management
- Use Zustand for global state with proper typing
- Implement persistence for user settings and preferences
- Use Immer for immutable state updates
- Separate business logic from UI components

### Error Handling
- Implement comprehensive error boundaries
- Use proper error classification (recoverable vs fatal)
- Provide user-friendly error messages
- Log errors appropriately for debugging

### API Integration
- Use unified gateway pattern for multiple providers
- Implement proper retry logic with exponential backoff
- Handle rate limiting gracefully
- Validate all API responses

## Security Requirements

### Data Protection
- Store all sensitive data in Chrome's secure storage
- Never transmit user data except to configured AI providers
- Implement proper API key encryption
- Use HTTPS for all external communications

### Permission Management
- Request minimal necessary permissions
- Provide clear explanations for permission requests
- Implement graceful degradation when permissions are denied
- Regular audit of permission usage

## Testing Standards

### Unit Testing
- Test all business logic functions
- Mock external dependencies properly
- Achieve minimum 80% code coverage
- Use descriptive test names and assertions

### Integration Testing
- Test Chrome extension message passing
- Validate API integrations with mock responses
- Test error scenarios and edge cases
- Verify cross-browser compatibility

## Documentation Requirements

### Code Documentation
- Document all public APIs with JSDoc
- Include usage examples in documentation
- Maintain up-to-date README files
- Document architectural decisions

### Specification Maintenance
- Keep specs synchronized with implementation
- Update specs when requirements change
- Document breaking changes and migration paths
- Maintain version history in specs

## Performance Guidelines

### Optimization Targets
- Page load impact < 100ms
- Memory usage < 50MB baseline
- API response handling < 2 seconds
- DOM manipulation batching for efficiency

### Monitoring
- Track extension performance metrics
- Monitor API usage and costs
- Log performance bottlenecks
- Regular performance audits

## Development Workflow

### Git Practices
- Use conventional commit messages
- Create feature branches for all changes
- Require code review for all changes
- Maintain clean commit history

### Release Process
- Version all releases semantically
- Maintain comprehensive changelog
- Test all releases in staging environment
- Document breaking changes clearly

These standards ensure consistent, high-quality development across all Superwizard AI components while maintaining security, performance, and maintainability.