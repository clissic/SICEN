# SICEN-sim — simulador de derrames HC (OpenOil / Lagrangian)
#
# Desarrollo local (Windows, sin Docker):
#   python -m venv .venv
#   .venv\Scripts\activate
#   pip install -r requirements.txt
#   uvicorn app.main:app --host 127.0.0.1 --port 8091
#
# Docker (Linux; preferido para OpenDrift completo):
#   docker build -t sicen-sim .
#   docker run --rm -p 8091:8091 sicen-sim
#
# El MVP usa un motor Lagrangian compatible con OpenOil (advección + windage
# + weathering NOAA-like). Si está instalado `opendrift`, se puede forzar con
# SICEN_SIM_ENGINE=opendrift (imagen Docker).

FROM python:3.11-slim-bookworm

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgeos-dev \
    libproj-dev \
    proj-data \
    proj-bin \
    libgdal-dev \
    gdal-bin \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt requirements-opendrift.txt ./
RUN pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir -r requirements-opendrift.txt || true

COPY app ./app
COPY scripts ./scripts

ENV SICEN_SIM_ENGINE=auto
ENV SICEN_SIM_CACHE_DIR=/data/cache
ENV PORT=8091

EXPOSE 8091
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8091"]
