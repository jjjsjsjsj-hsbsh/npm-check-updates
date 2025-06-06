import path from 'path'
import spawn from 'spawn-please'
import keyValueBy from '../lib/keyValueBy'
import { Index } from '../types/IndexType'
import { NpmOptions } from '../types/NpmOptions'
import { Options } from '../types/Options'
import { SpawnPleaseOptions } from '../types/SpawnPleaseOptions'

/** Spawn bun. */
async function spawnBun(
  args: string | string[],
  npmOptions: NpmOptions = {},
  spawnPleaseOptions: SpawnPleaseOptions = {},
  spawnOptions: Index<any> = {},
): Promise<{ stdout: string; stderr: string }> {
  const fullArgs = [
    ...(npmOptions.global ? ['--global'] : []),
    ...(npmOptions.prefix ? [`--prefix=${npmOptions.prefix}`] : []),
    ...(Array.isArray(args) ? args : [args]),
  ]

  return spawn('bun', fullArgs, spawnPleaseOptions, spawnOptions)
}

/** Returns the global directory of bun. */
export const defaultPrefix = async (options: Options): Promise<string | undefined> =>
  options.global
    ? options.prefix || process.env.BUN_INSTALL || path.dirname((await spawn('bun', ['pm', '-g', 'bin'])).stdout)
    : undefined

/**
 * (Bun) Fetches the list of all installed packages.
 */
export const list = async (options: Options = {}): Promise<Index<string | undefined>> => {
  const { default: stripAnsi } = await import('strip-ansi')

  // bun pm ls
  const { stdout } = await spawnBun(
    ['pm', 'ls'],
    {
      ...(options.global ? { global: true } : null),
      ...(options.prefix ? { prefix: options.prefix } : null),
    },
    {
      rejectOnError: false,
    },
    {
      env: {
        ...process.env,
        // Disable color to ensure the output is parsed correctly.
        // However, this may be ineffective in some environments (see stripAnsi below).
        // https://bun.sh/docs/runtime/configuration#environment-variables
        NO_COLOR: '1',
      },
      ...(options.cwd ? { cwd: options.cwd } : null),
    },
  )

  // Parse the output of `bun pm ls` into an object { [name]: version }.
  // When bun is spawned in the GitHub Actions environment, it outputs ANSI color. Unfortunately, it does not respect the `NO_COLOR` envirionment variable. Therefore, we have to manually strip ansi.
  const lines = stripAnsi(stdout).split('\n')
  const dependencies = keyValueBy(lines, line => {
    // The capturing group for the package name requires a + quantifier, otherwise namespaced packages like @angular/cli will not be captured correctly.
    const match = line.match(/.* (.+?)@(.+)/)
    if (match) {
      const [, name, version] = match
      return { [name]: version }
    }
    return null
  })

  return dependencies
}

export {
  distTag,
  getEngines,
  getPeerDependencies,
  greatest,
  latest,
  minor,
  newest,
  packageAuthorChanged,
  patch,
  semver,
} from './npm'

export default spawnBun
