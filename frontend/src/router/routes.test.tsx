import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { router } from './routes'
import { AuthProvider } from '@/contexts/AuthContext'

const routesConfig = router.routes
const testAuthValue = {
  user: null,
  isGuest: true,
  logout: () => {},
}

function renderRoute(path: string) {
  const memoryRouter = createMemoryRouter(routesConfig, {
    initialEntries: [path],
  })
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider value={testAuthValue}>
        <RouterProvider router={memoryRouter} />
      </AuthProvider>
    </QueryClientProvider>,
  )
}

describe('router configuration', () => {
  it('has 6 main routes plus index redirect and wildcard', () => {
    const children = routesConfig[0].children
    expect(children).toBeDefined()
    expect(children!.length).toBe(8) // index + 6 pages + wildcard
  })

  it('renders MemoPage at /memo', async () => {
    renderRoute('/memo')
    expect(
      await screen.findByRole('heading', { name: /AI Smart Memo/i }),
    ).toBeInTheDocument()
  })

  it('redirects from / to /memo', async () => {
    renderRoute('/')
    expect(
      await screen.findByRole('heading', { name: /AI Smart Memo/i }),
    ).toBeInTheDocument()
  })

  it('redirects unknown paths to /memo', async () => {
    renderRoute('/random/unknown/path')
    expect(
      await screen.findByRole('heading', { name: /AI Smart Memo/i }),
    ).toBeInTheDocument()
  })

  it('renders ShareBoxPage at /sharebox', async () => {
    renderRoute('/sharebox')
    expect(
      await screen.findByRole('heading', { name: /ShareBox/i }),
    ).toBeInTheDocument()
  })
})
