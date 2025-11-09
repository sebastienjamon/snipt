# Example Snippet - Ready to Copy/Paste

Use this complete example to test your Snipt app!

---

## Snippet 1: Salesforce Production Deployment

### Title
```
Salesforce Production Deploy with JWT Authentication
```

### Description
```
Complete workflow for deploying Apex code to Salesforce production environment using JWT bearer flow authentication. This is the tested and approved method for our CI/CD pipeline.
```

### Code
```bash
# Step 1: Authenticate using JWT
sf org login jwt \
  --username prod@company.com \
  --jwt-key-file ~/.salesforce/jwt/production.key \
  --client-id 3MVG9fTLmJ60ch.sample_client_id_here \
  --instance-url https://login.salesforce.com

# Step 2: Deploy with tests
sf project deploy start \
  --source-dir force-app \
  --target-org prod@company.com \
  --test-level RunLocalTests \
  --wait 30

# Step 3: Verify deployment
sf project deploy report --target-org prod@company.com
```

### Language
```
bash
```

### Category
```
deployment
```

### Tags (add these one by one)
```
salesforce
deploy
production
jwt
authentication
ci-cd
```

### Context

**When to use:**
```
Use this for all production deployments through CI/CD pipelines or manual deployments. Required for any code changes going to production.
```

**Common mistakes (add these one by one):**
```
Don't use force:source:deploy - it's deprecated and will fail
```
```
Don't forget the .production suffix in the username
```
```
Don't use relative paths for JWT key - always use absolute path like ~/.salesforce/jwt/
```
```
Don't skip RunLocalTests in production - it's required and prevents bad deployments
```

**Prerequisites (add these one by one):**
```
JWT key file must exist at ~/.salesforce/jwt/production.key
```
```
Connected App must be configured in Salesforce with OAuth settings
```
```
User must have API Enabled and Modify All Data permissions
```
```
Salesforce CLI (sf) version 2.0+ must be installed
```

---

## Snippet 2: Docker Compose for Next.js Development

### Title
```
Docker Compose Setup for Next.js with PostgreSQL
```

### Description
```
Production-ready Docker Compose configuration for Next.js app with PostgreSQL database, Redis cache, and nginx reverse proxy.
```

### Code
```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/myapp
      - REDIS_URL=redis://redis:6379
      - NODE_ENV=production
    depends_on:
      - db
      - redis
    volumes:
      - .:/app
      - /app/node_modules
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=myapp
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

### Language
```
yaml
```

### Category
```
infrastructure
```

### Tags
```
docker
docker-compose
nextjs
postgresql
redis
nginx
devops
```

### Context

**When to use:**
```
Use this for local development environment or production deployment with Docker. Perfect for team consistency and easy onboarding.
```

**Common mistakes:**
```
Don't expose database ports in production - remove the ports section for db service
```
```
Don't use default passwords - always override with environment variables
```
```
Don't forget to add .dockerignore file to exclude node_modules and .next
```

**Prerequisites:**
```
Docker Desktop or Docker Engine installed (version 20.10+)
```
```
Docker Compose V2 installed (comes with Docker Desktop)
```
```
At least 4GB RAM allocated to Docker
```

---

## Snippet 3: React Custom Hook for API Calls

### Title
```
useAPI Hook - Type-safe API calls with React Query
```

### Description
```
Reusable React hook for making type-safe API calls with automatic caching, error handling, and loading states using React Query.
```

### Code
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

interface UseAPIOptions<T> {
  queryKey: string[]
  url: string
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  enabled?: boolean
  onSuccess?: (data: T) => void
  onError?: (error: Error) => void
}

export function useAPI<T>({
  queryKey,
  url,
  method = 'GET',
  body,
  enabled = true,
  onSuccess,
  onError,
}: UseAPIOptions<T>) {
  const queryClient = useQueryClient()

  // For GET requests, use useQuery
  if (method === 'GET') {
    return useQuery<T>({
      queryKey,
      queryFn: async () => {
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(`API error: ${response.statusText}`)
        }
        return response.json()
      },
      enabled,
    })
  }

  // For mutations (POST, PATCH, DELETE), use useMutation
  return useMutation<T, Error, void>({
    mutationFn: async () => {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`)
      }

      return response.json()
    },
    onSuccess: (data) => {
      // Invalidate related queries to refetch
      queryClient.invalidateQueries({ queryKey })
      onSuccess?.(data)
    },
    onError,
  })
}

// Usage example:
// const { data, isLoading, error } = useAPI<User>({
//   queryKey: ['user', userId],
//   url: `/api/users/${userId}`,
// })
```

### Language
```
typescript
```

### Category
```
react
```

### Tags
```
react
typescript
react-query
hooks
api
custom-hook
```

### Context

**When to use:**
```
Use this hook whenever you need to fetch data from an API in React components. Replaces useState + useEffect patterns with better caching and error handling.
```

**Common mistakes:**
```
Don't forget to wrap your app in QueryClientProvider from React Query
```
```
Don't use this for non-API calls - only for HTTP requests
```
```
Don't hardcode API URLs - use environment variables or a config file
```

**Prerequisites:**
```
@tanstack/react-query must be installed (npm install @tanstack/react-query)
```
```
QueryClientProvider must wrap your app in _app.tsx or layout.tsx
```
```
TypeScript types should be defined for your API responses
```

---

## How to Use These Examples

1. **Copy the snippet you want** (Salesforce, Docker, or React Hook)
2. **Go to your app:** http://localhost:3000/dashboard/snippets/new
3. **Paste each field** from the example above
4. **Add tags one by one** by typing and pressing Enter or clicking "Add"
5. **Add context items one by one** for mistakes and prerequisites
6. **Click "Create Snippet"**

Each example demonstrates different features:
- **Snippet 1 (Salesforce):** Multi-step bash commands, deployment workflow
- **Snippet 2 (Docker):** YAML configuration, infrastructure
- **Snippet 3 (React):** TypeScript code, reusable patterns

Try creating all three to test the app! 🚀
