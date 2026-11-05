# Mapa + cuentas + comentarios (rama develop)

1. Todo el sitio ya viene integrado (`index.html` incluye el mapa, el inicio de sesión y los comentarios). Copia el contenido del zip a la raíz del repo, en tu rama `develop`.
2. Crea la base de datos: `npx wrangler d1 create eco-estadistica-db` y pega el `database_id` en `wrangler.jsonc`.
3. Crea las tablas: `npx wrangler d1 execute eco-estadistica-db --remote --file=db/schema.sql` (agrega `--local` en lugar de `--remote` para pruebas locales).
4. Prueba local: `npx wrangler dev` y abre la URL que muestra. Abrir `index.html` con doble clic ya no sirve para cuentas ni comentarios, porque necesitan el Worker.
5. Publicar: `npx wrangler deploy`. Si despliegas desde el panel de Cloudflare con Git, el comando de despliegue debe ser `npx wrangler deploy`. Las ramas que no son la principal comparten esta misma base de datos, así que las pruebas de `develop` escribirán datos reales.
6. Moderador: tras registrarte, `npx wrangler d1 execute eco-estadistica-db --remote --command "UPDATE users SET is_admin=1 WHERE email='tu@correo.com'"`. Un moderador puede borrar cualquier comentario.

## Lugares propios en el mapa
Agrega objetos a `data/centros.json` (se muestran en naranja). Verifica cada lugar antes de publicarlo:
`{"nombre":"...","lat":18.45,"lng":-95.21,"direccion":"...","materiales":["PET","Vidrio"],"horario":"...","telefono":"...","web":"https://..."}`

## Privacidad
Se guarda el correo y un hash PBKDF2 de la contraseña (nunca la contraseña). Los comentarios muestran solo el nombre público. Si el sitio se usa fuera de la escuela, conviene agregar un aviso de privacidad.
