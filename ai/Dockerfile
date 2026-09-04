FROM python:3.12-slim

WORKDIR /app

# Dependencies first, so a code change does not reinstall them.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY tests ./tests

# Non-root: the risk engine has no reason to run with more.
RUN useradd --create-home --uid 10001 weathergpt && chown -R weathergpt /app
USER weathergpt

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
