# Security Policy

## Secrets

Do not commit real API keys, database URLs, passwords, or tokens.

Use `.env` locally and deployment environment variables in production.

## If a secret is accidentally committed

1. Revoke or rotate the secret immediately.
2. Remove it from the repository.
3. Clean Git history if necessary.
4. Add the secret pattern to scanning/protection tools.

## Reporting Issues

Please open a GitHub issue for security concerns during early development.
