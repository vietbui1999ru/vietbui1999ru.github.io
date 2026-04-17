import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// ---------------------------------------------------------------------------
// We test the keyboard + media-query logic extracted as a pure hook,
// not the Leva render itself (Leva is a UI lib we trust).
// ---------------------------------------------------------------------------
import { useLevaPanelVisibility } from '@/scenes/ui/LevaPanel'

// Mock matchMedia
function mockMatchMedia(mobileMatch: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn((query: string) => ({
      matches: query.includes('max-width') ? mobileMatch : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

describe('useLevaPanelVisibility', () => {
  beforeEach(() => {
    mockMatchMedia(false) // desktop by default
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('starts visible on desktop (viewport >= 768px)', () => {
    mockMatchMedia(false)
    const { result } = renderHook(() => useLevaPanelVisibility())
    expect(result.current.hidden).toBe(false)
  })

  it('starts hidden on mobile (viewport < 768px)', () => {
    mockMatchMedia(true)
    const { result } = renderHook(() => useLevaPanelVisibility())
    expect(result.current.hidden).toBe(true)
  })

  it('keyboard L toggles visibility on desktop', () => {
    mockMatchMedia(false)
    const { result } = renderHook(() => useLevaPanelVisibility())
    expect(result.current.hidden).toBe(false)

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'l' }))
    })
    expect(result.current.hidden).toBe(true)

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'l' }))
    })
    expect(result.current.hidden).toBe(false)
  })

  it('uppercase L also toggles', () => {
    mockMatchMedia(false)
    const { result } = renderHook(() => useLevaPanelVisibility())
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'L' }))
    })
    expect(result.current.hidden).toBe(true)
  })

  it('keyboard L does not toggle when on mobile (stays hidden)', () => {
    mockMatchMedia(true)
    const { result } = renderHook(() => useLevaPanelVisibility())
    expect(result.current.hidden).toBe(true)
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'l' }))
    })
    // Mobile: L key has no effect — panel stays hidden
    expect(result.current.hidden).toBe(true)
  })
})
