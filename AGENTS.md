# AGENTS.md

Documentación para desarrolladores y widget del feed público de actividades de la campaña por la Huelga General por la Vivienda. El feed lo sirve `participa.huelgaporlavivienda.org`; este repositorio describe lo que hace, no lo cambia.

## Reglas

- **Repositorio público.** Nada de secretos, credenciales, identificadores de cliente reales, direcciones que no sean públicas ni datos personales.
- **Describe el feed por lo que hace, no por cómo está hecho.** Nada que dé pistas de con qué se construye o dónde se aloja (proveedores, bases de datos, servicios, entornos internos, mecanismos de caché o de límites): sólo URLs públicas, rutas, parámetros, cabeceras y códigos de respuesta. En ejemplos y documentación, datos inventados y `fc_TU_IDENTIFICADOR`.
- **Código en inglés:** identificadores, comentarios, nombres de archivo y ramas. Los textos que ve la persona usuaria, en castellano.
- **Los ejemplos funcionan tal cual**, sin dependencias, y siguen las [buenas prácticas](docs/good-practices.md): `textContent` en el navegador; `User-Agent`, `ETag`, copia local y `Retry-After` en el servidor.
- **Si cambia la API**, actualiza `docs/` en la misma tanda. Lo que se documenta aquí es un contrato con las webs de otros colectivos: en `/v1` sólo se añaden campos.
- **Licencias:** el código, MIT ([LICENSE](LICENSE)); los datos del feed, CC BY 4.0.
- Las vulnerabilidades se tratan en privado: [SECURITY.md](SECURITY.md).
