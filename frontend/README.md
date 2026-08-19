# Art Studio Management - Frontend

React + TypeScript SPA built with Vite.

## Tech Stack

- **Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Routing**: React Router v6
- **Forms**: React Hook Form + Zod
- **State Management**: Zustand
- **Data Fetching**: TanStack Query
- **Charts**: Recharts
- **Icons**: Lucide React

## Project Structure

```
src/
├── app/                 # App-level components
├── components/          # Reusable components
│   ├── ui/             # shadcn/ui components
│   ├── admin/          # Admin-specific components
│   ├── staff/          # Staff-specific components
│   └── shared/         # Shared components
├── pages/              # Page components
│   ├── admin/          # Admin portal pages
│   ├── staff/          # Staff portal pages
│   └── auth/           # Authentication pages
├── layouts/            # Layout components
├── hooks/              # Custom React hooks
├── services/           # API service layers
├── types/              # TypeScript type definitions
├── schemas/            # Zod validation schemas
├── lib/                # Library configurations
│   ├── zendbx.ts      # ZendBX client
│   ├── api.ts         # HTTP client
│   └── utils.ts       # Utility functions
├── stores/             # Zustand stores
├── utils/              # Utility functions
└── router/             # Routing configuration
```

## Installation

```bash
# Install dependencies
npm install

# Install shadcn/ui
npx shadcn-ui@latest init

# Install required components
npx shadcn-ui@latest add button input card table dialog form select toast tabs avatar badge calendar dropdown-menu separator switch tooltip
```

## Environment Variables

Create a `.env` file:

```env
VITE_API_URL=http://localhost:8000
VITE_ZENDBX_URL=your_zendbx_url
VITE_ZENDBX_ANON_KEY=your_zendbx_anon_key
```

## Development

```bash
# Start development server
npm run dev

# Type check
npm run type-check

# Lint
npm run lint

# Build for production
npm run build

# Preview production build
npm run preview
```

## Features

### Admin Portal (Desktop-First)
- Dashboard with real-time insights
- Student enrollment & management
- Batch configuration
- Attendance monitoring
- Compensation management
- Session tracking
- Fee collection
- Financial management (CapEX/OpEX)
- Reports & analytics
- Staff management
- Audit logs
- System settings

### Staff Portal (Mobile-First)
- Today's classes view
- Quick attendance marking
- Attendance history
- Profile management

## Design System

### Colors
- **Primary**: Soft Indigo (#6366F1)
- **Secondary**: Sage Green (#86B69C)
- **Accent**: Warm Peach (#F2B38D)
- **Background**: #FAFAF8

### Typography
- **Font Family**: Inter
- **Headings**: 600-700 weight
- **Body**: 400-500 weight

### Spacing
- Base unit: 4px (Tailwind default)
- Container padding: 2rem

## Code Conventions

- Use **TypeScript** for all files
- Use `.tsx` for React components
- Use `.ts` for utilities and services
- Use **functional components** with hooks
- Use **named exports** for components
- Use **default exports** for pages
- Prefer **const** over let
- Use **arrow functions**
- Avoid `any` type
- Use path aliases `@/` for imports

## Component Guidelines

### File Structure
```tsx
import statements
type/interface definitions
component definition
helper functions
export statement
```

### Component Template
```tsx
interface MyComponentProps {
  title: string
  onAction: () => void
}

export function MyComponent({ title, onAction }: MyComponentProps) {
  return (
    <div>
      {title}
      <button onClick={onAction}>Action</button>
    </div>
  )
}
```

## API Integration

All API calls go through the centralized API client:

```typescript
import { api } from '@/lib/api'

// GET request
const data = await api.get<Student[]>('/api/students')

// POST request
const result = await api.post<Student>('/api/students', studentData)

// PUT request
const updated = await api.put<Student>(`/api/students/${id}`, updates)

// DELETE request
await api.delete(`/api/students/${id}`)
```

## TanStack Query Usage

```typescript
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'

// Query
const { data, isLoading, error } = useQuery({
  queryKey: ['students'],
  queryFn: () => api.get<Student[]>('/api/students'),
})

// Mutation
const mutation = useMutation({
  mutationFn: (data: CreateStudentDTO) => 
    api.post<Student>('/api/students', data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['students'] })
  },
})
```

## Build for Production

```bash
# Build
npm run build

# Output directory: dist/

# Serve with any static file server
npx serve dist
```

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## License

Proprietary - Art Studio Management System
