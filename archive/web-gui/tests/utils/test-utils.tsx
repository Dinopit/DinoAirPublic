import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'

interface AllTheProvidersProps {
  children: React.ReactNode
}

// Add providers as needed (e.g., theme providers, context providers)
const AllTheProviders = ({ children }: AllTheProvidersProps) => {
  return (
    <>
      {children}
    </>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options })

// Re-export everything
export * from '@testing-library/react'

// Override render method
export { customRender as render }