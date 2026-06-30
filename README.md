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

## Notas de modelado

- Se agrega tabla `incident_types` para permitir catalogo editable de incidencias.
- `profiles.id` referencia `auth.users.id` para integrar Supabase Auth.
- Se incluyen seeds de `business_units`: ARIA, KAVA, SIMJATI, SHEVA_CATERING.
