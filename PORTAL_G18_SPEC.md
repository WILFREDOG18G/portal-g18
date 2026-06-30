# Portal Grupo Dieciocho — Especificación para migración a Claude Code

## 1. Contexto del negocio

**Grupo Dieciocho** opera 4 unidades de negocio:

| Unidad | Tipo | Razón social | RUC |
|---|---|---|---|
| ARIA | Restaurante — Kosher cárnico (Basar) | GASTRONOMIA 18, S.A. | 155644704-2-2017 DV 70 |
| KAVA | Restaurante — Kosher lácteo (Chalav) | MANDARINA 18 IMPORT S.A | 19223675-1-726686 DV 71 |
| SIMJATI | — | LATAM ROBOTICS S.A | — |
| SHEVA CATERING | Catering | GASTRONOMIA 18, S.A. | — |

Cada unidad se organiza en **áreas**: Servicio (Salonero, Host, Cajero), Sushi, Cocina (Línea fría, Línea caliente, Freidora, Pizzería en KAVA / Wok, Grill, Freidora, Pastelería en ARIA), Bar.

El producto es un **portal interno** con 4 módulos: Evaluaciones, RRHH, Admin, SOP.

---

## 2. Estado actual (prototipo)

Construido como **un solo archivo HTML** con JS inline y `localStorage` del navegador como única persistencia. Sirvió para validar el flujo y el diseño con el cliente, pero **no es production-ready**:

- Sin backend → cada navegador tiene su propia copia de los datos, nada se sincroniza entre usuarios.
- Contraseñas de usuarios en texto plano dentro del HTML.
- Sin manejo real de archivos (los SOP no se pueden subir de verdad).
- Editar el archivo a punta de find/replace de texto es fràgil — un paréntesis mal contado rompe todo el script.

**Lo que sí está validado y debe preservarse en la migración:** la estructura de datos, las reglas de negocio, los flujos de usuario, y los formatos de PDF (ya aprobados visualmente por el cliente).

---

## 3. Arquitectura recomendada

```
Frontend:  Next.js 14+ (App Router) + TypeScript + Tailwind CSS
Backend:   Next.js API routes (o tRPC) + Supabase
Database:  Postgres (vía Supabase)
Auth:      Supabase Auth (email+password, roles vía tabla profiles)
Storage:   Supabase Storage (para los SOP — PDFs, Word, imágenes)
PDF gen:   @react-pdf/renderer o jsPDF (igual que el prototipo) en el servidor
Hosting:   Vercel (frontend) + Supabase (backend administrado)
```

Esta pila evita mantener servidores propios — Supabase y Vercel tienen planes gratuitos suficientes para arrancar y escalan cuando el grupo crezca.

---

## 4. Modelo de datos (tablas)

### `business_units`
```
id, name (ARIA|KAVA|SIMJATI|SHEVA_CATERING), razon_social, ruc, logo_color, kosher_type (carnico|lacteo|null)
```

### `areas`
```
id, business_unit_id, name (Servicio|Sushi|Cocina|Bar|Kosher), color
```

### `employees`
```
id, full_name, business_unit_id, area_id, position, status (activo|inactivo),
contract_type (SIPE|SP), identification_number, work_permit, salary,
hire_date, created_at, updated_at
```

### `profiles` (usuarios del sistema, ligado a Supabase Auth)
```
id (= auth.users.id), username, full_name, role (admin|rrhh|manager),
business_unit_ids (array — qué unidades puede ver)
```

### `quiz_banks`
```
id, business_unit_id, area_id, question_text, options (jsonb array),
correct_index, explanation, category (precio|gastronomico)
```
> Nota: actualmente el banco vive hardcodeado en JS. Migrar a tabla permite editar preguntas sin tocar código y cumplir la regla de "máx. 10% preguntas de precio".

### `quiz_attempts`
```
id, employee_id, business_unit_id, area_id, quiz_type, total_questions,
correct_answers, attempt_number, taken_at, tip_percentage (calculado),
registered_by (profile_id)
```

### `tips_records` (Admin → registro de propina)
```
id, employee_id, business_unit_id, shift (almuerzo|cena|completo),
amount, date, notes, registered_by
```

### `petty_cash_records` (Admin → caja menuda)
```
id, business_unit_id, category, amount, description, responsible, date
```

### `temp_staff_records` (Admin → eventuales)
```
id, full_name, business_unit_id, area_id, event_type, event_date,
start_time, end_time, hourly_rate, hours_calculated, total_amount, notes
```

### `payroll_incidents` (RRHH → incidencias quincenales)
```
id, employee_id, business_unit_id, pay_period (1-15|16-fin), month, year,
incident_type, quantity, notes
```
> El listado de `incident_type` queda pendiente — Wilfredo dijo que tiene su propio listado y lo compartirá. Dejarlo como tabla de catálogo editable (`incident_types`) en vez de enum fijo, así no hay que migrar esquema cuando llegue la lista real.

### `loan_requests` (RRHH → solicitud de adelanto, antes "préstamo")
```
id, employee_id, business_unit_id, amount, installment_amount (50|100),
installments_count (calculado: ceil(amount/installment_amount)),
last_installment_amount, reason, request_date, approved_amount, status (pendiente|aprobado|rechazado)
```

### `work_letters` (RRHH → cartas de trabajo)
```
id, employee_id, business_unit_id, purpose, request_date, contract_type (SP|SIPE),
hire_date_text, salary, weekly_tip_avg (solo SP), identification, status (pendiente|en_proceso|entregada),
generated_at, generated_by
```

### `memos`
```
id, target_employee_id (nullable = "todo el personal"), business_unit_id (nullable = "todas"),
memo_type, subject, body, date, status
```

### `sop_documents`
```
id, business_unit_id (nullable = "general"), area_id, title, description,
version, file_url (Supabase Storage), uploaded_by, created_at
```

---

## 5. Reglas de negocio críticas (no perder en la migración)

### Escala de propinas (área Servicio)
```
% correctas   → % de propina aprobado
1% – 49%      → 0%   (sin propina)
50% – 59%     → 50%
60% – 79%     → 75%
80% – 100%    → 100%
```
Se permite repetir la prueba hasta 5 intentos.

### Banco de preguntas
- Máximo 10% de preguntas sobre precios; 90%+ deben ser de conocimiento gastronómico (ingredientes, técnicas, salsas).
- Cada prueba debe incluir opción **"No sé"** que cuenta como respuesta incorrecta (no neutral).
- Las preguntas se mezclan aleatoriamente en cada intento.
- Existe una prueba específica de **Kosher** por restaurante (ARIA=cárnico, KAVA=lácteo), separada de la prueba de menú.

### Control de acceso
- **admin** y **rrhh**: ven y operan todas las unidades de negocio.
- **manager** (gerente de unidad): solo ve/opera su unidad asignada.
- Edición de resultado de prueba post-hoc (corregir colaborador mal seleccionado): **solo admin**.

### Adelantos (antes "préstamos")
- El colaborador no elige número de cuotas — elige el **monto de cuota** ($50 o $100).
- El sistema calcula `cuotas = ceil(monto_solicitado / monto_cuota)`.
- Si no divide exacto, la última cuota es menor — debe mostrarse al usuario antes de confirmar.
- El PDF generado (formato **FR-RRHH-002**, tamaño A4) debe llevar el logo y razón social de la unidad del colaborador, los datos ya completados (nombre, cargo, área, monto, cuotas), y dejar en blanco solo los espacios de firma y el campo "Monto aprobado".
- Texto del documento dice **"SOLICITUD DE ADELANTO"**, no "préstamo". Sección de aprobación dice **"GERENCIA GENERAL"** (sin "/ OPERACIONES").

### Cartas de trabajo — dos formatos según `contract_type`
- **SIPE** (cédula, planilla regular): incluye cédula, salario mensual, menciona descuentos de ley (seguro social y educativo).
- **SP** (pasaporte, servicios profesionales): incluye pasaporte, honorarios mensuales + propina promedio semanal.
- Usuarios no-admin solo registran la **solicitud** (propósito, fecha). Admin/RRHH completan fecha de ingreso y salario, y generan el PDF — el sistema detecta automáticamente cuál de los dos formatos usar según el `contract_type` del empleado.
- Razón social en el cuerpo del documento varía por unidad (ver tabla de la sección 1). SIMJATI usa "LATAM ROBOTICS S.A".

### Reportes (todos exportables a PDF)
- Por colaborador, por unidad, pendientes de evaluar, historial de intentos, incidencias quincenales (con filtro de mes), listado de personal completo.

---

## 6. Vistas / pantallas a construir

1. **Login** (Supabase Auth) — sin pantalla "Próximamente" para módulos no implementados; ocultar del menú en vez de mostrar deshabilitado.
2. **Home / selector de módulo** — tarjetas grandes: Evaluaciones, RRHH, Admin, SOP.
3. **Evaluaciones**
   - Dashboard (stats globales + por unidad, ranking, últimos resultados)
   - Generador de prueba (selección Unidad → Área → modo práctica/examen → cantidad de preguntas)
   - Prueba interactiva (opción "No sé", feedback inmediato en modo práctica)
   - Registro de resultado (inline al terminar la prueba, o manual)
   - Personal (CRUD + activar/inactivar con confirmación nominal)
   - Historial, Reportes (4 vistas), Escala de propinas (referencia visual)
4. **Admin** — Propina, Caja menuda, Eventuales (cada uno: formulario + tabla + filtros + totales)
5. **RRHH** — Personal (tabla maestra), Incidencias, Adelantos, Cartas de trabajo, Memos
6. **SOP** — Galería de documentos por unidad/área + upload

---

## 7. Lo que NO se debe rehacer desde cero

Estos ya están resueltos visual y funcionalmente en el prototipo — úsalos como referencia de diseño/UX al construir en Next.js, no los reinventes:
- Paleta de colores por unidad (ARIA verde, KAVA rojo, SIMJATI morado, SHEVA dorado)
- Estructura del banco de preguntas KAVA/ARIA (44 y 50 preguntas respectivamente, ya redactadas)
- Banco de preguntas Kosher (18 preguntas por restaurante)
- Layout exacto del PDF de adelanto y de cartas de trabajo
- Lógica de cálculo de cuotas y de escala de propinas

