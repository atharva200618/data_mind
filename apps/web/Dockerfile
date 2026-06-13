FROM node:20-alpine

WORKDIR /app

# Install curl for healthcheck
RUN apk add --no-cache curl

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ENV NODE_ENV=production
ENV NEXT_PUBLIC_API_URL=http://localhost:8000

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
