IMAGE_REPO = europe-north2-docker.pkg.dev/crypto-galaxy-385309/docker-registry/swag-bot
IMAGE_TAG = latest

.PHONY: build push deploy docker-login help

build:
	@echo "Building Docker image..."
	docker build --platform linux/amd64 -t $(IMAGE_REPO):$(IMAGE_TAG) .

push: build
	@echo "Pushing Docker image..."
	docker push $(IMAGE_REPO):$(IMAGE_TAG)

deploy: push
	@echo "Docker image pushed! ArgoCD will handle the deployment."
	@echo "Check ArgoCD UI for deployment status."

docker-login:
	@echo "Configuring Docker for Artifact Registry..."
	gcloud auth configure-docker europe-north2-docker.pkg.dev

help:
	@echo "Available commands:"
	@echo "  build        - Build Docker image"
	@echo "  push         - Build and push Docker image"
	@echo "  deploy       - Build and push (ArgoCD handles deployment)"
	@echo "  docker-login - Configure Docker for Artifact Registry" 
