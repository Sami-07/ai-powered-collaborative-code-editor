# Code Collab

An AI-powered collaborative code editor with isolated code execution and real-time collaboration capabilities.

## 🎥 Demo Video

https://github.com/user-attachments/assets/9bd830c5-fa6c-47a3-84a9-f2a91c3fb3d0

## 🚀 Features

- **Real-time Collaborative Editing**: Multiple users can edit code with cursor tracking simultaneously using Y.js and WebSockets
- **Isolated Code Execution**: Execute code in isolated environment safely using self-hosted Judge0 with AWS Auto Scaling groups and AWS SQS queue-based scaling
- **AI-Powered Assistance**: Get intelligent code suggestions and help via OpenAI API and interact with Jarvis AI via Chat Interface for real-time assistance
- **WebSocket Server**: Custom-built scalable WebSocket server for Chat feature with Redis pub/sub for horizontal scaling
- **User Authentication**: Secure user management with Clerk
- **Modern UI**: Clean, responsive interface built with Next.js and Tailwind CSS
- **Scalable Architecture**: Monorepo setup with Turborepo for efficient development with Docker and AWS Auto Scaling groups

## 🏗️ Architecture

![Code Collab Architecture](https://github.com/user-attachments/assets/c864db0c-fd0d-4393-a67f-3c8d6a4537f5)



## 🛠️ Deployment Architecture

### Current Setup
- **Web App**: A full-stack application built with Next.js, TailwindCSS, shadcn/ui, and Prisma ORM which has a frontend and backend. The frontend has features like creating rooms, real-time collaborative code editor, chat, and a dashboard.
- **WebSocket Server**: WebSocket server is highly scalable and can handle a large number of connections due to Redis pub/sub. 
- **Judge0**: Self-hosted Judge0 running on AWS Auto Scaling groups with AWS SQS queue-based scaling. The system maintains around 10 messages in the queue, automatically scaling up instances when the queue grows larger and scaling down when the queue decreases.
- **AWS CloudWatch**: Monitors instance and queue metrics to facilitate the auto-scaling policy.
- **Custom AMI**: Created a specialized Amazon Machine Image with Judge0 and CloudWatch configurations for consistent deployment.

### Scaling Infrastructure
- **AWS SQS Queue**: Code submissions are enqueued to SQS, which triggers scaling events based on queue length.
- **Auto Scaling Policy**: Configured to maintain approximately 10 messages in the queue at any time, adding instances when the queue grows and removing them when it shrinks.
- **CloudWatch Integration**: Each instance reports metrics to CloudWatch for monitoring and scaling decisions.


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

![AutoScaling Group Configuration](https://github.com/user-attachments/assets/8f24c30a-b35f-4185-9a74-a67723e9ace5)


### AutoScaling Demo

![AutoScaling Demo](https://github.com/user-attachments/assets/378447d1-8ec9-444c-998f-c5e3685af023)

### Technology Stack

- **Frontend**: Next.js, React, TailwindCSS, shadcn/ui
- **Real-time Collaboration**: Y.js, CodeMirror, WebSockets
- **Backend**: Node.js, Express
- **Database**: PostgreSQL, Prisma ORM
- **Execution Environment**: Containerized Judge0 (self-hosted)
- **Deployment**: Docker, Linode, AWS Auto Scaling
- **Scaling**: Redis pub/sub for WebSocket scaling
- **Authentication**: Clerk




