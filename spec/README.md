# Contrato común de las librerías

`fixtures/` tiene respuestas del feed (datos inventados) y lo que cada librería debe devolver al leerlas (`normalized.json`). Las pruebas de JavaScript y de PHP leen los mismos archivos, así que las dos librerías se comportan igual.

Si el feed añade un campo y una librería lo empieza a leer, añádelo aquí primero y después en las dos librerías.
