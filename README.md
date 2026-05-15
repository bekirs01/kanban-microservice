<div align="center">

# 🗂️ Kanban Microservices Platform

**Sistema de Gerenciamento de Tarefas com Arquitetura Distribuída**

[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![RabbitMQ](https://img.shields.io/badge/RabbitMQ-FF6600?style=for-the-badge&logo=rabbitmq&logoColor=white)](https://www.rabbitmq.com/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![Turborepo](https://img.shields.io/badge/Turborepo-EF4444?style=for-the-badge&logo=turborepo&logoColor=white)](https://turbo.build/)

<br/>

_Uma aplicação fullstack que demonstra padrões de arquitetura distribuída, comunicação híbrida entre serviços (TCP/RPC + Event-Driven), e práticas modernas de engenharia de software._

[Arquitetura](#-arquitetura-do-sistema) •
[Decisões Técnicas](#-decisões-de-engenharia--trade-offs) •
[Quick Start](#-quick-start) •
[API Docs](http://localhost:3001/api/docs)

</div>

---

## 📋 Visão Geral

Este projeto implementa um **Sistema Kanban** utilizando arquitetura de microsserviços, projetado para demonstrar:

- **Comunicação Híbrida**: Combinação estratégica de RPC síncrono (TCP) para operações críticas e mensageria assíncrona (RabbitMQ) para eventos
- **Isolamento de Domínios**: Cada serviço possui seu próprio schema de banco de dados, simulando databases separados
- **Event-Driven Architecture**: Notificações em tempo real via WebSocket, disparadas por eventos de domínio
- **Developer Experience**: Setup zero-config com Docker Compose, migrations automáticas e health checks

---

## 🏗️ Arquitetura do Sistema

### Visão de Alto Nível

```mermaid
graph TB
    subgraph "Cliente"
        FE[Frontend React]
    end

    subgraph "API Layer"
        GW[API Gateway<br/>NestJS - :3000]
    end

    subgraph "Microsserviços"
        AUTH[Auth Service<br/>NestJS - :3001]
        TASK[Task Service<br/>NestJS - :3002]
        NOTIF[Notification Service<br/>NestJS - :3003]
    end

    subgraph "Infraestrutura"
        PG[(PostgreSQL<br/>:5432)]
        RMQ[RabbitMQ<br/>:5672/:15672]
    end

    subgraph "Schemas PostgreSQL"
        AUTH_SCHEMA[auth_service]
        TASK_SCHEMA[task_service]
        NOTIF_SCHEMA[notification_service]
    end

    FE -->|HTTP/REST| GW
    GW -->|TCP/RPC| AUTH
    GW -->|TCP/RPC| TASK

    TASK -.->|Async Event| RMQ
    RMQ -.->|Consumer| NOTIF

    AUTH --> AUTH_SCHEMA
    TASK --> TASK_SCHEMA
    NOTIF --> NOTIF_SCHEMA

    AUTH_SCHEMA --> PG
    TASK_SCHEMA --> PG
    NOTIF_SCHEMA --> PG

    style FE fill:#61dafb,stroke:#333,stroke-width:2px,color:#000
    style GW fill:#e535ab,stroke:#333,stroke-width:2px,color:#000
    style AUTH fill:#ffd43b,stroke:#333,stroke-width:2px,color:#000
    style TASK fill:#ffd43b,stroke:#333,stroke-width:2px,color:#000
    style NOTIF fill:#ffd43b,stroke:#333,stroke-width:2px,color:#000
    style PG fill:#336791,stroke:#333,stroke-width:2px,color:#fff
    style RMQ fill:#ff6600,stroke:#333,stroke-width:2px,color:#000
```

### Padrões de Comunicação

| Fluxo                | Protocolo | Padrão           | Justificativa                           |
| -------------------- | --------- | ---------------- | --------------------------------------- |
| Frontend → Gateway   | HTTP/REST | Request-Response | Compatibilidade com browsers            |
| Gateway → Auth/Task  | TCP/RPC   | Request-Response | Baixa latência para operações síncronas |
| Task → Notifications | RabbitMQ  | Pub/Sub          | Desacoplamento e resiliência            |

---

### Modelo de Dados (ER Diagram)

```mermaid
erDiagram
    %% ==========================================
    %% SCHEMA: auth_service
    %% ==========================================
    users {
        uuid id PK
        varchar email UK
        varchar name
        varchar password_hash
        varchar refresh_token_hash
        timestamp created_at
        timestamp updated_at
    }

    %% ==========================================
    %% SCHEMA: task_service
    %% ==========================================
    tasks {
        uuid id PK
        varchar title
        text description
        enum status "pending, in_progress, completed"
        enum priority "low, medium, high"
        uuid assigned_to FK "LOGICAL: auth_service.users.id"
        timestamp due_date
        timestamp created_at
        timestamp updated_at
    }

    task_history {
        uuid id PK
        uuid task_id FK
        uuid user_id FK "LOGICAL: auth_service.users.id"
        varchar field_changed
        text old_value
        text new_value
        timestamp changed_at
    }

    task_comments {
        uuid id PK
        uuid task_id FK
        uuid user_id FK "LOGICAL: auth_service.users.id"
        text content
        timestamp created_at
        timestamp updated_at
    }

    %% ==========================================
    %% SCHEMA: notification_service
    %% ==========================================
    notifications {
        uuid id PK
        uuid user_id FK "LOGICAL: auth_service.users.id"
        varchar type
        varchar title
        text message
        jsonb metadata
        boolean is_read
        timestamp created_at
        timestamp read_at
    }

    %% Relacionamentos DENTRO do mesmo schema (Physical FK)
    tasks ||--o{ task_history : "has"
    tasks ||--o{ task_comments : "has"

    %% Relacionamentos CROSS-SCHEMA (Logical Reference - dotted lines)
    tasks }o..|| users : "assigned_to (logical)"
    task_history }o..|| users : "changed_by (logical)"
    task_comments }o..|| users : "created_by (logical)"
    notifications }o..|| users : "belongs_to (logical)"
```

> **Nota sobre Cross-Schema References**: As foreign keys entre schemas são **referências lógicas** (via UUID), não constraints físicas. Esta decisão mantém o desacoplamento entre microsserviços, simulando o cenário de produção onde cada serviço teria seu próprio database.

---

## ⚡ Features Técnicas

### Backend

| Feature                     | Implementação                             | Benefício                                                   |
| --------------------------- | ----------------------------------------- | ----------------------------------------------------------- |
| **API Gateway Pattern**     | NestJS com proxy TCP                      | Single entry point, centralização de concerns cross-cutting |
| **Audit Trail**             | `task_history` com triggers de domínio    | Rastreabilidade completa de alterações                      |
| **JWT + Refresh Tokens**    | Access token (15min) + Refresh token (7d) | Segurança com UX balanceada                                 |
| **Real-time Notifications** | Socket.io + RabbitMQ consumers            | Push notifications sem polling                              |
| **Schema Isolation**        | PostgreSQL schemas por serviço            | Bounded contexts com isolamento de dados                    |

### Frontend

| Feature                | Implementação            | Benefício                               |
| ---------------------- | ------------------------ | --------------------------------------- |
| **Optimistic Updates** | TanStack Query mutations | UX responsiva                           |
| **Drag & Drop Kanban** | @dnd-kit                 | Interação natural de board              |
| **Type Safety E2E**    | Shared `types` package   | Contratos unificados backend ↔ frontend |

### DevOps

| Feature               | Implementação                  | Benefício                       |
| --------------------- | ------------------------------ | ------------------------------- |
| **Zero-Config Setup** | Docker Compose + health checks | `docker compose up` e pronto    |
| **Auto Migrations**   | TypeORM migrations no startup  | Database sempre sincronizado    |
| **Monorepo**          | Turborepo                      | Build caching, dependency graph |

---

## 🧠 Decisões de Engenharia & Trade-offs

Esta seção documenta as principais decisões arquiteturais, demonstrando o processo de análise de trade-offs aplicado durante o desenvolvimento.

---

### 1. Arquitetura de Comunicação Híbrida

<table>
<tr>
<td width="50%">

**🎯 Problema**

Microsserviços precisam se comunicar. A escolha de um único protocolo (HTTP, gRPC, ou mensageria) força trade-offs em todos os cenários de uso.

</td>
<td width="50%">

**💡 Solução**

Adoção de comunicação híbrida:

- **TCP/RPC** para operações síncronas (auth, CRUD)
- **RabbitMQ** para eventos assíncronos (notificações)

</td>
</tr>
</table>

**Análise de Trade-offs:**

| Aspecto         | Impacto                                              |
| --------------- | ---------------------------------------------------- |
| ✅ Performance  | TCP elimina overhead HTTP em chamadas internas       |
| ✅ Resiliência  | Mensageria garante entrega mesmo com serviço offline |
| ✅ UX           | Operações críticas retornam imediatamente            |
| ⚠️ Complexidade | Dois protocolos = mais pontos de configuração        |

---

### 2. Isolamento de Dados via PostgreSQL Schemas

<table>
<tr>
<td width="50%">

**🎯 Problema**

A teoria de microsserviços preconiza "um database por serviço". Porém, rodar 3+ instâncias de PostgreSQL localmente consome recursos excessivos e complica o setup.

</td>
<td width="50%">

**💡 Solução**

Uma única instância PostgreSQL com **schemas isolados** (`auth_service`, `task_service`, `notification_service`). Cada serviço acessa exclusivamente seu schema.

</td>
</tr>
</table>

**Análise de Trade-offs:**

| Aspecto        | Impacto                                           |
| -------------- | ------------------------------------------------- |
| ✅ Recursos    | ~70% menos consumo de RAM vs múltiplas instâncias |
| ✅ Operacional | Setup simplificado para desenvolvimento           |
| ✅ Isolamento  | Schemas garantem separação lógica de dados        |
| ⚠️ SPOF        | Single point of failure (mitigável em produção)   |

> **Nota de Produção**: Em ambiente de produção, cada serviço teria seu próprio database instance, eliminando o SPOF. A arquitetura atual facilita esta migração sem alterações de código.

---

### 3. Orquestração de Startup com Health Checks

<table>
<tr>
<td width="50%">

**🎯 Problema**

Race conditions clássicas: aplicação tenta conectar antes do banco/broker estarem prontos. Resultado: crashes no startup, necessidade de restarts manuais.

</td>
<td width="50%">

**💡 Solução**

- Health checks nativos no Docker Compose
- `depends_on: service_healthy` para ordenação
- Migrations automáticas no entrypoint

</td>
</tr>
</table>

**Análise de Trade-offs:**

| Aspecto           | Impacto                                     |
| ----------------- | ------------------------------------------- |
| ✅ DX             | Comando único: `docker compose up`          |
| ✅ Confiabilidade | Zero race conditions no startup             |
| ✅ Consistência   | Database sempre na versão correta           |
| ⚠️ Cold Start     | ~15-30s adicionais aguardando health checks |

---

## 📁 Estrutura do Monorepo

```
kanban-microservices/
│
├── apps/                                    # Aplicações deployáveis
│   ├── api-gateway/                         # 🚪 Entry point HTTP
│   │   └── src/
│   │       ├── common/filters/              # Exception filters (RPC → HTTP)
│   │       └── [modules]/                   # Controllers por domínio
│   │
│   ├── auth-service/                        # 🔐 Autenticação & Usuários
│   │   ├── db/migrations/                   # Migrations do schema auth_service
│   │   └── src/auth/                        # JWT, bcrypt, refresh tokens
│   │
│   ├── tasks-service/                       # 📋 Core Domain
│   │   ├── db/migrations/                   # Migrations do schema task_service
│   │   └── src/
│   │       ├── task/                        # CRUD + Event publishing
│   │       ├── history/                     # Audit trail
│   │       └── comment/                     # Task comments
│   │
│   ├── notifications-service/               # 🔔 Event Consumer
│   │   └── src/
│   │       ├── notifications.gateway.ts     # WebSocket (Socket.io)
│   │       └── notifications/               # RabbitMQ consumers
│   │
│   └── web/                                 # ⚛️ Frontend SPA
│       └── src/
│           ├── components/                  # UI Components (Shadcn)
│           ├── hooks/                       # React Query + WebSocket
│           ├── services/                    # API Layer (Axios)
│           └── pages/                       # Route components
│
├── packages/                                # Bibliotecas compartilhadas
│   ├── types/                               # 📦 DTOs, Enums, Interfaces
│   │   ├── dto/                             # Data Transfer Objects
│   │   └── payloads/                        # Event payloads (RabbitMQ/JWT)
│   ├── exceptions/                          # Standardized error handling
│   └── eslint-config/                       # Shared linting rules
│
├── scripts/
│   └── seed.ts                              # Database seeding
│
├── docker-compose.yml                       # Infrastructure orchestration
└── turbo.json                               # Monorepo build pipeline
```

---

## 🚀 Quick Start

### Pré-requisitos

- Docker & Docker Compose v2+
- Node.js 18+ _(opcional, para desenvolvimento local)_

### Executando o Projeto

```bash
# Clone o repositório
git clone <repository-url>
cd kanban-microservices

# Suba toda a stack
docker compose up -d --build

# Aguarde os health checks (30-60s no primeiro build)
docker compose logs -f
```

### Acessos

| Serviço                 | URL                            | Credenciais   |
| ----------------------- | ------------------------------ | ------------- |
| **Frontend**            | http://localhost:5173          | —             |
| **API Docs (Swagger)**  | http://localhost:3001/api/docs | —             |
| **RabbitMQ Management** | http://localhost:15672         | admin / admin |

### Seed de Dados (Opcional)

```bash
# Com os containers rodando
npm install && npm run seed
```

---

## 📚 Tech Stack

| Camada        | Tecnologias                                            |
| ------------- | ------------------------------------------------------ |
| **Backend**   | NestJS, TypeScript, TypeORM, class-validator           |
| **Frontend**  | React 18, Vite, TailwindCSS, TanStack Query, Shadcn/UI |
| **Database**  | PostgreSQL 15                                          |
| **Messaging** | RabbitMQ 3.12                                          |
| **Infra**     | Docker, Docker Compose, Turborepo                      |
| **Testing**   | Jest, React Testing Library                            |

---

## 🗺️ Roadmap & Melhorias Futuras

### Melhorias de Resiliência

- [ ] **Dead Letter Exchanges (DLX)** — Isolamento de poison messages no RabbitMQ
- [ ] **Circuit Breaker** — Padrão via `opossum` nas chamadas TCP do Gateway
- [ ] **Retry Policies** — Exponential backoff para consumers

### Melhorias de Segurança

- [ ] **Session Management (Redis)** — Token blacklist e revogação imediata
- [ ] **Rate Limiting** — Throttling no API Gateway

### Melhorias de Observabilidade

- [ ] **Distributed Tracing** — OpenTelemetry + Jaeger
- [ ] **Structured Logging** — Correlação de logs entre serviços
- [ ] **Metrics** — Prometheus + Grafana dashboards

### Melhorias de Consistência

- [ ] **Optimistic Locking** — `@VersionColumn` para operações concorrentes
- [ ] **Contract Testing** — Pact ou similar para validar contratos entre serviços

---

## 🐛 Troubleshooting

<details>
<summary><strong>Erro: "Port already in use"</strong></summary>

Verifique se as portas `3000`, `3001`, `3002`, `3003`, `5173`, `5432` e `5672` estão livres.

```bash
docker compose down -v
lsof -i :3000  # Identifica processo na porta
```

</details>

<details>
<summary><strong>Containers reiniciando em loop</strong></summary>

Geralmente indica que o PostgreSQL ou RabbitMQ ainda não passou no health check. Aguarde ~60s ou verifique os logs:

```bash
docker compose logs postgres rabbitmq
```

</details>

<details>
<summary><strong>Migrations não executaram</strong></summary>

Execute manualmente:

```bash
docker compose exec auth-service npm run migration:run
docker compose exec tasks-service npm run migration:run
```

</details>

---

<div align="center">

**Desenvolvido com ☕ e boas práticas de engenharia**

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0A66C2?style=flat-square&logo=linkedin&logoColor=white)](https://linkedin.com/in/thiago-gritti)
[![GitHub](https://img.shields.io/badge/GitHub-181717?style=flat-square&logo=github&logoColor=white)](https://github.com/thiagoDOTjpeg)

</div>
