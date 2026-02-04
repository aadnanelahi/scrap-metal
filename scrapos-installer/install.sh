#!/bin/bash

#############################################
#  ScrapOS ERP - One-Click Installer
#  For Ubuntu 22.04 / 24.04 LTS
#  Version: 1.0
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
echo "║                    Version 1.0                            ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${YELLOW}This script will install ScrapOS ERP on your Ubuntu server.${NC}"
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo -e "${RED}Please DO NOT run as root. Run as a normal user with sudo privileges.${NC}"
    echo "Example: ./install.sh"
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

# Install Yarn
sudo npm install -g yarn

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}[4/10] Installing Python 3.11...${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
sudo apt install -y python3 python3-venv python3-pip
echo -e "Python version: ${GREEN}$(python3 --version)${NC}"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}[5/10] Installing MongoDB 8.0...${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"

# Check Ubuntu version and set codename
UBUNTU_VERSION=$(lsb_release -rs)
UBUNTU_CODENAME=$(lsb_release -cs)

echo "Detected Ubuntu: $UBUNTU_VERSION ($UBUNTU_CODENAME)"

# Install MongoDB
if ! command -v mongod &> /dev/null; then
    # Import GPG key
    curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-8.0.gpg 2>/dev/null || true
    
    # Add repository based on Ubuntu version
    if [[ "$UBUNTU_VERSION" == "24.04" ]]; then
        echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/8.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list
    elif [[ "$UBUNTU_VERSION" == "22.04" ]]; then
        echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/8.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list
    else
        echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/8.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list
    fi
    
    sudo apt update
    sudo apt install -y mongodb-org
fi

# Start MongoDB
sudo systemctl start mongod || true
sudo systemctl enable mongod || true
echo -e "MongoDB status: ${GREEN}$(sudo systemctl is-active mongod)${NC}"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}[6/10] Installing PM2 Process Manager...${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
sudo npm install -g pm2 serve

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}[7/10] Setting Up Application Directory...${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"

# Create directory
sudo mkdir -p $INSTALL_DIR
sudo chown $USER:$USER $INSTALL_DIR

# Copy application files
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -d "$SCRIPT_DIR/backend" ] && [ -d "$SCRIPT_DIR/frontend" ]; then
    cp -r "$SCRIPT_DIR/backend" "$INSTALL_DIR/"
    cp -r "$SCRIPT_DIR/frontend" "$INSTALL_DIR/"
    echo -e "${GREEN}Application files copied successfully${NC}"
else
    echo -e "${RED}Error: backend and frontend folders not found!${NC}"
    echo "Make sure you extracted the package correctly."
    exit 1
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}[8/10] Setting Up Backend...${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"

cd $INSTALL_DIR/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install Python packages
pip install fastapi==0.110.1 \
    uvicorn[standard]==0.25.0 \
    motor==3.3.1 \
    pymongo==4.5.0 \
    python-jose[cryptography]==3.5.0 \
    passlib[bcrypt]==1.7.4 \
    bcrypt==4.1.3 \
    python-multipart==0.0.21 \
    python-dotenv==1.2.1 \
    email-validator==2.3.0 \
    pydantic==2.12.5

deactivate

# Create .env file
cat > $INSTALL_DIR/backend/.env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=$DB_NAME
JWT_SECRET=$(openssl rand -hex 32)
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
EOF

echo -e "${GREEN}Backend setup complete${NC}"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}[9/10] Setting Up Frontend...${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"

cd $INSTALL_DIR/frontend

# Create .env file
cat > $INSTALL_DIR/frontend/.env << EOF
REACT_APP_BACKEND_URL=http://$SERVER_IP:$BACKEND_PORT
EOF

# Install dependencies
yarn install

# Build frontend
yarn build

echo -e "${GREEN}Frontend setup complete${NC}"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}[10/10] Creating Startup Configuration...${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"

# Create PM2 ecosystem file
cat > $INSTALL_DIR/ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'scrapos-backend',
      cwd: '$INSTALL_DIR/backend',
      script: '$INSTALL_DIR/backend/venv/bin/python',
      args: '-m uvicorn server:app --host 0.0.0.0 --port $BACKEND_PORT',
      interpreter: 'none',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    },
    {
      name: 'scrapos-frontend',
      cwd: '$INSTALL_DIR/frontend',
      script: 'serve',
      args: '-s build -l $FRONTEND_PORT',
      interpreter: 'none',
      autorestart: true,
      watch: false
    }
  ]
};
EOF

# Start services
cd $INSTALL_DIR
pm2 delete all 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

# Setup PM2 to start on boot
pm2 startup systemd -u $USER --hp $HOME | tail -1 | sudo bash || true

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Setting Up Firewall...${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"

sudo ufw allow 22/tcp || true
sudo ufw allow $FRONTEND_PORT/tcp || true
sudo ufw allow $BACKEND_PORT/tcp || true
sudo ufw --force enable || true

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Creating Admin User...${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"

# Wait for backend to start
sleep 5

# Create admin user
curl -s -X POST http://localhost:$BACKEND_PORT/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@scrapos.local",
    "password": "Admin@123",
    "full_name": "System Administrator",
    "role": "admin"
  }' > /dev/null 2>&1 || true

# Seed sample data
curl -s -X POST http://localhost:$BACKEND_PORT/api/seed > /dev/null 2>&1 || true

echo ""
echo -e "${GREEN}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║        ✅ INSTALLATION COMPLETED SUCCESSFULLY! ✅         ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}                    ACCESS INFORMATION                      ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${GREEN}Web Application:${NC}  http://$SERVER_IP:$FRONTEND_PORT"
echo -e "  ${GREEN}API Endpoint:${NC}     http://$SERVER_IP:$BACKEND_PORT"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}                    LOGIN CREDENTIALS                       ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${GREEN}Email:${NC}     admin@scrapos.local"
echo -e "  ${GREEN}Password:${NC}  Admin@123"
echo ""
echo -e "  ${RED}⚠️  IMPORTANT: Change the password after first login!${NC}"
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
echo ""
echo -e "${GREEN}Thank you for installing ScrapOS ERP!${NC}"
echo ""
