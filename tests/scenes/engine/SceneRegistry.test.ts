import { describe, it, expect, beforeEach } from 'vitest'
import { SceneRegistry } from '@/scenes/engine/SceneRegistry'
import type { SimModule } from '@/scenes/engine/types'

function makeMockModule(id: string): SimModule {
  return {
    id: id as SimModule['id'],
    title: `Mock ${id}`,
    description: `Description of ${id}`,
    defaults: {},
    presets: {},
    schema: {},
    Scene: () => null,
    symmetryApplies: () => false,
  }
}

describe('SceneRegistry', () => {
  let registry: SceneRegistry

  beforeEach(() => {
    registry = new SceneRegistry()
  })

  it('register + get round-trip: returns the same module by id', () => {
    const mod = makeMockModule('singularity')
    registry.register(mod)
    expect(registry.get('singularity')).toBe(mod)
  })

  it('get returns undefined for unregistered id', () => {
    expect(registry.get('lorenz')).toBeUndefined()
  })

  it('list returns all registered modules in insertion order', () => {
    const m1 = makeMockModule('singularity')
    const m2 = makeMockModule('lorenz')
    registry.register(m1)
    registry.register(m2)
    const list = registry.list()
    expect(list).toHaveLength(2)
    expect(list[0]).toBe(m1)
    expect(list[1]).toBe(m2)
  })

  it('list returns empty array when nothing registered', () => {
    expect(registry.list()).toEqual([])
  })

  it('duplicate register with the same id throws', () => {
    const mod = makeMockModule('singularity')
    registry.register(mod)
    expect(() => registry.register(mod)).toThrowError(/already registered/)
  })

  it('duplicate register with same id but different object also throws', () => {
    registry.register(makeMockModule('singularity'))
    expect(() => registry.register(makeMockModule('singularity'))).toThrowError(/already registered/)
  })
})
