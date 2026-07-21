FROM public.ecr.aws/docker/library/node:22-bookworm-slim

ENV NODE_ENV=production
WORKDIR /opt/xiaozhi

RUN npm install -g xiaozhi-client@2.3.0 --ignore-scripts \
    && npm cache clean --force

COPY entrypoint.mjs /opt/xiaozhi/entrypoint.mjs

EXPOSE 9999
ENTRYPOINT ["node", "/opt/xiaozhi/entrypoint.mjs"]
