// ---------------------------------------------------------------------------
// Agent Arena Battle — Azure Infrastructure
// Deploys: Container Apps (backend) + Static Web App (frontend)
// ---------------------------------------------------------------------------

@description('Azure region for all resources')
param location string = resourceGroup().location

@description('Environment name (dev, staging, prod)')
param envName string = 'dev'

@description('Backend container image (e.g. myacr.azurecr.io/arena-backend:latest)')
param backendImage string

@description('Frontend container image (e.g. myacr.azurecr.io/arena-frontend:latest)')
param frontendImage string

@description('OpenAI API key (standard)')
@secure()
param openaiApiKey string = ''

@description('Azure OpenAI endpoint (optional — takes priority over standard OpenAI)')
param azureOpenaiEndpoint string = ''

@description('Azure OpenAI API key')
@secure()
param azureOpenaiApiKey string = ''

@description('Azure OpenAI API version')
param azureOpenaiApiVersion string = '2024-10-21'

@description('Azure OpenAI deployment name')
param azureOpenaiDeployment string = ''

@description('Whether to use mock agents (no real API calls)')
param mockAgents string = 'true'

// ---------------------------------------------------------------------------
// Log Analytics workspace (required by Container Apps Environment)
// ---------------------------------------------------------------------------
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: 'log-arena-${envName}'
  location: location
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 30
  }
}

// ---------------------------------------------------------------------------
// Container Apps Environment
// ---------------------------------------------------------------------------
resource containerEnv 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: 'cae-arena-${envName}'
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Backend Container App (FastAPI)
// ---------------------------------------------------------------------------
resource backendApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'ca-arena-backend-${envName}'
  location: location
  properties: {
    managedEnvironmentId: containerEnv.id
    configuration: {
      ingress: {
        external: true
        targetPort: 8000
        transport: 'http'
        corsPolicy: {
          allowedOrigins: ['*']
          allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
          allowedHeaders: ['*']
          exposeHeaders: ['Content-Disposition']
        }
      }
      secrets: [
        { name: 'openai-api-key', value: openaiApiKey }
        { name: 'azure-openai-api-key', value: azureOpenaiApiKey }
      ]
    }
    template: {
      containers: [
        {
          name: 'backend'
          image: backendImage
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          env: [
            { name: 'OPENAI_API_KEY', secretRef: 'openai-api-key' }
            { name: 'MOCK_AGENTS', value: mockAgents }
            { name: 'AZURE_OPENAI_ENDPOINT', value: azureOpenaiEndpoint }
            { name: 'AZURE_OPENAI_API_KEY', secretRef: 'azure-openai-api-key' }
            { name: 'AZURE_OPENAI_API_VERSION', value: azureOpenaiApiVersion }
            { name: 'AZURE_OPENAI_DEPLOYMENT', value: azureOpenaiDeployment }
          ]
        }
      ]
      scale: {
        minReplicas: 0
        maxReplicas: 3
        rules: [
          {
            name: 'http-rule'
            http: { metadata: { concurrentRequests: '50' } }
          }
        ]
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Frontend Container App (Next.js standalone)
// ---------------------------------------------------------------------------
resource frontendApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'ca-arena-frontend-${envName}'
  location: location
  properties: {
    managedEnvironmentId: containerEnv.id
    configuration: {
      ingress: {
        external: true
        targetPort: 3000
        transport: 'http'
      }
    }
    template: {
      containers: [
        {
          name: 'frontend'
          image: frontendImage
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
        }
      ]
      scale: {
        minReplicas: 0
        maxReplicas: 3
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Outputs
// ---------------------------------------------------------------------------
output backendUrl string = 'https://${backendApp.properties.configuration.ingress.fqdn}'
output frontendUrl string = 'https://${frontendApp.properties.configuration.ingress.fqdn}'
