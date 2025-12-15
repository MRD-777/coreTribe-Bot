FROM node:18-alpine

WORKDIR /workspace

# Install git and other essentials
RUN apk add --no-cache git

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy rest of the application
COPY . .

# Expose port
EXPOSE 3000

# Default command
CMD ["npm", "start"]
