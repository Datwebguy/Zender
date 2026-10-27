FROM rust:1.99-bookworm AS wallet-build
ARG ZENDER_WALLET_SOURCE
ARG ZENDER_WALLET_REVISION=0b3436bb8d235c67cd36b800cb45a7b1b489c415
RUN apt-get update && apt-get install -y --no-install-recommends python3 pkg-config libssl-dev clang cmake protobuf-compiler && rm -rf /var/lib/apt/lists/*
RUN test -n "$ZENDER_WALLET_SOURCE" && git init /wallet && cd /wallet && git remote add origin "$ZENDER_WALLET_SOURCE" && git fetch --depth 1 origin "$ZENDER_WALLET_REVISION" && git checkout --detach FETCH_HEAD
COPY expense/wallet /integration
RUN python3 /integration/prepare.py /wallet
WORKDIR /wallet
RUN cargo build --locked --release --bin zcash-devtool --bin zender-inspect -j 3

FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates libssl3 libsqlite3-0 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY expense ./expense
COPY styles.css theme.js favicon.svg ./
COPY fonts ./fonts
COPY --from=wallet-build /wallet/target/release/zcash-devtool /usr/local/bin/zcash-devtool
COPY --from=wallet-build /wallet/target/release/zender-inspect /usr/local/bin/zender-inspect
COPY --from=wallet-build /wallet/LICENSE-APACHE /usr/share/doc/zender-wallet/LICENSE-APACHE
COPY --from=wallet-build /wallet/LICENSE-MIT /usr/share/doc/zender-wallet/LICENSE-MIT
ENV NODE_ENV=production
EXPOSE 4310
CMD ["node", "expense/server.mjs"]
