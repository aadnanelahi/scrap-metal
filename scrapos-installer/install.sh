#!/bin/bash

#############################################
#  ScrapOS ERP - One-Click Installer
#  For Ubuntu 22.04 / 24.04 LTS
#  Version: 1.1
#############################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
INSTALL_DIR="/opt/scrapos"
DB_NAME="scrapos_erp"
FRONTEND_PORT=3000
BACKEND_PORT=8001

# Print banner
echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║   ███████╗ ██████╗██████╗  █████╗ ██████╗  ██████╗ ███████╗║"
echo "║   ██╔════╝██╔════╝██╔══██╗██╔══██╗██╔══██╗██╔═══██╗██╔════╝║"
echo "║   ███████╗██║     ██████╔╝███████║██████╔╝██║   ██║███████╗║"
echo "║   ╚════██║██║     ██╔══██╗██╔══██║██╔═══╝ ██║   ██║╚════██║║"
echo "║   ███████║╚██████╗██║  ██║██║  ██║██║     ╚██████╔╝███████║║"
echo "║   ╚══════╝ ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝      ╚═════╝ ╚══════╝║"
echo "║                                                           ║"
echo "║           ERP System - One Click Installer                ║"
echo "║                    Version 1.1                            ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${YELLOW}This script will install ScrapOS ERP on your Ubuntu server.${NC}"
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo -e "${RED}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  ERROR: Do NOT run this script as root!                   ║${NC}"
    echo -e "${RED}║                                                           ║${NC}"
    echo -e "${RED}║  Run as normal user: ./install.sh                         ║${NC}"
    echo -e "${RED}║  (NOT: sudo ./install.sh)                                 ║${NC}"
    echo -e "${RED}╚═══════════════════════════════════════════════════════════╝${NC}"
    exit 1
fi

# Get server IP
SERVER_IP=$(hostname -I | awk '{print $1}')
echo -e "${BLUE}Detected Server IP: ${GREEN}$SERVER_IP${NC}"
echo ""

# Confirmation
read -p "Do you want to continue with installation? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Installation cancelled."
    exit 1
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}[1/10] Updating System...${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
sudo apt update
sudo apt upgrade -y

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}[2/10] Installing System Dependencies...${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
sudo apt install -y curl wget git build-essential software-properties-common apt-transport-https ca-certificates gnupg lsb-release unzip

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}[3/10] Installing Node.js 20...${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi
echo -e "Node.js version: ${GREEN}$(node --version)${NC}"
echo -e "NPM version: ${GREEN}$(npm --version)${NC}"

# Install Yarn and serve globally
sudo npm install -g yarn serve

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}[4/10] Installing Python 3...${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
sudo apt install -y python3 python3-venv python3-pip
echo -e "Python version: ${GREEN}$(python3 --version)${NC}"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}[5/10] Installing MongoDB 8.0...${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"

# Check Ubuntu version
UBUNTU_VERSION=$(lsb_release -rs)
UBUNTU_CODENAME=$(lsb_release -cs)
echo "Detected Ubuntu: $UBUNTU_VERSION ($UBUNTU_CODENAME)"

# Install MongoDB if not present
if ! command -v mongod &> /dev/null; then
    # Remove old MongoDB GPG key if exists
    sudo rm -f /usr/share/keyrings/mongodb-server-8.0.gpg 2>/dev/null || true
    
    # Import GPG key
    curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-8.0.gpg
    
    # Add repository based on Ubuntu version
    if [[ "$UBUNTU_VERSION" == "24.04" ]]; then
        echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/8.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list
    elif [[ "$UBUNTU_VERSION" == "22.04" ]]; then
        echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/8.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list
    else
        # Default to jammy for other versions
        echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/8.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list
    fi
    
    sudo apt update
    sudo apt install -y mongodb-org
fi

# Start and enable MongoDB
sudo systemctl start mongod || true
sudo systemctl enable mongod || true
sleep 3
echo -e "MongoDB status: ${GREEN}$(sudo systemctl is-active mongod)${NC}"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}[6/10] Installing PM2 Process Manager...${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
sudo npm install -g pm2

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}[7/10] Setting Up Application Directory...${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"

# Create directory
sudo mkdir -p $INSTALL_DIR
sudo chown -R $USER:$USER $INSTALL_DIR

# Get script directory (where install.sh is located)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Copy application files
if [ -d "$SCRIPT_DIR/backend" ] && [ -d "$SCRIPT_DIR/frontend" ]; then
    echo "Copying backend files..."
    cp -r "$SCRIPT_DIR/backend" "$INSTALL_DIR/"
    echo "Copying frontend files..."
    cp -r "$SCRIPT_DIR/frontend" "$INSTALL_DIR/"
    echo -e "${GREEN}Application files copied to $INSTALL_DIR${NC}"
else
    echo -e "${RED}ERROR: backend and frontend folders not found in $SCRIPT_DIR${NC}"
    echo "Make sure you extracted the package correctly and are running install.sh from the scrapos-installer folder."
    exit 1
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}[8/10] Setting Up Backend...${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"

cd $INSTALL_DIR/backend

# Remove old virtual environment if exists
rm -rf venv

# Create fresh virtual environment
echo "Creating Python virtual environment..."
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Upgrade pip
echo "Upgrading pip..."
pip install --upgrade pip

# Install Python packages
echo "Installing Python dependencies..."
pip install fastapi==0.110.1 \
    "uvicorn[standard]==0.29.0" \
    motor==3.3.1 \
    pymongo==4.5.0 \
    "python-jose[cryptography]==3.3.0" \
    "passlib[bcrypt]==1.7.4" \
    bcrypt==4.1.3 \
    python-multipart==0.0.9 \
    python-dotenv==1.0.1 \
    email-validator==2.1.0 \
    pydantic==2.6.1

# Deactivate virtual environment
deactivate

# Generate JWT secret
JWT_SECRET=$(openssl rand -hex 32)

# Create .env file for backend
echo "Creating backend .env file..."
cat > $INSTALL_DIR/backend/.env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=$DB_NAME
JWT_SECRET=$JWT_SECRET
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
CORS_ORIGINS=*
EOF

echo -e "${GREEN}Backend .env file created at $INSTALL_DIR/backend/.env${NC}"
echo -e "${GREEN}Backend setup complete${NC}"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}[9/10] Setting Up Frontend...${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"

cd $INSTALL_DIR/frontend

# Create .env file for frontend
echo "Creating frontend .env file..."
cat > $INSTALL_DIR/frontend/.env << EOF
REACT_APP_BACKEND_URL=http://$SERVER_IP:$BACKEND_PORT
EOF

echo -e "${GREEN}Frontend .env created with backend URL: http://$SERVER_IP:$BACKEND_PORT${NC}"

# Remove old node_modules and build if present
rm -rf node_modules build

# Install dependencies
echo "Installing frontend dependencies (this may take a few minutes)..."
yarn install

# Build frontend for production
echo "Building frontend for production..."
yarn build

echo -e "${GREEN}Frontend setup complete${NC}"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}[10/10] Creating Startup Configuration...${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"

# Create PM2 ecosystem file
cat > $INSTALL_DIR/ecosystem.config.js << 'PMEOF'
module.exports = {
  apps: [
    {
      name: 'scrapos-backend',
      cwd: '/opt/scrapos/backend',
      script: '/opt/scrapos/backend/venv/bin/python',
      args: '-m uvicorn server:app --host 0.0.0.0 --port 8001',
      interpreter: 'none',
      env: {
        MONGO_URL: 'mongodb://localhost:27017',
        DB_NAME: 'scrapos_erp',
        CORS_ORIGINS: '*'
      },
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: '/opt/scrapos/logs/backend-error.log',
      out_file: '/opt/scrapos/logs/backend-out.log'
    },
    {
      name: 'scrapos-frontend',
      cwd: '/opt/scrapos/frontend',
      script: 'serve',
      args: '-s build -l 3000',
      interpreter: 'none',
      autorestart: true,
      watch: false,
      error_file: '/opt/scrapos/logs/frontend-error.log',
      out_file: '/opt/scrapos/logs/frontend-out.log'
    }
  ]
};
PMEOF

# Create logs directory
mkdir -p $INSTALL_DIR/logs

# Stop any existing PM2 processes
pm2 delete all 2>/dev/null || true

# Start services
cd $INSTALL_DIR
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
echo "Setting up PM2 to start on system boot..."
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME 2>/dev/null || true

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Configuring Firewall...${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"

# Configure firewall
sudo ufw allow 22/tcp 2>/dev/null || true
sudo ufw allow $FRONTEND_PORT/tcp 2>/dev/null || true
sudo ufw allow $BACKEND_PORT/tcp 2>/dev/null || true
sudo ufw --force enable 2>/dev/null || true

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Creating Admin User & Sample Data...${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"

# Wait for backend to fully start
echo "Waiting for backend to start..."
sleep 10

# Check if backend is running
for i in {1..30}; do
    if curl -s http://localhost:$BACKEND_PORT/api/health > /dev/null 2>&1 || curl -s http://localhost:$BACKEND_PORT/ > /dev/null 2>&1; then
        echo -e "${GREEN}Backend is running!${NC}"
        break
    fi
    echo "Waiting for backend... ($i/30)"
    sleep 2
done

# Create admin user
echo "Creating admin user..."
curl -s -X POST http://localhost:$BACKEND_PORT/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@scrapos.local",
    "password": "Admin@123",
    "full_name": "System Administrator",
    "role": "admin"
  }' > /dev/null 2>&1 || true

# Seed sample data
echo "Seeding sample data..."
curl -s -X POST http://localhost:$BACKEND_PORT/api/seed > /dev/null 2>&1 || true

echo ""
echo -e "${GREEN}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║        INSTALLATION COMPLETED SUCCESSFULLY!               ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}                    ACCESS INFORMATION                      ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${GREEN}Open in Browser:${NC}  http://$SERVER_IP:$FRONTEND_PORT"
echo -e "  ${GREEN}API Endpoint:${NC}     http://$SERVER_IP:$BACKEND_PORT"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}                    LOGIN CREDENTIALS                       ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${GREEN}Email:${NC}     admin@scrapos.local"
echo -e "  ${GREEN}Password:${NC}  Admin@123"
echo ""
echo -e "  ${RED}IMPORTANT: Change password after first login!${NC}"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}                    USEFUL COMMANDS                         ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${GREEN}Check Status:${NC}     pm2 status"
echo -e "  ${GREEN}View Logs:${NC}        pm2 logs"
echo -e "  ${GREEN}Restart All:${NC}      pm2 restart all"
echo -e "  ${GREEN}Stop All:${NC}         pm2 stop all"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}                    FILE LOCATIONS                          ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${GREEN}Application:${NC}      $INSTALL_DIR"
echo -e "  ${GREEN}Backend:${NC}          $INSTALL_DIR/backend"
echo -e "  ${GREEN}Frontend:${NC}         $INSTALL_DIR/frontend"
echo -e "  ${GREEN}Logs:${NC}             $INSTALL_DIR/logs"
echo -e "  ${GREEN}PM2 Config:${NC}       $INSTALL_DIR/ecosystem.config.js"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}Thank you for installing ScrapOS ERP!${NC}"
echo ""
