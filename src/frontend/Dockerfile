# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

ARG REACT_APP_API_URL=http://localhost:3001
ENV REACT_APP_API_URL=$REACT_APP_API_URL

COPY package.json ./
RUN npm install

COPY public/ ./public/
COPY src/ ./src/

RUN npm run build

# Stage 2: Serve with lightweight server
FROM node:18-alpine

WORKDIR /app

RUN npm install -g serve

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder /app/build ./build

USER appuser

EXPOSE 3000

CMD ["serve", "-s", "build", "-l", "3000"]
