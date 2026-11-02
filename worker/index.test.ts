import { describe, expect, it } from 'vitest'

describe('dashboard data contracts', () => {
  it('keeps the safety boundary explicit in the public product copy', async () => {
    const copy = await import('../src/i18n')
    expect(copy.copy.es.disclaimer).toMatch(/No constituye una autorización/)
    expect(copy.copy.en.disclaimer).toMatch(/not a loading authorization/)
  })
  it('provides both interface languages', async () => {
    const copy = await import('../src/i18n')
    expect(Object.keys(copy.copy)).toEqual(['es', 'en'])
    expect(copy.weatherText.rain.es).toBe('Lluvia')
    expect(copy.weatherText.rain.en).toBe('Rain')
  })
})
