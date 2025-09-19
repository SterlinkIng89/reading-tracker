FROM node:lts

WORKDIR /app

# copy package files first to leverage docker cache
COPY package*.json ./

# Use npm ci when lockfile exists for reproducible installs
RUN if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi

# copy rest of the source
COPY . .

ENV HOST=0.0.0.0
ENV PORT=3000
EXPOSE 3000

# Start dev server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]