# Checkpoints franja Categoría B

Para volver a una configuración guardada (desde `SICEN-front`):

```bash
node scripts/restore-brevet-b-checkpoint.mjs v1
```

| Id | Descripción |
| --- | --- |
| `v1` | Cortes 1–12 (270°→090°, queda S) y 212–219 (315°→135°, queda S/O) |

Después de restaurar, recargá el mapa. Si cambiás cortes a mano, regenerá con `node scripts/build-brevet-b-strip.mjs` y, si querés otro checkpoint, copiá de nuevo los archivos a esta carpeta.
