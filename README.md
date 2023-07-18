An example repository to deploy a rust service as lambda.

* [x] Rust service with Axum support
* [x] Dockerfiles for the service
* [x] GH Actions Workflow to deploy the CDK stack.
* [x] CDKTF to setup the service as lambda 
* [x] GH Actions workflow to buildr run the tests, push to ecr and update lambda
* [x] provision a Aurora PostgreSQL 
* [x] Endpoint that uses a postgreSQL database
* [x] 12 factor apps (Config through env variables, streaming structure logs)
