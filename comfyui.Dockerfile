# Multi-stage build for ComfyUI Backend Service
# Stage 1: Build dependencies and install packages  
FROM python:3.11-slim AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    git \
    curl \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Create virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Clone ComfyUI and install dependencies
RUN git clone https://github.com/comfyanonymous/ComfyUI.git . && \
    pip install --upgrade pip

# Install ComfyUI requirements with cache mount
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt && \
    pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu

# Install additional dependencies for DinoAir integration
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install requests tqdm

# Stage 2: Runtime image
FROM python:3.11-slim AS runtime

# Install only runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN groupadd -r comfyui && useradd -r -g comfyui comfyui

# Set working directory
WORKDIR /app

# Copy virtual environment from builder stage
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
ENV PYTHONPATH="/app"

# Copy ComfyUI application from builder
COPY --from=builder /app/ ./

# Create necessary directories and set permissions
RUN mkdir -p models output input custom_nodes temp && \
    chown -R comfyui:comfyui /app

# Switch to non-root user
USER comfyui

# Expose ComfyUI port
EXPOSE 8188

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8188/ || exit 1

# Set default environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Default command to start ComfyUI
CMD ["python", "main.py", "--listen", "0.0.0.0", "--port", "8188"]

# Stage 3: Development image (optional)
FROM runtime AS development

# Switch back to root for development tools
USER root

# Install development dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    vim \
    htop \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Install development Python packages
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install ipython jupyter

# Switch back to non-root user
USER comfyui

# Development command with verbose logging
CMD ["python", "main.py", "--listen", "0.0.0.0", "--port", "8188", "--verbose"]