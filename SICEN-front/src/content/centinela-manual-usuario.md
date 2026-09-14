# Manual de El Centinela

Guía para operadores. Pensada para leerse con calma: qué hace cada opción, qué se ve en el mapa y qué aparece al interactuar. No es documentación para desarrolladores.

## Empezá por acá

El Centinela es el **mapa operativo** de SICEN a pantalla completa. Sirve para vigilar el área marítima de interés: buques, detecciones satelitales, pesca, encuentros entre buques, apagones de AIS, el medio marino y zonas de trabajo.

No hace falta memorizar todo. Abrí **Capas**, encendé lo que necesitás y explorá. Este manual está a un toque del ícono de **libro**, a la izquierda del mapa.

> clave: El Centinela es apoyo a la vigilancia. **No reemplaza** la carta náutica oficial ni la documentación reglamentaria de navegación.

> tip: Las coordenadas se muestran siempre en **grados, minutos y segundos (DMS)**, nunca en grados decimales.

### Cómo orientarte

- **Columna izquierda** — Inicio, tema, Capas, este manual, zoom.
- **Panel Capas** — casi todo lo que se prende y apaga en el mapa.
- **Botones a la derecha** — aparecen según el contexto (listas, historial, marcadores).
- **Clic en el mapa** — coordenadas y, si hay capas ambientales activas, viento / corrientes / olas / profundidad.

### Un recorrido rápido

1. Abrí **Capas**.
2. Dejá encendidos Posicionamiento SICEN, Coordenadas o Seamarks si te ayudan a ubicarte.
3. En **Inteligencia marítima**, activá solo lo que estás mirando (AIS, detecciones, pesca…).
4. Si necesitás medir, ir a un punto o simular, usá **Herramientas** al pie del panel.

## Controles fijos

A la izquierda del mapa hay una columna de botones siempre visibles. Son tu “tablero de mando” fijo.

### Inicio

Vuelve al menú principal de SICEN.

### Tema claro u oscuro

Cambia la apariencia del mapa y de los paneles. La preferencia se guarda en el navegador: la próxima vez vas a encontrar el mismo modo.

### Capas

Abre o cierra el panel lateral. Desde ahí se encienden y apagan inteligencia, zonas, medio marino y herramientas.

### Manual

Debajo de Capas, el ícono de **libro** abre esta guía. No tiene popover a propósito: es un acceso directo y discreto.

### Acercar y alejar

Los botones **+** y **−** cambian el zoom del mapa.

### Botones de la derecha (según contexto)

Según lo que tengas activo o seleccionado, pueden aparecer botones redondos a la derecha:

- **Lista** — eventos satelitales visibles en la zona del mapa (cuando hay capas Skylight de eventos encendidas).
- **Marcadores** — tus marcadores personales (cuando «Mis marcadores» está activo).
- **Reloj (Historial / predicción)** — muestra u oculta el dossier del buque seleccionado.

> tip: Si no ves un botón a la derecha, probablemente falta activar la capa o seleccionar un buque. No está “roto”: es contextual.

## Panel Capas

Abrí **Capas** (botón de la izquierda). El panel agrupa lo que se puede mostrar en el mapa, de arriba hacia abajo.

### Posicionamiento SICEN

Muestra buques deportivos en tránsito que reportan su posición GPS a SICEN. El sistema de posicionamiento fue desarrollado de forma única para SICEN, a partir de la investigación del AN (CP) Nicolás MAREGA y el AN (CP) Ignacio LA CAVA.

**En el mapa:** íconos del buque y, si hay historial reciente, el trazo de la ruta.

**Al seleccionar un buque:** matrícula, datos del patrón (con contacto si está disponible), origen y destino, ETA, estado de comunicación y última posición. También podés ver el historial de posiciones.

### Coordenadas

Dibuja una grilla de latitud y longitud para orientar la lectura de posición.

### Seamarks OSM

Boyas, luces y otras señales náuticas de OpenSeaMap sobre el mapa base. Útil para contextualizar sin salir del Centinela.

### Inteligencia marítima

Desplegable organizado por **función** (detecciones, pesca, STS, apagones AIS, posiciones AIS), no por proveedor. El detalle está en la sección **Inteligencia marítima**.

### Zonas

Incluye dos grupos.

**Fondeo y otros servicios** — polígonos operativos, por ejemplo:

- Zona de Alijo «Alfa» y «Delta»
- Zona de Fondeo y Servicios
- Zona de Espera y Fondeo Oeste / Este
- Zona de Transferencia de Hidrocarburos (STS)

Al hacer clic en un polígono se muestra el nombre de la zona (y descripción si la tiene).

**Brevets deportivos (categorías A–D)** — áreas o referencias asociadas a brevets. El ícono de información (ⓘ) explica cada categoría. La categoría C permite elegir el puerto de referencia para el círculo asociado.

**Límites marítimos** — capas de referencia basadas en MarineRegions (VLIZ), la misma fuente que usa Skylight en su mapa:

- **Mar territorial (12 MN)** — Uruguay.
- **Zona contigua (24 MN)** — hasta 24 millas náuticas desde la línea de base (Uruguay).
- **ZEE (200 MN)** — Zona Económica Exclusiva de Uruguay.
- **Río de la Plata** — área IHO recortada. Desplegable: **J.E. 2 MN** (oeste de la línea Colonia–Punta Lara) y **J.E. 7 MN** (este de esa línea), franjas desde la costa uruguaya recortadas al RDP.
- **Categoría B** (brevets) — Río de la Plata + Río Uruguay (hasta ~30°12′S 057°39′O) + franja oceánica 15 MN al este de Punta del Este.

Solo se dibujan en el mapa (no abren cartel al hacer clic, para no interferir con medir distancias ni con el popup de coordenadas). El detalle de cada capa está en el ícono **ⓘ** junto al checkbox.

> aviso: Son geometrías de referencia analítica (pueden estar simplificadas). **No sustituyen** la carta náutica oficial ni delimitaciones jurídicas oficiales.

## Inteligencia marítima

Activá el grupo que necesites. Podés combinar varias capas. Al hacer clic en un punto o trazo se abre la **ventana de detalle** (arrastrable) con los datos disponibles.

> tip: Menos es más. Encendé una o dos capas a la vez cuando estés analizando un caso; el mapa se lee mejor y el detalle queda más claro.

### Detecciones satelitales

Blancos detectados por satélite. En el mapa aparecen como marcadores (a veces con tramos si el evento tiene inicio y fin distintos).

Opciones:

- **Radar Sentinel-1** — detección por radar.
- **Óptico Sentinel-2** — detección óptica.
- **Óptico Landsat 8/9** — detección óptica Landsat.
- **Luces nocturnas (VIIRS)** — luces detectadas de noche.
- **Solo buques sin AIS (dark)** — **filtro**: deja solo detecciones no correlacionadas con AIS (no es una capa aparte).

**En el detalle** suelen figurar: tipo de evento, fechas, coordenadas en DMS, si hay correlación con AIS, confianza, estimaciones (por ejemplo eslora o velocidad) y buque(s) asociados. Si hay MMSI, podés abrir **Historial / predicción**.

### Actividad de pesca

- **Pesca (Skylight)** — actividad de pesca detectada; puntos o tramos y detalle con score de pesca cuando está disponible.
- **Pesca alto riesgo IUU (FIU)** — pesca asociada a buques de alto riesgo IUU según la fuente FIU; incluye avisos de metodología y uso.
- **Pesca aparente (GFW)** — pesca aparente según Global Fishing Watch; incluye aviso de uso no comercial.

### STS (ship-to-ship)

Encuentros entre buques (posible transbordo o rendezvous).

- **STS ambos en AIS** — ambos buques emiten AIS.
- **STS dark** — solo uno emite AIS.
- **STS alto riesgo IUU (FIU)** — encuentros con al menos un buque de alto riesgo IUU.
- **Encounters (GFW)** — encuentros según Global Fishing Watch.

**En el detalle:** fechas, lugar, buques involucrados y datos de la fuente.

### Dark / apagones AIS

Periodos en los que un buque deja de emitir AIS (distinto del filtro «solo dark» de detecciones).

- **Gaps LatAm IUU (FIU)**
- **Gaps AIS (GFW)**

**En el detalle:** inicio y fin del gap, duración y lugar aproximado.

### Posiciones AIS

Buques representados como flechas orientadas según rumbo o COG.

- **En vivo (AISStream)** — posiciones en tiempo casi real. La cobertura libre puede ser incompleta en algunas zonas (por ejemplo Montevideo).
- **Última conocida (Skylight)** — últimas posiciones AIS conocidas vía Skylight; refuerza la cobertura del área.

**En el detalle:** nombre, MMSI, OMI (si está disponible), velocidad, rumbo/COG, estado de navegación, indicativo, clase AIS, antigüedad de la posición y fuente. Desde ahí podés abrir **Historial / predicción**.

Si el mismo MMSI aparece en AIS y en un evento Skylight, el sistema puede marcar **cruce AIS/Skylight** (destacado visual y badge en el detalle).

> aviso: La cobertura AIS no es uniforme. Un buque “invisible” en vivo no siempre significa que no esté ahí: contrastá con última conocida, satélite u otras fuentes.

## Medio marino

Fila de botones al pie del panel de capas. Cada uno enciende o apaga una capa ambiental. Abajo del mapa aparece la leyenda cuando corresponde.

### Batimetría

Profundidades (datos GEBCO) como números sobre el agua. Podés consultar un valor al hacer clic en el número o, con la capa activa, al hacer clic en el mapa.

### Viento

Partículas animadas de dirección e intensidad. Elegí el horizonte de pronóstico (ahora, +3 h, +6 h, +12 h, +24 h).

### Corrientes

Igual que el viento, pero para corrientes oceánicas. La dirección indica **hacia dónde** va la corriente (no “desde dónde sopla”).

### Olas

Estado de mar / olas con leyenda y los mismos horizontes de pronóstico.

> tip: Con viento, corrientes, olas o batimetría activos, un **clic en el mapa** también puede mostrar esos valores en el popup de coordenadas. Es una forma rápida de “tomar el pulso” de un punto.

## Herramientas

Fila de botones al final del panel de capas, repartidos a lo ancho:

- **Simular HC** (gota)
- **Simular deriva SAR** (brújula)
- **Ir a un punto**
- **Mis marcadores**
- **Medir**

El **manual** se abre desde el libro de la columna izquierda, no desde esta fila.

> clave: Abrir HC cierra SAR (y al revés). Solo una de esas dos simulaciones queda activa a la vez, para no mezclar manchas y nubes en el mapa.

### Ir a un punto

Panel con título **Ir a un punto**. Ingresá latitud y longitud en DMS y pulsá **Ir al punto** (ícono de ubicación). La **X** cierra la herramienta. Al confirmar, el mapa vuela a ese punto y abre el popup de coordenadas.

### Mis marcadores

Activa tus marcadores personales. Aparece el botón de lista a la derecha para crear, editar, borrar o ir a un marcador. También podés agregar uno desde el popup del mapa («Agregar marcador»): nombre, coordenadas DMS, color e ícono. La **X** de la lista cierra y desactiva la herramienta.

### Medir distancias y radios

Panel **Medir distancia**. Elegí **Herramienta** (reglas = distancia, radar = radio) y **Unidad** (**MN** o **KM**). El **Total** muestra la medida; a la derecha están **Deshacer**, **Reiniciar** y **Fijar**. La **X** (o un segundo clic en el botón de la herramienta) apaga la medición.

> tip: **Fijar** deja la medida en el mapa y te permite seguir mirando sin perder el total. Volvé a tocar Fijar para soltar y seguir midiendo.

## Simulación HC

Herramienta en **Capas → Herramientas** (ícono de gota). Estima cómo puede evolucionar un **derrame de hidrocarburo** a partir de un punto, el tipo de producto, el volumen y un horizonte temporal.

### Para qué sirve

Te da una idea rápida de hacia dónde puede derivar la mancha, cómo se reparte la masa (superficie, evaporado, sumergido, varado…) y cómo cambia hora a hora según el **pronóstico** de viento, corrientes y olas.

> aviso: Es **apoyo a la decisión**, no un modelo oficial de respuesta ni un análisis de laboratorio del producto. Orientá la mirada sobre el mapa y contrastá con otras fuentes cuando la decisión sea crítica.

### Cómo usarla

1. Abrí **Simular derrame HC**.
2. Indicá el punto en **DMS** o con **Seleccionar en mapa** y un clic en el agua.
3. Elegí **Tipo de HC**, **Volumen (m³)** y **Horizonte** (6, 12 o 24 h).
4. Pulsá **Simular**. Mientras corre, el botón puede mostrar un reloj de arena.
5. Cuando termina, el mapa dibuja la mancha y el panel muestra **Cantidades**. Podés achicar el panel para ver solo la línea de tiempo.
6. Con el **deslizador** o **Play / Pause** recorrés las horas. **Stop** (rojo) limpia el resultado. La **X** cierra la herramienta.

### Parámetros

- **Latitud / longitud** — punto de liberación en DMS (o selección en mapa).
- **Tipo de HC** — familia de producto (diesel, IFO 180, crudo liviano o pesado). Define densidad, evaporación y emulsificación típicas; no es el análisis del cargamento real.
- **Volumen (m³)** — cantidad liberada. Influye en el tamaño inicial y en las cantidades.
- **Horizonte** — ventana hacia adelante desde el momento en que lanzás la corrida.

Otros detalles fijos en esta versión (no se editan en pantalla):

- Liberación **instantánea** en el punto.
- Muchas **partículas** representan la masa (del orden de miles).
- El reloj arranca en el **momento en que pedís Simular** (no hay fecha histórica editable).

### De dónde saca la información

- **Lo que vos cargás** — punto, tipo, volumen y horizonte.
- **Pronóstico ambiental** — viento, corrientes, olas y temperatura del agua (Open-Meteo), en una grilla horaria alrededor del punto.
- **Catálogo de productos** — parámetros físicos típicos por familia de HC (estilo enfoques ADIOS / NOAA).

> tip: Son campos de **pronóstico**, no mediciones de una boya en ese punto. Si el forecast cambia, una nueva simulación puede dar otra deriva.

### Cómo calcula (en criollo)

- Convierte el volumen a masa con la densidad del tipo.
- Parte esa masa en partículas y las esparce un poco alrededor del punto.
- Avanza en pasos cortos. En cada paso: **corriente + una fracción del viento**, un poco de difusión, evaporación, emulsificación, posible entrada a la columna de agua con olas, y **varado** si toca tierra (máscara aproximada de costa).
- Cada hora aprox. guarda una “foto”: partículas en superficie, contorno y presupuesto de masa.

### Tipos de hidrocarburo

Cada opción es una **familia genérica**:

- **Diesel / gasoil** — liviano; evapora bastante.
- **Fuel oil intermedio (IFO 180)** — más pesado; evapora menos; más persistente.
- **Crudo genérico liviano** — evaporación intermedia.
- **Crudo genérico pesado** — evapora poco; más propenso a emulsificar.

Si el producto real es distinto, elegí el **más parecido** y tratá el resultado como escenario ilustrativo.

### Qué ves en el mapa y en Cantidades

- **Puntos rojos** — fracción en **superficie** en ese instante.
- **Contorno rojizo** — envolvente aproximada de esa nube (no un perímetro legal).
- **Cantidades** — presupuesto de masa: Superficie, Evaporado, Sumergido, Varado, Disperso y Liberado.

Al mover la línea de tiempo ves la mancha **de ese instante**, no un video interpolado entre horas.

### Limitaciones

- Cerca de costa, el **varado** es orientativo.
- No uses el contorno rojo como límite operativo de seguridad sin validación adicional.
- La herramienta no incorpora barreras, skimmers ni decisiones de comando: solo la física aproximada bajo el forzado.

> aviso: Si el simulador no está disponible, contactá a sistemas: hace falta el servicio de cálculo en el servidor.

## Simulación SAR

Herramienta en **Capas → Herramientas** (ícono de brújula). Estima hacia dónde puede **derivar un objeto** a partir de la última posición conocida, el tipo de objeto, un radio de incertidumbre y un horizonte.

### Para qué sirve

Da una **nube de posiciones posibles** hora a hora según corriente y **leeway** (efecto del viento sobre el objeto). Sirve para acotar el área de búsqueda, no para marcar un punto único.

> clave: Es **apoyo a la búsqueda**, no una ubicación certe ni doctrina IAMSAR oficial. Combiná siempre con criterios operativos y otras fuentes.

### Cómo usarla

1. Abrí **Simular deriva SAR**.
2. Ingresá la posición en **DMS** o con **Seleccionar en mapa**.
3. Indicá la **hora del evento** (por defecto, ahora).
4. Elegí el **tipo de objeto**.
5. Ajustá el **radio de incertidumbre** en metros (por defecto 500).
6. Elegí el **horizonte**: 6, 12, 24 o 48 h.
7. Pulsá **Simular**. El mapa muestra la nube (ámbar/azul).
8. Usá **Play / Pause** en la línea de tiempo. **Stop** (rojo) limpia el resultado. La **X** cierra la herramienta.

### Clases de objeto

No hay slider de eslora: elegís la **clase** que mejor represente el caso.

- **Persona en agua (estado desconocido)** — leeway bajo; valores medios.
- **Persona con chaleco (consciente)** — aún menos deriva relativa por viento.
- **Persona fallecida (flotando)** — coeficientes distintos a persona viva.
- **Persona fallecida (hundida → reaparece)** — empieza sumergida; acumula **ADD** hasta flotar y recién ahí deriva en superficie.
- **Kayak / embarcación chica** — alto leeway: el viento pesa más.
- **Balsa salvavidas** — valores medios (drogue no editable en esta versión).
- **Bote / lancha** — leeway intermedio.
- **Buque pesquero / mayor** — menos leeway relativo; más “pegado” a la corriente.

### ADD (hundido → reaparición)

Solo para **Persona fallecida (hundida → reaparece)**:

- Se acumulan **grados-día (ADD)** con la temperatura del agua.
- Umbral de referencia ≈ **100 °C·día** (con una banda de incertidumbre por partícula).
- Mientras no flote, puede no haber nube en superficie; el panel muestra la fase y el ADD.
- Al flotar, deriva como fallecido en superficie desde la zona del LKP (± incertidumbre).

> aviso: No hay corrientes 3D de fondo. El objeto “reaparece” cerca del LKP cuando flota; no se modela un viaje submarino. Con horizontes de hasta 48 h y aguas templadas, es frecuente que **aún no reaparezca**: el ADD acumulado igual sirve de referencia.

### Límites

- No sustituye planning IAMSAR ni validación forense de ADD.
- Las olas no actúan como forzado activo de deriva en esta versión.
- Si el simulador no está disponible, contactá a sistemas.

## Detalle, historial y predicción

Cuando seleccionás un dato del mapa, El Centinela prioriza una **ventana fija** que podés arrastrar, en lugar de un globito anclado al punto.

### Ventana de detalle

Al seleccionar un buque AIS, un evento satelital u otros datos, se abre la ventana arrastrable. Movela para no tapar el mapa y cerrala cuando termines.

### Historial / predicción (dossier)

Se abre desde el detalle de un buque (o desde un evento con MMSI) o con el botón del **reloj** a la derecha.

Según datos disponibles puede incluir:

- **Identidad** — nombre, MMSI, OMI, indicativo y fuentes (AIS, Skylight, GFW…).
- **Riesgo GFW** — insights de Global Fishing Watch cuando están disponibles.
- **Track** — tramos recientes o estado (fondeado, amarrado, en tránsito…).
- **Predicción** — estimación de posición futura y su dibujo en el mapa.
- **Eventos relacionados** — por ejemplo Skylight asociados al mismo buque.

La **X** del panel lo minimiza; el reloj lo vuelve a mostrar u ocultar.

## Clic en el mapa

Un clic sobre el agua o la costa (fuera de un buque o evento) abre un popup con:

- **Latitud y longitud en DMS**
- Datos de **viento, corrientes, olas o batimetría** si esas capas están activas
- Botón **Agregar marcador** (si usás Mis marcadores)

> tip: Es la forma más rápida de anotar un punto o de leer el medio ambiente en una coordenada concreta.

## Fuentes y buenas prácticas

El Centinela combina varias fuentes. Cada una tiene cobertura, demora y condiciones de uso distintas: eso es normal, no un fallo tuyo.

- **Mapa base y seamarks** — teselas del mapa e información de OpenSeaMap.
- **Posicionamiento SICEN** — GPS de movimientos deportivos activos; sistema propio de SICEN (investigación AN (CP) Nicolás MAREGA y AN (CP) Ignacio LA CAVA).
- **AIS** — en vivo (AISStream) y/o última conocida (Skylight); identidad OMI enriquecida cuando hay datos.
- **Skylight** — detecciones, pesca, STS y refuerzo AIS.
- **FIU / IUU LatAm** — análisis IUU de uso analítico / no comercial según su metodología.
- **Global Fishing Watch** — eventos e insights; uso **no comercial**. En pantalla aparece «Powered by Global Fishing Watch».
- **GEBCO** — batimetría.
- **MarineRegions / VLIZ** — límites marítimos de referencia (12 MN, 24 MN, ZEE).
- **Open-Meteo** — viento, corrientes, olas y forzado de las simulaciones HC / SAR.
- **Simulaciones HC y SAR** — cálculo propio sobre ese forzado; apoyo a la decisión, no modelo oficial ni ubicación certe.

> clave: Demoras, huecos de cobertura e incertidumbre de pronóstico son parte del trabajo con inteligencia marítima. Cuando la decisión sea crítica, **contrastá siempre** con otras fuentes operativas.
