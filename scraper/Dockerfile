FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
 && python -c "import tls_requests; tls_requests.Client()"   # pre-download the TLS native library at build time
COPY main.py api.py db.py ./
ENV DATA_DIR=/data PYTHONUNBUFFERED=1 PYTHONUTF8=1
# default = command-line crawler (see docker-compose.yml: the "api" service overrides this with uvicorn)
ENTRYPOINT ["python", "main.py"]
