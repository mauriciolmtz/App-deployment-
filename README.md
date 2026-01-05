# App-deployment
simple web calculator with operation history deployed to app engine using and using cloud cloud storage and the application is automatically deployed from github using cloud build 
## 1- create a google cloud proyect
## 2- activate APIS 
- cloud build API
- app engine admin API
- cloud storage API
## 3- set up app engine
1. create an application
2. select a region 
3. select a service account
## 4- create app.yaml
- to specify what enviroment is going to be used by the application 
```bash
runtime: nodejs20
env: standard
instance_class: f1

env_variables:
  NODE_ENV: 'production'
  BUCKET_NAME: 'ca1-calculator-logs'

 ```

## 5- crete cloudbuild.yaml
- it describes the builder what it should do
```bash
steps:
   # Install dependencies
  - name: 'gcr.io/cloud-builders/npm'
    args: ['install']

  # Deploy to App Engine
  - name: 'gcr.io/cloud-builders/gcloud'
    args: ['app', 'deploy', 'app.yaml', '--quiet']

timeout: '900s'

options:
  logging: CLOUD_LOGGING_ONLY
  ```
## 6- create a trigger (inside cloud build)
1. set the trigger name (application)
2. select region (global)
3. repository event (push to a branch)
4. repository generation (1 gen)
5. select repository (your repository)
6. select branch (any branch)
7. configuration (auto detected)
8. select service account (your service account)
