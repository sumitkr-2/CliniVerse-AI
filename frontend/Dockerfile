FROM node:20-alpine

WORKDIR /app

# Copy package configurations and install dependencies
COPY package.json ./
RUN npm install

# Copy application source code
COPY . .

# Expose Vite development port
EXPOSE 3000

# Start Vite dev server with host binding
CMD ["npm", "run", "dev"]
