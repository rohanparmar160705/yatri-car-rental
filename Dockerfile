# Use Node 20
FROM node:20-alpine

WORKDIR /usr/src/app

# Accept build argument for the API URL
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Copy package files
COPY package*.json ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run build

# Install a simple server to serve the static files
RUN npm install -g serve

# Expose port (Render usually uses PORT env but we can default to 3000)
EXPOSE 3000

# Start serving the production build
CMD ["serve", "-s", "dist", "-l", "3000"]
