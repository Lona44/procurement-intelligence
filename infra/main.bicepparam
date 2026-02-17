using './main.bicep'

param envName = 'dev'
param backendImage = 'mcr.microsoft.com/hello-world:latest'
param frontendImage = 'mcr.microsoft.com/hello-world:latest'
param mockAgents = 'true'
