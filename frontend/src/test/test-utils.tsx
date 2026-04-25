import { render, type RenderOptions } from '@testing-library/react'
import { type ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialEntries?: string[]
}

/**
 * 라우터가 필요한 컴포넌트 테스트용 헬퍼
 *
 * 사용 예:
 *   renderWithRouter(<DemoSidebar />, { initialEntries: ['/memo'] })
 */
export function renderWithRouter(
  ui: ReactElement,
  options: CustomRenderOptions = {},
) {
  const { initialEntries = ['/'], ...renderOptions } = options

  return render(ui, {
    wrapper: ({ children }) => (
      <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
    ),
    ...renderOptions,
  })
}

// 일반 render도 함께 export
export { render, screen, fireEvent, waitFor } from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'
