# Kubernetes Deployment for Judge0-based Code Execution Platform

This directory contains Kubernetes manifests for deploying a complete Judge0-based code execution platform with auto-scaling capabilities.

## Architecture

The system consists of the following components:

1. **NextJS Frontend**: Serves the web application for code collaboration
2. **Judge0 API Server**: Handles code execution requests
3. **Judge0 Workers**: Processes and executes code submissions
4. **Redis**: Used for caching and queue management
5. **PostgreSQL**: Database for storing code submissions and results
6. **Webhook Handler**: Processes webhooks from Judge0 to update database
7. **KEDA**: Kubernetes Event-driven Autoscaler for scaling Judge0 workers based on Redis queue length

## Prerequisites

- Kubernetes cluster (1.19+)
- kubectl configured to access your cluster
- Helm (optional, for ingress-nginx and cert-manager)
- Docker registry access for pushing custom images

## Custom Images

You need to build and push the following custom images:

1. **NextJS Application**: Build your NextJS app and push to your registry
2. **Webhook Handler**: Build the Node.js webhook handler and push to your registry

Update the image references in the YAML files with your actual image paths.

## Deployment Steps

1. Install KEDA (Kubernetes Event-driven Autoscaler):
   ```
   kubectl apply -f 00-keda.yaml
   ```

2. Create the namespace:
   ```
   kubectl apply -f 00-namespace.yaml
   ```

3. Create ConfigMaps and Secrets:
   ```
   kubectl apply -f 01-configmap.yaml
   kubectl apply -f 02-secrets.yaml
   ```
   
   Note: In production, you should use a proper secrets management solution.

4. Deploy Redis and PostgreSQL:
   ```
   kubectl apply -f 03-postgres.yaml
   kubectl apply -f 04-redis.yaml
   ```

5. Deploy Judge0 API Server and Workers:
   ```
   kubectl apply -f 05-judge0-api.yaml
   kubectl apply -f 06-judge0-workers.yaml
   ```

6. Deploy NextJS and Webhook Handler:
   ```
   kubectl apply -f 07-nextjs-app.yaml
   kubectl apply -f 08-webhook-handler.yaml
   ```

7. Deploy the KEDA ScaledObject for Judge0 Workers:
   ```
   kubectl apply -f 09-judge0-workers-keda.yaml
   ```

8. Deploy the Ingress:
   ```
   kubectl apply -f 11-ingress.yaml
   ```

## Auto-scaling with KEDA and Redis

This deployment uses KEDA (Kubernetes Event-driven Autoscaler) to scale Judge0 workers based on your custom Redis queue length, which is a more efficient approach than using a custom metrics adapter.

### How KEDA Scaling Works

1. When users submit code through your NextJS app, add an entry to your custom Redis queue (`custom:submissions:queue`)
2. KEDA monitors the Redis queue length directly
3. When the queue length exceeds 10 items, KEDA automatically scales up the Judge0 workers
4. As items in the queue are processed, KEDA scales down workers after a cooldown period

### Advantages of KEDA over Custom Metrics Adapter

- **Simplicity**: No need to build and maintain a custom metrics adapter
- **Reliability**: KEDA is a CNCF sandbox project with wide community support
- **Performance**: Direct integration with Redis for more efficient monitoring
- **Advanced scaling features**: Fine-grained control over scaling behavior
- **Multiple triggers**: Can scale based on multiple different event sources if needed

## Working with Your Custom Queue

Add submissions to your custom queue when users submit code:

```javascript
// Example in Node.js using ioredis
const Redis = require('ioredis');
const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD
});

async function addSubmissionToQueue(submissionData) {
  // Add to custom queue
  await redis.lpush('custom:submissions:queue', JSON.stringify(submissionData));
  
  // Then send to Judge0 for processing
  // ...
}
```

Process submissions from your queue in your application logic:

```javascript
// Example in Node.js
async function processSubmissionsQueue() {
  while (true) {
    // Get submission from queue with timeout
    const result = await redis.brpop('custom:submissions:queue', 30);
    
    if (result) {
      const [queueName, submissionStr] = result;
      const submission = JSON.parse(submissionStr);
      
      // Process the submission using Judge0
      // ...
    }
  }
}
```

## Customization

- Update the `JUDGE0_AUTH_TOKEN` in the secrets file for API security
- Adjust resource requests and limits based on your workload
- Update the ingress host to your actual domain name
- Modify the KEDA ScaledObject settings to match your scaling needs:
  - Change the `listLength` to adjust the queue length threshold (currently 10)
  - Adjust `pollingInterval` and `cooldownPeriod` for different scaling behavior
  - Modify `minReplicaCount` and `maxReplicaCount` based on your capacity needs

## Troubleshooting

To check KEDA ScaledObject status:
```
kubectl get scaledobject -n code-collab
```

To check the underlying HPA created by KEDA:
```
kubectl get hpa -n code-collab
```

To check the custom queue length directly:
```
kubectl exec -it -n code-collab deployment/keda-operator -- redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD llen custom:submissions:queue
```

To see KEDA operator logs:
```
kubectl logs -n keda deployment/keda-operator
``` 