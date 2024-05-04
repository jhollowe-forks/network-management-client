ARG IMG_VERSION=1-1-bullseye
FROM mcr.microsoft.com/devcontainers/rust:${IMG_VERSION}

RUN apt-get update && apt-get install -y \
  build-essential \
  curl \
  file \
  libayatana-appindicator3-dev \
  libgtk-3-dev \
  librsvg2-dev \
  libssl-dev \
  libwebkit2gtk-4.0-dev \
  wget \
  && rm -rf /var/lib/apt/lists/*
