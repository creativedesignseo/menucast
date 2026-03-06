# Reporte para resolver el problema de Expo en MenuCast

## Problema
`npx expo start --web` (o cualquier comando expo) falla con:
```
Error: Cannot find module '@expo/cli'
```

## Causa raíz
NPM Workspaces no instala `@expo/cli` físicamente en `node_modules/@expo/cli`.

- `expo@55.0.5` declara `@expo/cli@55.0.15` como dependencia
- `npm ls @expo/cli` la muestra listada ✅
- Pero `node_modules/@expo/cli/` NO EXISTE en disco ❌
- Esto pasa porque `npm install` (sin flags) falla silenciosamente al resolver peer deps en monorepo

## Solución que SÍ funcionó (ya aplicada parcialmente)

```bash
# Desde la raíz c:\Users\jonat\workspace\menucast

# 1. Borrar todo
Remove-Item -Recurse -Force node_modules, apps\mobile-tv\node_modules, apps\dashboard\node_modules -ErrorAction SilentlyContinue
Remove-Item package-lock.json -ErrorAction SilentlyContinue
npm cache clean --force

# 2. Reinstalar con --legacy-peer-deps (CLAVE)
npm install --legacy-peer-deps

# 3. Verificar que @expo/cli existe
Test-Path "node_modules\@expo\cli"   # Debe dar True

# 4. Instalar react-native-web para modo web (PowerShell, escapar comillas)
npm install react-native-web@"~0.21.0" "@expo/metro-runtime" --legacy-peer-deps

# 5. Probar
cd apps\mobile-tv
npx expo start --web
```

## Estado actual del repo
- `package.json` de mobile-tv tiene expo SDK 55 (original, sin cambios)
- Se intentó bajar a SDK 52 pero se revirtió con `git restore`
- `node_modules/` fue reinstalado con `--legacy-peer-deps` y `@expo/cli` SÍ existe ahora
- `react-native-web` y `@expo/metro-runtime` fueron instalados
- `npx expo start --web` YA FUNCIONÓ (Metro Bundler arrancó, sirvió la app)
- Expo Go sigue sin ser compatible con SDK 55 en dispositivos físicos

## Lo que falta commitear
1. `apps/dashboard/src/app/(app)/dashboard/settings/` — página nueva, untracked
2. `apps/dashboard/src/app/(app)/layout.tsx` — modificado (navbar con link a settings)
3. `apps/mobile-tv/package.json` — cambió por `react-native-web` agregado
4. `package-lock.json` — regenerado

### Comando para commitear (PowerShell):
```powershell
git add "apps/dashboard/src/app/(app)/dashboard/settings/"
git add "apps/dashboard/src/app/(app)/layout.tsx"
git add "apps/mobile-tv/package.json"
git add package-lock.json
git commit -m "feat: add settings page, fix expo deps, add web support"
git push
```

## Estructura del monorepo
```
menucast/
├── package.json          # workspaces: ["apps/*", "packages/*"]
├── apps/
│   ├── dashboard/        # Next.js 16 (funciona OK)
│   └── mobile-tv/        # Expo SDK 55 (ahora funciona con --web)
└── supabase/migrations/
```

## Nota importante
En este monorepo, SIEMPRE usar `npm install --legacy-peer-deps` desde la raíz. Sin ese flag, npm no resuelve `@expo/cli` correctamente.
