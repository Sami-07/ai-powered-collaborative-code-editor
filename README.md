# Code Collab

An AI-powered collaborative code editor with isolated code execution and real-time collaboration capabilities.

## 🎥 Demo Video

https://github.com/user-attachments/assets/9bd830c5-fa6c-47a3-84a9-f2a91c3fb3d0

## 🚀 Features

- **Real-time Collaborative Editing**: Multiple users can edit code with cursor tracking simultaneously using Y.js and WebSockets
- **Isolated Code Execution**: Execute code in isolated environment safely using self-hosted Judge0
- **AI-Powered Assistance**: Get intelligent code suggestions and help via OpenAI API
- **WebSocket Server**: Custom-built scalable WebSocket server for Chat feature with Redis pub/sub for horizontal scaling
- **User Authentication**: Secure user management with Clerk
- **Modern UI**: Clean, responsive interface built with Next.js and Tailwind CSS
- **Scalable Architecture**: Monorepo setup with Turborepo for efficient development

## 🏗️ Architecture

![Code Collab Architecture](https://github.com/user-attachments/assets/c864db0c-fd0d-4393-a67f-3c8d6a4537f5)

### Monorepo Structure

```
code-collab/
├── apps/                 # Application packages
│   ├── web/              # Next.js frontend application
│   └── websocket/        # Custom WebSocket server
├── packages/             # Shared packages
│   ├── db/               # Prisma database schema and client
│   ├── ui/               # Shared UI components
│   ├── eslint-config/    # ESLint configuration
│   └── typescript-config/# TypeScript configuration
└── docker/               # Docker configuration files
```
### AutoScaling Group Configuration

![AutoScaling Group Configuration](https://github.com/user-attachments/assets/9bd830c5-fa6c-47a3-84a9-f2a91c3fb3d0)


### AutoScaling Demo

![AutoScaling Demo](https://github.com/user-attachments/assets/f777a70c-2047-419d-bee8-092d04577ab9)

### Technology Stack

- **Frontend**: Next.js, React, TailwindCSS, shadcn/ui
- **Real-time Collaboration**: Y.js, CodeMirror, WebSockets
- **Backend**: Node.js, Express
- **Database**: PostgreSQL, Prisma ORM
- **Execution Environment**: Containerized Judge0 (self-hosted)
- **Deployment**: Docker, Linode, AWS Auto Scaling
- **Scaling**: Redis pub/sub for WebSocket scaling
- **Authentication**: Clerk

## 🛠️ Deployment Architecture

### Current Setup
- **Web App**: A full-stack application built with Next.js, TailwindCSS, shadcn/ui, and Prisma ORM which has a frontend and backend. The frontend has features like creating rooms, real-time collaborative code editor, chat, and a dashboard.
- **WebSocket Server**: Deployed a WebSocket server on Linode server which is highly scalable and can handle a large number of connections due to Redis pub/sub. 
- **Judge0**: Self-hosted on a single Linode server for isolated code execution.

### In Progress
- **AWS Auto Scaling**: Migrating Judge0 to AWS Auto Scaling group with custom metrics
- **Redis Queue**: Tracking code submissions for scaling metrics



