FROM docker.io/library/node@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32

LABEL org.opencontainers.image.title="CRAYS Clubs Commerce BFF" \
      org.opencontainers.image.version="1.3.0-cclub068" \
      org.opencontainers.image.base.digest="sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32" \
      crays.cclub="068" \
      crays.source-bundle.sha256="3aea48235023e32705d3c3e5e127109ba94f26b19dee482bb12a30d2030aae80" \
      crays.build.host-role="XXL" \
      crays.runtime.target-role="XL" \
      crays.inventory.evidence-class="test_only" \
      crays.live-money.allowed="false" \
      crays.erpnext.authority="INVOICE_CREDIT_NOTE_TAX_DEBTOR_ACCOUNTING" \
      crays.booking-core.authority="HOLD_BOOKING_CAPACITY" \
      crays.real-channel-manager.cutover-gate="CCLUB-120"

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY lib.mjs server.mjs ./

USER node
EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=4s --start-period=15s --retries=6 \
  CMD node -e "fetch('http://127.0.0.1:8080/healthz').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "server.mjs"]
