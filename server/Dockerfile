# Build & run the server as a standalone container (e.g. on Railway/Render).
FROM node:20-alpine
WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
RUN npx prisma generate && npm run build

EXPOSE 4000
CMD ["npm", "start"]
