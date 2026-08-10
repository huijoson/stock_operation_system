import path from 'path'

export type RustIndicatorsMode = 'auto' | 'native-only' | 'ts-only'

export type NativeAddonLoadResult =
  | { available: true; addon: unknown }
  | { available: false; reason: string }

export function getRustIndicatorsMode(): RustIndicatorsMode {
  const mode = process.env.RUST_INDICATORS_MODE

  if (mode === 'native-only' || mode === 'ts-only') {
    return mode
  }

  return 'auto'
}

export function getRustIndicatorsNativePath(): string {
  return path.resolve(__dirname, '../../../../rust/technical-indicators-node')
}

export function loadRustIndicatorsNative(
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- dynamic require of native addon
  loader: (targetPath: string) => unknown = (targetPath) => require(targetPath)
): NativeAddonLoadResult {
  const mode = getRustIndicatorsMode()

  if (mode === 'ts-only') {
    return { available: false, reason: 'ts-only mode' }
  }

  try {
    return {
      available: true,
      addon: loader(getRustIndicatorsNativePath()),
    }
  } catch (error) {
    if (mode === 'native-only') {
      throw error
    }

    return {
      available: false,
      reason: error instanceof Error ? error.message : 'native addon unavailable',
    }
  }
}
