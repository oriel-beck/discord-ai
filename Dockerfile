FROM node:20-alpine AS builddeps
WORKDIR /app
COPY package.json .
COPY package-lock.json .
RUN npm ci

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json .
COPY package-lock.json .
RUN npm install --omit=dev

FROM builddeps AS build
WORKDIR /app
COPY src src
COPY system_prompt.txt .
COPY tsconfig.json .
RUN npm run build

FROM deps AS runner
WORKDIR /app
COPY --from=build /app/dist .
ENTRYPOINT [ "node", "index.js" ]

