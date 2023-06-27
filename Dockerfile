ARG BASE_IMAGE=rust:1.70

# Our first FROM statement declares the build environment.
FROM ${BASE_IMAGE} AS builder

WORKDIR /project

ADD . .

# Build our application.
RUN cargo build --release

# Now, we need to build our _real_ Docker container, copying in `using-sqlx`.
FROM debian:bullseye-slim

EXPOSE 3000

RUN apt-get update && apt-get install -y ca-certificates

COPY --from=builder \
    /project/target/release/rust-lambda \
    /usr/local/bin/
CMD /usr/local/bin/rust-lambda
