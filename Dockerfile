FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    make \
    cmake \
    build-essential \
    libsndfile1 \
    ffmpeg \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install creapy from git
RUN pip install --no-cache-dir git+https://gitlab.tugraz.at/speech/creapy.git

# Copy creapy source to get real config and models
COPY creapy/creapy/config.yaml ./creapy_config.yaml
COPY creapy/creapy/user_config.yaml ./creapy_user_config.yaml
COPY creapy/creapy/model/training_models/ ./training_models/

# Setup script to initialize creapy properly
COPY setup_creapy_docker.py .
RUN python setup_creapy_docker.py

# Copy application files
COPY app.py .
COPY static ./static

EXPOSE 8000

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]