# JesusCamp2027

## Seguridad antes de publicar

El portal usa Supabase directamente desde el navegador. Las validaciones de esta interfaz ayudan a evitar errores y contenido malicioso, pero no sustituyen controles del servidor. Antes de usar datos reales:

- Activa y prueba políticas RLS en todas las tablas. No confíes en los permisos visuales del panel: solo las políticas de Supabase pueden impedir consultas o cambios no autorizados.
- Sustituye el acceso administrativo propio basado en SHA-256 por Supabase Auth y aplica las operaciones de administración mediante políticas asociadas a usuarios autenticados. SHA-256 sin sal ni derivación de clave no es un almacenamiento seguro de contraseñas; solicita a cada administrador que restablezca su contraseña al migrar.
- Restringe los buckets `cartas` y `comprobantes` y guárdalos como privados. El portal actual usa URL públicas; cambiar a buckets privados requiere implementar URLs firmadas con autorización y actualizar la forma de visualizarlas.
- Limita la búsqueda pública de participantes: el C.I. por sí solo no acredita identidad y los datos personales, financieros y de menores no deben quedar expuestos por políticas de lectura pública. Usa un mecanismo de acceso verificado en el servidor.
- Mantén únicamente la clave publicable/anon en el frontend; nunca agregues una clave `service_role`. Configura HTTPS y cabeceras de seguridad (incluida una Content Security Policy) en el hosting.

La configuración SQL, RLS, Auth y Storage de Supabase no está incluida en este repositorio, por lo que debe revisarse y desplegarse por separado.