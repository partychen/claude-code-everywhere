# Project Overview

This is a Claude Code integration system that enables Claude AI capabilities everywhere through a Node.js backend with web management interface. The system provides authentication, preview functionality, and Teams integration capabilities.

# Architecture

- `/server`: Node.js backend API with JWT authentication
- `/web`: Web management UI (vanilla JS/HTML/CSS)
- `/docs`: Documentation (usage, security, preview setup)
- `/tests`: Test suite for validation
- `/scripts`: Utility scripts for deployment and setup

Do not change project structure without discussion.

# Coding Rules

- Keep code simple and maintainable - run code-simplifier before every push
- Prefer explicit and descriptive function names
- Avoid over-abstraction and unnecessary complexity
- No magic numbers or hardcoded values - use configuration
- Always handle errors gracefully
- Minimize dependencies - keep the codebase lightweight

# AI Behavior Rules

- Do not refactor unrelated code
- Do not change public APIs unless explicitly requested
- Do not reformat existing code style
- Only modify code necessary for the task
- Ask before making structural changes
- **Always run tests before marking tasks complete**
- **Always run code-simplifier before pushing code**

# Tech Constraints

- Keep the stack minimal: Node.js backend + vanilla frontend
- Do not introduce heavy frameworks or unnecessary dependencies
- Do not add databases unless absolutely required
- Do not introduce Redis, MQ, or complex infrastructure
- Preserve JWT-based authentication system

# Conventions

- Configuration via environment variables or config files
- Security-first approach: follow [docs/SECURITY.md](docs/SECURITY.md)
- API endpoints follow RESTful conventions
- Error responses include clear messages
- Log important events for debugging

# Testing Requirements

- Run tests in `/tests` directory before completing tasks
- Ensure all tests pass before marking work as done
- Add tests for new functionality when appropriate
- Refer to [tests/README.md](tests/README.md) for test documentation

# Change Policy

- Minimal diff - only change what's necessary
- Keep the codebase clean and tidy
- Do not rename files unless necessary
- Remove unused code completely (no commented-out code)
- Run code-simplifier to refine code before every push
- Document breaking changes in commit messages

# Documentation

- Update relevant docs when changing functionality
- Keep README.md current with setup instructions
- Document new features in [docs/USAGE.md](docs/USAGE.md)
- Security changes must be reflected in [docs/SECURITY.md](docs/SECURITY.md)
