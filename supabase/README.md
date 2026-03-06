# Supabase Setup

## Local development

1. Instalar Supabase CLI: `npm install -g supabase`
2. Login: `supabase login`
3. Iniciar local: `supabase start`
4. Aplicar schema: `supabase db push`
5. Generar tipos: `supabase gen types typescript --local > packages/shared/database.types.ts`

## Variables de entorno requeridas

### apps/dashboard/.env.local
```
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key-del-supabase-start>
```

### apps/mobile-tv/.env
```
EXPO_PUBLIC_SUPABASE_URL=http://localhost:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-key-del-supabase-start>
```
