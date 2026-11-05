# SICEN-sim — simulador de derrames HC (OpenOil / Lagrangian)
#
# Desarrollo local (Windows, sin Docker):
#   python -m venv .venv
#   .venv\Scripts\activate
#   pip install -r requirements.txt
#   uvicorn app.main:app --host 127.0.0.1 --port 8091
#
# Docker (Linux; preferido para OpenDrift completo):
#   docker build -t sicen-sim:latest .
#   docker run --rm -p 8091:8091 sicen-sim:latest
#
# El MVP usa un motor Lagrangian compatible con OpenOil (advección + windage
# + weathering NOAA-like). Si está instalado `opendrift`, se puede forzar con
# SICEN_SIM_ENGINE=opendrift (imagen Docker).

FROM python:3.11.11-slim-bookworm

WORKDIR /app

# Dependencias del sistema para GEOS, PROJ, GDAL (necesarias para OpenDrift)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgeos-dev \
    libproj-dev \
    proj-data \
    proj-bin \
    libgdal-dev \
    gdal-bin \
    && rm -rf /var/lib/apt/lists/*

# Copiamos requirements y los instalamos con versiones pinneadas
COPY requirements.txt requirements-opendrift.txt ./

# Actualizamos pip/setuptools, instalamos dependencias base y luego OpenDrift (puede fallar en ciertas archs)
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir -r requirements-opendrift.txt || true

# Copiamos el código fuente
COPY app ./app
COPY scripts ./scripts

# Usuario no-root para ejecutar la app
RUN addgroup --gid 10002 sicensim && \
    adduser --disabled-password --uid 10002 --gid 10002 --gecos "" sicensim && \
    mkdir -p /data/cache && \
    chown -R sicensim:sicensim /app /data

USER sicensim

ENV SICEN_SIM_ENGINE=auto
ENV SICEN_SIM_CACHE_DIR=/data/cache
ENV PORT=8091

EXPOSE 8091

# Healthcheck: verifica que FastAPI responda en /docs (ruta pública)
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8091/docs').read()" || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8091"]
