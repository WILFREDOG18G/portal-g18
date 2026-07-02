# Portal G18 - Setup Inicial

Proyecto base con Next.js 14 (App Router), TypeScript, Tailwind y Supabase.

## 1) Instalar dependencias

```bash
npm install
```

## 2) Configurar variables de entorno

Copia `.env.example` a `.env.local` y coloca tus valores de Supabase:

```bash
cp .env.example .env.local
```

Variables requeridas:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 3) Ejecutar migracion SQL en Supabase

Archivo de migracion:

- `supabase/migrations/202606300001_initial_schema.sql`

Opciones:

1. Supabase SQL Editor: pega y ejecuta el contenido del archivo.
2. Supabase CLI: aplica la migracion desde la carpeta del proyecto.

## 4) Levantar el proyecto

```bash
npm run dev
```

## 5) Auth y perfil inicial

- Ruta de login: `/auth/login`
- Si el usuario existe en Supabase Auth y entra por primera vez, el sistema crea su fila en `profiles` con:
  - `role = manager`
  - `business_unit_ids = []`

Despues, un usuario admin o rrhh debe asignar unidades autorizadas al manager en la tabla `profiles`.

## 6) Crear primer admin (manual)

Tras registrar el primer usuario en Supabase Auth, ejecuta en SQL Editor:

```sql
update public.profiles
set role = 'admin'
where id = '<AUTH_USER_ID>';
```

## 7) Verificaciones importantes

- El esquema sigue la seccion 4 de `PORTAL_G18_SPEC.md`.
- RLS esta activado en tablas de negocio.
- Acceso por rol:
  - `admin` / `rrhh`: acceso total.
  - `manager`: acceso solo a unidades de `profiles.business_unit_ids`.

## 8) Estructura recomendada del proyecto

- `src/app/app/<modulo>/page.tsx`: pantalla principal del modulo.
- `src/app/app/<modulo>/actions.ts`: server actions del modulo.
- `src/app/app/<modulo>/*`: componentes locales solo si pertenecen a ese modulo.
- `src/components/ui/*`: primitivas compartidas de interfaz.
- `src/lib/auth/*`: roles, guards y bootstrap de perfil.
- `src/lib/supabase/*`: clientes y variables de Supabase.
- `src/lib/pdf/*`: generacion de PDFs reutilizable.
- `supabase/migrations/*`: esquema y cambios de base de datos versionados.

## 9) Patron de modulo

Cada modulo nuevo debe seguir este patron minimo:

1. `page.tsx` para componer la vista.
2. `actions.ts` para mutaciones y validacion del lado servidor.
3. componentes locales solo si no son reutilizables.
4. si una pieza visual se repite entre modulos, moverla a `src/components/ui`.

## 10) Flujo de trabajo recomendado

1. Implementar el cambio en una superficie pequena y clara.
2. Ejecutar `npm run test`.
3. Si el cambio toca render, rutas o build output, ejecutar `npm run build`.
4. Confirmar que no hay errores en el workspace.
5. Hacer commit con mensaje concreto.
6. Hacer push a `main`.
7. Validar el deployment en Vercel.

## 11) Componentes UI compartidos actuales

- `src/components/ui/ModuleHeader.tsx`
- `src/components/ui/SectionCard.tsx`
- `src/components/ui/FilterBar.tsx`

Admin ya fue refactorizado para servir como patron inicial de estructura.

## Notas de modelado

- Se agrega tabla `incident_types` para permitir catalogo editable de incidencias.
- `profiles.id` referencia `auth.users.id` para integrar Supabase Auth.
- Se incluyen seeds de `business_units`: ARIA, KAVA, SIMJATI, SHEVA_CATERING.
