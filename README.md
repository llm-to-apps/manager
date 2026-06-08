# LLAgents Manager

Internal control-plane service for managing user app services in Docker Swarm.

The manager is a NestJS + TypeScript service. It talks to Docker Engine through `dockerode`.

The manager is expected to run on a Swarm manager node with access to:

```text
/var/run/docker.sock
```

Do not expose this service publicly. It can create, inspect, restart, and remove services in the cluster.

## Local container build

```bash
docker build -t llagents/manager:local ./manager
```

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

## Swarm stack example

```bash
docker stack deploy -c manager/stack.yml llagents
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
  "projectId": "123",
  "repoUrl": "git@github.com:llagents/project-123.git",
  "databaseUrl": "mysql://project_123_user:password@mysql-host:3306/project_123",
  "domain": "xyz.llmagents.com",
  "appPort": 3001,
  "agentPort": 7001
}
```

`POST /swarm/projects` requires these manager environment variables:

```text
PUBLIC_NETWORK_ID
INTERNAL_NETWORK_ID
USER_INSTANCE_IMAGE
```
