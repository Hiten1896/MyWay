FROM node:20-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python-is-python3 ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 7860

CMD ["npm", "start"]
