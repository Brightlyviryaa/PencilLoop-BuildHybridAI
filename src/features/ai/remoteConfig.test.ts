import { describe, expect, it } from 'vitest'
import { RC_DEFAULTS, RC_KEYS, parseCloudConfig } from './remoteConfig'
import template from '../../../remoteconfig.template.json'

describe('parseCloudConfig', () => {
  it('uses defaults for empty values', () => {
    expect(parseCloudConfig({})).toEqual(RC_DEFAULTS)
    expect(parseCloudConfig({ enabled: '', model: '', hintTemperature: '', scanTemperature: '' })).toEqual(RC_DEFAULTS)
  })

  it('reads valid remote values', () => {
    expect(parseCloudConfig({ enabled: 'false', model: 'gemini-3.5-flash', hintTemperature: '0.3', scanTemperature: '0' })).toEqual({
      enabled: false,
      model: 'gemini-3.5-flash',
      hintTemperature: 0.3,
      scanTemperature: 0,
    })
  })

  it('rejects unexpected model names and clamps temperatures', () => {
    const c = parseCloudConfig({ model: 'https://evil.example/model', hintTemperature: '9', scanTemperature: '-1' })
    expect(c.model).toBe(RC_DEFAULTS.model)
    expect(c.hintTemperature).toBe(1.2)
    expect(c.scanTemperature).toBe(0)
    expect(parseCloudConfig({ hintTemperature: 'abc' }).hintTemperature).toBe(RC_DEFAULTS.hintTemperature)
  })

  it('treats only explicit off values as disabled', () => {
    for (const v of ['false', 'FALSE', '0', 'off', 'no']) expect(parseCloudConfig({ enabled: v }).enabled).toBe(false)
    for (const v of ['true', '1', 'yes']) expect(parseCloudConfig({ enabled: v }).enabled).toBe(true)
  })

  it('matches the deployable template', () => {
    expect(Object.keys(template.parameters).sort()).toEqual(Object.values(RC_KEYS).sort())
    const p = template.parameters
    expect(
      parseCloudConfig({
        enabled: p.ai_cloud_enabled.defaultValue.value,
        model: p.ai_cloud_model.defaultValue.value,
        hintTemperature: p.ai_hint_temperature.defaultValue.value,
        scanTemperature: p.ai_scan_temperature.defaultValue.value,
      }),
    ).toEqual({ ...RC_DEFAULTS, model: p.ai_cloud_model.defaultValue.value })
  })
})
