#!/usr/bin/env node

const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

function parseArgs(argv) {
  const args = [...argv]
  const options = {
    command: 'dev',
    port: undefined,
    hostname: undefined,
    apiEndpoint: undefined,
    stripeKey: undefined,
    forceCopy: false,
    noCopy: false,
    passthrough: [],
  }

  if (args.length && !args[0].startsWith('-')) {
    options.command = args.shift()
  }

  while (args.length) {
    const arg = args.shift()
    if (arg === '--') {
      options.passthrough.push(...args)
      break
    }
    switch (arg) {
      case '-p':
      case '--port':
        options.port = args.shift()
        break
      case '--hostname':
        options.hostname = args.shift()
        break
      case '--api-endpoint':
        options.apiEndpoint = args.shift()
        break
      case '--stripe-key':
        options.stripeKey = args.shift()
        break
      case '--force-copy':
        options.forceCopy = true
        break
      case '--no-copy':
        options.noCopy = true
        break
      case '-h':
      case '--help':
        options.command = 'help'
        break
      default:
        options.passthrough.push(arg)
        break
    }
  }

  return options
}

function printHelp() {
  console.log(`Saaslib Admin Panel\n\nUsage:\n  saaslib-admin-panel <dev|build|start> [options]\n\nOptions:\n  --api-endpoint <url>   Set NEXT_PUBLIC_API_ENDPOINT\n  --stripe-key <key>     Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY\n  --port, -p <number>    Port to bind (dev/start)\n  --hostname <host>      Hostname to bind (dev/start)\n  --force-copy           Always refresh runtime folder (useful for local dev)\n  --no-copy              Run without updating runtime folder\n  --help, -h             Show help\n`)
}

async function main() {
  const options = parseArgs(process.argv.slice(2))

  if (options.command === 'help') {
    printHelp()
    process.exit(0)
  }

  const packageRoot = path.resolve(__dirname, '..')
  const resolvedPackageRoot = fs.realpathSync(packageRoot)
  const projectRoot = process.cwd()
  const runtimeDir = path.resolve(projectRoot, '.saaslib-admin-panel')
  const versionFile = path.join(runtimeDir, '.saaslib-version')
  const packageVersion = require(path.join(packageRoot, 'package.json')).version
  const isLocalPackage = !resolvedPackageRoot.includes(`${path.sep}node_modules${path.sep}`)

  const shouldCopy = () => {
    if (options.noCopy) return false
    if (options.forceCopy) return true
    if (options.command === 'dev' && isLocalPackage) return true
    if (!fs.existsSync(runtimeDir)) return true
    if (!fs.existsSync(versionFile)) return true
    try {
      const current = fs.readFileSync(versionFile, 'utf8').trim()
      return current !== packageVersion
    } catch {
      return true
    }
  }

  const copyDir = (src, dest) => {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true })
    }
    const entries = fs.readdirSync(src, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === 'dist' || entry.name === 'bin') {
        continue
      }
      const srcPath = path.join(src, entry.name)
      const destPath = path.join(dest, entry.name)
      if (entry.isDirectory()) {
        copyDir(srcPath, destPath)
      } else if (entry.isFile()) {
        fs.copyFileSync(srcPath, destPath)
      }
    }
  }

  if (shouldCopy()) {
    if (fs.existsSync(runtimeDir)) {
      fs.rmSync(runtimeDir, { recursive: true, force: true })
    }
    copyDir(packageRoot, runtimeDir)
    fs.writeFileSync(versionFile, packageVersion)
  }
  const nextBin = require.resolve('next/dist/bin/next', { paths: [projectRoot, runtimeDir, packageRoot] })

  const nextArgs = [options.command]
  if (options.command === 'dev' && !options.passthrough.some((arg) => arg === '--turbo' || arg === '--turbopack')) {
    nextArgs.push('--webpack')
  }
  if (options.hostname) {
    nextArgs.push('--hostname', options.hostname)
  }
  if (options.port) {
    nextArgs.push('--port', options.port)
  }
  if (options.passthrough.length) {
    nextArgs.push(...options.passthrough)
  }

  const env = {
    ...process.env,
    NEXT_DISABLE_TURBOPACK: process.env.NEXT_DISABLE_TURBOPACK ?? '1',
    ...(options.apiEndpoint ? { NEXT_PUBLIC_API_ENDPOINT: options.apiEndpoint } : {}),
    ...(options.stripeKey ? { NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: options.stripeKey } : {}),
  }

  const child = spawn(process.execPath, [nextBin, ...nextArgs], {
    cwd: runtimeDir,
    stdio: 'inherit',
    env,
  })

  child.on('exit', (code) => {
    process.exit(code ?? 0)
  })
}

main()
