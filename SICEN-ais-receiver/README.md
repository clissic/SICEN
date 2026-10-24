# Receptor AIS Local para SICEN

Este módulo permite a la Prefectura del Puerto de Montevideo ejecutar su propio receptor AIS utilizando [AIS-catcher](https://github.com/jvde-github/AIS-catcher) con un dongle RTL-SDR y una antena VHF.

## Hardware Requerido

### Lista de Componentes

1. **Dongle RTL-SDR**
   - RTL-SDR Blog V3 o V4 (recomendado)
   - NooElec NESDR SMArt v5
   - Cualquier dispositivo RTL2832U compatible
   - Precio aproximado: USD 25-40

2. **Antena VHF Marina**
   - Frecuencia: 161.975 MHz y 162.025 MHz (canales AIS)
   - Tipo: Antena dipolo, colineal o discono
   - Ganancia: 3-6 dBi (mayor ganancia = mayor alcance)
   - Conector: SMA o adaptador según el dongle
   - Precio aproximado: USD 30-100

3. **Cable coaxial** (si la antena está separada)
   - Tipo: RG-58 o RG-8X (baja pérdida)
   - Longitud: minimizar según instalación
   - Conectores: SMA, N o BNC según antena y dongle
   - Precio aproximado: USD 10-30

4. **Computadora o Raspberry Pi**
   - Raspberry Pi 4 (2GB RAM mínimo, 4GB recomendado)
   - O cualquier servidor Linux con puerto USB
   - Sistema operativo: Ubuntu Server, Raspberry Pi OS (64-bit), Debian, etc.

### Alcance Esperado

Con una instalación óptima:
- **Antena a nivel del mar**: 5-15 millas náuticas
- **Antena elevada (10-20 metros)**: 20-40 millas náuticas
- **Antena en torre alta (>30 metros)**: 40-60+ millas náuticas

El alcance depende de:
- Altura de la antena receptora
- Altura de la antena transmisora del buque
- Obstrucciones (edificios, terreno)
- Interferencias electromagnéticas
- Calidad del cable y conectores

## Instalación de la Antena

### Ubicación Ideal

1. **Altura**: Lo más alto posible con línea de vista al horizonte marino
2. **Despejada**: Sin obstrucciones metálicas cercanas (>2 metros)
3. **Alejada de**: Radares, transmisores VHF, fuentes de ruido eléctrico
4. **Orientación**: Las antenas omnidireccionales no requieren orientación específica

### Montaje

1. Fijar la antena a un mástil, techo o torre
2. Apuntar verticalmente hacia arriba (polarización vertical)
3. Conectar el cable coaxial con conectores impermeables
4. Proteger conexiones con cinta autovulcanizante o termocontraíble
5. Aterrizar la antena según normas locales si está en exteriores

### Conexión

```
Antena VHF → Cable coaxial → Dongle RTL-SDR → Puerto USB → Computadora/Raspberry Pi
```

## Configuración del Sistema

### 1. Instalar Docker y Docker Compose

**Ubuntu/Debian:**

```bash
sudo apt update
sudo apt install -y docker.io docker-compose
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker $USER
```

Cerrar sesión y volver a entrar para aplicar permisos del grupo.

**Raspberry Pi OS:**

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

### 2. Identificar el Dongle RTL-SDR

Conectar el dongle USB y verificar que el sistema lo reconoce:

```bash
lsusb
```

Deberías ver una línea similar a:

```
Bus 001 Device 004: ID 0bda:2838 Realtek Semiconductor Corp. RTL2838 DVB-T
```

Para verificar que el dispositivo está accesible:

```bash
ls -la /dev/bus/usb/
```

### 3. Configurar el Servicio

Copiar el archivo `.env.example` a `.env` y ajustar según tu instalación:

```bash
cd SICEN-ais-receiver
cp .env.example .env
nano .env
```

**Configuración en Linux:**

Si el backend SICEN corre en el mismo host, usar la IP del host en la red Docker:

```env
UDP_HOST=172.17.0.1
UDP_PORT=10110
```

**Configuración en Raspberry Pi:**

Si el backend SICEN corre en otro servidor:

```env
UDP_HOST=192.168.1.100  # IP del servidor SICEN-back
UDP_PORT=10110
```

### 4. Iniciar el Receptor

```bash
docker-compose up -d
```

### 5. Verificar el Funcionamiento

Ver logs en tiempo real:

```bash
docker-compose logs -f ais-catcher
```

Deberías ver líneas como:

```
[AIS-catcher] Device: 0, S/N: 00000001, Tuner: auto
[AIS-catcher] UDP output: 172.17.0.1:10110
[AIS-catcher] Received 142 messages, 12 stations
!AIVDM,1,1,,A,13HOI:0P0000VOHLCnHQKwvL05Ip,0*23
!AIVDM,1,1,,B,133sVfPP00PD>hRMDH@jNOvN20S8,0*7F
...
```

### 6. Verificar la Recepción en SICEN

En el servidor donde corre SICEN-back, verificar que el puerto UDP está recibiendo datos:

```bash
# Instalar netcat si no está disponible
sudo apt install -y netcat

# Escuchar el puerto UDP (sustituir 10110 por tu puerto)
nc -u -l 10110
```

Deberías ver mensajes NMEA:

```
!AIVDM,1,1,,A,13HOI:0P0000VOHLCnHQKwvL05Ip,0*23
!AIVDM,1,1,,B,133sVfPP00PD>hRMDH@jNOvN20S8,0*7F
```

Si no llegan mensajes:
1. Verificar que el firewall permite UDP entrante en el puerto 10110
2. Verificar que `AIS_NMEA_UDP_ENABLED=true` en `.env.development` del backend
3. Revisar los logs de AIS-catcher con `docker-compose logs`

## Configuración del Backend SICEN

En el servidor donde corre `SICEN-back`, agregar estas variables al archivo `.env.development` o `.env.production`:

```env
# Habilitar recepción de mensajes NMEA vía UDP
AIS_NMEA_UDP_ENABLED=true

# Puerto UDP donde escuchar (debe coincidir con UDP_PORT del receptor)
AIS_NMEA_UDP_PORT=10110

# Interfaz donde escuchar. Por defecto 127.0.0.1 (solo local).
# Si AIS-catcher corre en Docker, los paquetes llegan desde la red bridge
# (no desde 127.0.0.1), por lo que hay que escuchar en 0.0.0.0 Y restringir el origen:
AIS_NMEA_UDP_HOST=0.0.0.0
# Allowlist de IPs de origen (separadas por coma). Vacío = cualquiera (no recomendado con 0.0.0.0).
# Con la red bridge por defecto de Docker el contenedor suele salir como 172.17.0.x / 172.18.0.x;
# verificar con: docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' sicen-ais-catcher
AIS_NMEA_UDP_ALLOWED_IPS=172.18.0.2
```

Reiniciar el backend:

```bash
cd SICEN-back
npm start
```

En los logs deberías ver:

```
[SICEN-back] Receptor NMEA UDP escuchando en 0.0.0.0:10110 (allowlist: 172.18.0.2)
```

## Comandos Útiles

### Detener el receptor

```bash
docker-compose down
```

### Reiniciar el receptor

```bash
docker-compose restart
```

### Ver logs

```bash
docker-compose logs -f ais-catcher
```

### Actualizar la imagen de AIS-catcher

```bash
docker-compose pull
docker-compose up -d
```

## Ajustes de Rendimiento

### Ganancia del RTL-SDR

La ganancia automática (`-gr tuner auto`) suele funcionar bien. Si hay demasiado ruido o pocas detecciones, probar ganancia manual:

```env
AIS_CATCHER_OPTS=-gr tuner 38.6
```

Valores típicos: 20-50 (experimentar según la ubicación).

### Corrección de Frecuencia (PPM)

Los dongles RTL-SDR económicos tienen desviación de frecuencia. Si ves pocas detecciones:

```env
AIS_CATCHER_OPTS=-gr tuner auto -p -3
```

Valores típicos: -10 a +10 PPM. Usar la herramienta `kal` (kalibrate-rtl) para calibrar:

```bash
sudo apt install -y kalibrate-rtl
kal -s GSM900
kal -c <canal> -e <ppm>
```

### Filtros Adicionales

AIS-catcher incluye varios decodificadores. El más recomendado es el predeterminado (FM), pero se puede forzar otro:

```env
# Usar decodificador específico
AIS_CATCHER_OPTS=-gr tuner auto -s 1536K
```

Opciones de `-m`:
- `0`: Decodificador de baja complejidad (por defecto en dispositivos lentos)
- `2`: Decodificador estándar (recomendado)

## Solución de Problemas

### No se detectan buques

1. **Verificar la antena**: ¿Está conectada? ¿Despejada? ¿A buena altura?
2. **Revisar los logs**: `docker-compose logs -f ais-catcher`
3. **Verificar el dongle**: `lsusb` debe mostrar el RTL-SDR
4. **Probar con software de prueba**: Instalar `rtl_test` o `gqrx` para verificar el hardware
5. **Ajustar la ganancia**: Probar valores manuales entre 20-50
6. **Verificar frecuencia**: AIS usa 161.975 MHz (Canal A) y 162.025 MHz (Canal B)

### El contenedor no arranca

1. **Permisos USB**: Agregar el usuario al grupo `plugdev`:

   ```bash
   sudo usermod -aG plugdev $USER
   ```

2. **Conflicto con otros software**: Detener otros programas que usen el RTL-SDR:

   ```bash
   sudo systemctl stop rtl_tcp
   killall rtl_fm
   ```

3. **Revisar logs del contenedor**:

   ```bash
   docker logs sicen-ais-catcher
   ```

### El backend no recibe mensajes

1. **Firewall**: Abrir el puerto UDP:

   ```bash
   sudo ufw allow 10110/udp
   ```

2. **Verificar conectividad**: Desde el host del receptor, probar enviar un mensaje UDP:

   ```bash
   echo "TEST" | nc -u <IP_BACKEND> 10110
   ```

3. **Verificar configuración**: `AIS_NMEA_UDP_ENABLED=true` en el `.env` del backend

4. **Revisar logs del backend**: Buscar "Receptor NMEA UDP" en los logs de inicio

## Integración con El Centinela

Una vez configurado:

1. Los mensajes NMEA se reciben y decodifican en el backend
2. Los buques detectados se integran automáticamente en `aisBridge.service.js`
3. Aparecen en el mapa de El Centinela con la fuente `nmea-udp`
4. Se fusionan con datos de AISStream y Skylight usando el mismo store

La capa AIS en El Centinela mostrará los buques con el indicador de fuente:
- **AISStream (en vivo)**: Buques de la API AISStream
- **Skylight (última conocida)**: Posiciones satelitales
- **NMEA Local**: Buques recibidos por el receptor propio (nuevo)

## Seguridad

- El puerto UDP **no debe exponerse** a Internet sin firewall
- Restringir el acceso al puerto 10110 solo desde IPs conocidas
- El backend valida y limpia todos los mensajes NMEA recibidos
- Los mensajes malformados se descartan sin afectar el sistema

## Referencias

- [AIS-catcher en GitHub](https://github.com/jvde-github/AIS-catcher)
- [RTL-SDR Blog](https://www.rtl-sdr.com/)
- [AIS en Wikipedia](https://es.wikipedia.org/wiki/Sistema_de_identificaci%C3%B3n_autom%C3%A1tica)
- [Especificación NMEA AIS](https://gpsd.gitlab.io/gpsd/AIVDM.html)

## Soporte

Para problemas con AIS-catcher, consultar el [repositorio oficial](https://github.com/jvde-github/AIS-catcher/issues).

Para problemas con la integración en SICEN, revisar los logs del backend y verificar la configuración de las variables de entorno.


## Seguridad y monitoreo del receptor NMEA

- **Bind por defecto `127.0.0.1`** (`AIS_NMEA_UDP_HOST`). Solo usar `0.0.0.0` cuando AIS-catcher corre en Docker u otra máquina, siempre con `AIS_NMEA_UDP_ALLOWED_IPS` y/o firewall. Ejemplo con ufw: `sudo ufw allow from 172.16.0.0/12 to any port 10110 proto udp` y denegar el resto.
- **Checksum NMEA**: toda sentencia `!AIVDM/!AIVDO` cuyo checksum (`*hh`) no coincide se descarta y se cuenta.
- **Métricas** (requiere JWT, igual que el resto de `/api/ais`):

```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/ais/nmea/status
```

Devuelve `enabled`, `listening`, `host`, `port`, `allowlist`, `receiving` (tráfico válido en los últimos 5 min) y `metrics` (`received`, `valid`, `invalidChecksum`, `malformed`, `rejectedSource`, `discarded`, `decoded`, `lastValidAt`).
- En el front, la capa **"Receptor local (NMEA)"** (grupo AIS) muestra solo los buques recibidos por este canal, y el aviso "AIS no configurado" no aparece cuando el receptor está habilitado y recibiendo.
