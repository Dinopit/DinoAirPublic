# Multi-stage build for DinoAir Python Application
# Stage 1: Build dependencies and install packages
FROM python:3.11-slim AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements first for better layer caching
COPY requirements.txt requirements-test.txt ./

# Create virtual environment and install dependencies
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install Python dependencies with cache mount
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --upgrade pip && \
    pip install -r requirements.txt && \
    pip install -r requirements-test.txt

# Stage 2: Runtime image
FROM python:3.11-slim AS runtime

# Install only runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN groupadd -r dinoair && useradd -r -g dinoair dinoair

# Set working directory
WORKDIR /app

# Copy virtual environment from builder stage
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
ENV PYTHONPATH="/app"

# Copy application files
COPY start.py download_models.py install.py install_safe.py ./
COPY lib/ ./lib/
COPY personalities/ ./personalities/
COPY FreeTierPacked/ ./FreeTierPacked/
COPY config.example.yaml ./

# Create necessary directories and set permissions
RUN mkdir -p models output input temp && \
    chown -R dinoair:dinoair /app

# Switch to non-root user
USER dinoair

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import sys; sys.exit(0)"

# Set default environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Default command
CMD ["python", "start.py"]

# Stage 3: Development image (optional)
FROM runtime AS development

# Switch back to root for development tools installation
USER root

# Install development dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    vim \
    htop \
    && rm -rf /var/lib/apt/lists/*

# Copy test files
COPY tests/ ./tests/
COPY pytest.ini ./

# Switch back to non-root user
USER dinoair

# Development command
CMD ["python", "-m", "pytest", "-v"]