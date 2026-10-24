# Jesus Camp 2027

Jesus Camp 2027 es una aplicación web para apoyar la organización y administración
del campamento. Reúne en un mismo sistema la gestión de inscripciones, participantes,
pagos y tareas administrativas.

## Objetivo

Facilitar a los campamentistas la consulta y actualización de su información, y ofrecer
al equipo organizador herramientas para supervisar los registros y coordinar la
operación del campamento.

## Funcionalidades principales

- **Portal del campamentista** (`index.html`): permite buscar un perfil por C.I.,
  consultar el estado de inscripción y pagos, gestionar datos personales y la carta
  de compromiso, y enviar comprobantes.
- **Panel administrativo** (`admin.html`): reúne la revisión de solicitudes, la
  administración de inscritos y staff, categorías de inscripción, ingresos y egresos,
  reportes, usuarios, roles y auditoría.

## Estructura y tecnologías

- `index.html` y `admin.html` contienen las interfaces del portal y del panel.
- `assets/css/` y `assets/js/` mantienen separados los estilos y la lógica de cada
  interfaz.
- La aplicación utiliza HTML, CSS y JavaScript, Tailwind CSS y el cliente de Supabase
  para interactuar con los servicios de datos y archivos.
- `manifest.json` describe la aplicación web instalable.

La configuración de la base de datos, las políticas de acceso, autenticación y
almacenamiento de Supabase se administran fuera de este repositorio. Antes de usar
datos reales, deben revisarse y protegerse especialmente los datos personales,
financieros y de menores.
