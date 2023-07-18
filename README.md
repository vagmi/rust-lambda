# Write a lambda function in Rust

This is an example to setup a Rust based Axum Service as a lambda function. When
compiled in debug mode, it can be run locally with just a HTTP client. But when 
compiled in Release mode, it uses the lambda handler.

It uses Aurora PostgreSQL serverless V1 so that it scales down to zero. I wrote 
this to support one off services that we use internally at 
[Tarka Labs](https://tarkalabs.com) such as Slack bots. 

## Infrastructure

The entire infrastructure is setup with [CDKTF](https://developer.hashicorp.com/terraform/cdktf)
and is run with Github actions. You need to set up `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` and 
`AWS_REGION` variables in your repository secrets section for github actions.

We use a S3 Backend with a dynamo db table for our our state tracking with terraform projects. I have a sample
in `infra/backend.ts`. To set it up, you can run just the backend with the following commands
locally or on a devops machine.

```
$ cd infra
$ yarn global add cdktf-cli
$ yarn
$ cdktf get
$ cdktf deploy remote-backend
```

## About the lambda

It uses Axum for routing and SQLX for database handling. It embeds the migrations
and autoruns them when the app starts. It can be run locally in the debug mode, but
when built in release mode, it can only be run on lambda. It supports structured logging
in JSON using the tracing crate.
