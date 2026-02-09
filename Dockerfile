# Stage 1: Prepare Rust dependency recipe with cargo-chef

# Note: Using Debian-based Rust image because Alpine's musl doesn't support cdylib on ARM64
FROM rust:1.90-slim AS chef

RUN cargo install cargo-chef

WORKDIR /build

#===========================================================
# Stage 2: Analyze dependencies

FROM chef AS planner

COPY lib/simulator ./lib/simulator
RUN cd lib/simulator && cargo chef prepare --recipe-path recipe.json

#===========================================================
# Stage 3: Build Rust dependencies (cached unless Cargo.toml/Cargo.lock changes)

FROM chef AS rust-builder

RUN apt-get update && apt-get install -y \
	pkg-config \
	libssl-dev \
	curl \
	&& rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
	apt-get install -y nodejs && \
	rm -rf /var/lib/apt/lists/*

WORKDIR /build

COPY --from=planner /build/lib/simulator/recipe.json ./lib/simulator/recipe.json
RUN cd lib/simulator && cargo chef cook --release --recipe-path recipe.json

COPY lib/simulator ./lib/simulator
RUN cd lib/simulator && cargo build --release

#===========================================================
# Stage 4: Generate Node.js bindings with napi-rs

FROM rust-builder AS napi-builder

WORKDIR /build

# Install napi dependencies and build Node.js module
RUN cd lib/simulator && npm ci && npm run build

#===========================================================
# Stage 5: Build main application

FROM node:20-slim AS app-builder

# Install build dependencies for native modules
RUN apt-get update && apt-get install -y \
	python3 \
	make \
	g++ \
	&& rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install dependencies (cached unless package.json/yarn.lock changes)
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Copy built simulator artifacts
COPY --from=napi-builder /build/lib/simulator/dist ./lib/simulator/dist

# Copy application source and build
COPY src/ ./src/
COPY tsconfig.build.json tsconfig.json ./
RUN yarn build

#===========================================================
# Stage 6: Production image

FROM node:20-slim

WORKDIR /app

# Install production dependencies only
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production

# Copy built application and simulator
COPY --from=app-builder /app/dist ./dist
COPY --from=napi-builder /build/lib/simulator/dist ./lib/simulator/dist

CMD ["node", "dist/main"]
