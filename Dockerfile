# Multi-stage build: Frontend + Backend in one image

# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend files
COPY frontend/package.json frontend/package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY frontend . 

# Build React app - produces /app/frontend/dist
RUN npm run build

# Stage 2: Build Backend with Frontend
FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements
COPY backend/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend .

# Copy built frontend dist into backend (to serve static files)
COPY --from=frontend-builder /app/frontend/dist ./frontend_dist

# Create logs directory
RUN mkdir -p /app/logs

# Expose ports
EXPOSE 8000

# Start backend (which will serve both API and frontend)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
