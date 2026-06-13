# OS7 Manager

Internal control-plane service for managing user app services in Docker Swarm.

The manager is a NestJS + TypeScript service. It talks to Docker Engine through `dockerode`.

The manager is expected to run on a Swarm manager node with access to:

```text
/var/run/docker.sock
```

Do not expose this service publicly. It can create, inspect, restart, and remove services in the cluster.

## Local container build

```bash
docker build -t os7/manager:local ./manager
```

## Published image

The `main` branch publishes the Docker image to GitHub Container Registry:

```text
ghcr.io/llm-to-apps/manager:latest
```

Tagged releases like `v0.1.0` also publish matching image tags.

## Development

```bash
npm install
npm run start:dev
```

Useful checks:

```bash
npm run typecheck
npm run build
```

## API

```text
GET /health
GET /docker/info
GET /swarm/services
POST /swarm/projects
```

Example project service request:

```json
{
  "id": "xxxYYY",
  "git": "git@github.com:llm-to-apps/project-123.git",
  "services": {
    "mysql": {
      "db": "xxxYYY",
      "user": "xxxYYY",
      "password": "xxxYYY"
    }
  },
  "env": {
    "MYSQL_HOST": "mysql",
    "MYSQL_PORT": "3306",
    "MYSQL_DATABASE": "xxxYYY",
    "MYSQL_USER": "xxxYYY",
    "MYSQL_PASSWORD": "xxxYYY",
    "DATABASE_URL": "mysql://xxxYYY:xxxYYY@mysql:3306/xxxYYY"
  },
  "domain": "demo.os7.dev",
  "ports": {
    "app": 3001,
    "agent": 7001
  }
}
```

The manager provisions the project MySQL database/user through root MySQL credentials and creates a Swarm service for the user instance. Runtime environment variables are passed from `env`; if the app needs `DATABASE_URL`, include it explicitly in `env`.

`POST /swarm/projects` requires these manager environment variables:

```text
USER_INSTANCE_IMAGE
MYSQL_HOST
MYSQL_ROOT_USER
MYSQL_ROOT_PASSWORD
```
