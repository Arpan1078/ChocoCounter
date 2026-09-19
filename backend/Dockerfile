FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend.py .
COPY seed_catalog.py .
COPY start.sh .

RUN chmod +x /app/start.sh \
    && mkdir -p /app/uploads

EXPOSE 8000

CMD ["/app/start.sh"]
