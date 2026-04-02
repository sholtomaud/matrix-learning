IMAGE_APP := editor-plus-plus
CONTAINER_NAME := editor-plus-plus-dev

.PHONY: all start build dev shell stop clean logs

all: build

start:
	@echo "🔌 Checking container system service..."
	@container system start 2>/dev/null || true
	@sleep 1

build: start
	@if [ ! -f package.json ]; then \
		echo '{"name": "editor-plus-plus", "version": "0.0.0", "scripts": {"dev": "vite"}}' > package.json; \
		echo "✨ Created baseline package.json to bootstrap container."; \
	fi
	@echo "🔨 Building App image '$(IMAGE_APP)'..."
	container build -t "$(IMAGE_APP)" -f Dockerfile .
	@echo "✅ App build complete."

dev: start
	@if [ -z "$$(container images -q $(IMAGE_APP))" ]; then $(MAKE) build; fi
	@echo "🚀 Starting development server with Hot Reload..."
	container run -it --rm \
		--publish 3000:3000 \
		-v "$(PWD):/app" \
		-v /app/node_modules \
		--name "$(CONTAINER_NAME)" \
		"$(IMAGE_APP)" bash -c "cp ~/.office-addin-dev-certs/ca.crt /app/ca.crt 2>/dev/null || true && npm run dev"

shell: start
	@echo "🐚 Entering shell..."
	container run -it --rm -v "$(PWD):/app" -v /app/node_modules "$(IMAGE_APP)" bash

stop:
	@echo "🛑 Stopping any running containers..."
	-container stop "$(CONTAINER_NAME)" 2>/dev/null || true

clean: stop
	@echo "🧹 Removing images..."
	-container rmi "$(IMAGE_APP)" 2>/dev/null || true

logs:
	container logs --follow "$(CONTAINER_NAME)"