#!/bin/bash
# =============================================================================
# ScrapOS ERP - GitHub Update Script for Ubuntu Server
# =============================================================================
# This script updates your local ScrapOS installation from GitHub
# 
# Usage: sudo ./update-from-github.sh
# 
# Prerequisites:
#   - Git installed
#   - GitHub repository cloned to /app (or your install directory)
#   - SSH key or HTTPS credentials configured for GitHub
# =============================================================================

set -e

# =============================================================================
# CONFIGURATION - Modify these variables for your setup
# =============================================================================
APP_DIR="/app"                              # Your ScrapOS installation directory
GITHUB_REPO="your-username/scrapos-erp"     # Your GitHub repository
GITHUB_BRANCH="main"                        # Branch to pull from (main or master)
BACKUP_DIR="/app/backups"                   # Backup directory
LOG_FILE="/var/log/scrapos-update.log"      # Update log file

# =============================================================================
# Colors for output
# =============================================================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# =============================================================================
# Functions
# =============================================================================

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    echo "[ERROR] $1" >> "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
    echo "[WARNING] $1" >> "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
    echo "[INFO] $1" >> "$LOG_FILE"
}

# Check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        error "This script must be run as root (use sudo)"
        exit 1
    fi
}

# Create backup before update
create_backup() {
    log "Creating backup before update..."
    
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_PATH="$BACKUP_DIR/pre_update_$TIMESTAMP"
    
    mkdir -p "$BACKUP_PATH"
    
    # Backup database
    info "Backing up MongoDB database..."
    mongodump --db scrapos --out "$BACKUP_PATH/db" --quiet 2>/dev/null || warn "MongoDB backup failed"
    
    # Backup .env files
    info "Backing up configuration files..."
    mkdir -p "$BACKUP_PATH/config"
    cp "$APP_DIR/backend/.env" "$BACKUP_PATH/config/backend.env" 2>/dev/null || true
    cp "$APP_DIR/frontend/.env" "$BACKUP_PATH/config/frontend.env" 2>/dev/null || true
    
    # Create archive
    cd "$BACKUP_DIR"
    tar -czf "pre_update_$TIMESTAMP.tar.gz" "pre_update_$TIMESTAMP" 2>/dev/null
    rm -rf "pre_update_$TIMESTAMP"
    
    log "Backup created: $BACKUP_DIR/pre_update_$TIMESTAMP.tar.gz"
}

# Check Git status
check_git_status() {
    log "Checking Git status..."
    
    cd "$APP_DIR"
    
    # Check if it's a git repository
    if [ ! -d ".git" ]; then
        error "Not a Git repository. Please clone the repository first."
        error "Run: git clone https://github.com/$GITHUB_REPO.git $APP_DIR"
        exit 1
    fi
    
    # Check for uncommitted changes
    if [ -n "$(git status --porcelain)" ]; then
        warn "You have uncommitted local changes:"
        git status --short
        echo ""
        read -p "Do you want to stash these changes and continue? (y/n): " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git stash
            info "Changes stashed. You can restore them later with 'git stash pop'"
        else
            error "Update cancelled. Please commit or stash your changes first."
            exit 1
        fi
    fi
    
    log "Git status check passed"
}

# Pull latest code from GitHub
pull_latest_code() {
    log "Pulling latest code from GitHub..."
    
    cd "$APP_DIR"
    
    # Fetch all branches
    info "Fetching from remote..."
    git fetch origin
    
    # Get current branch
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    info "Current branch: $CURRENT_BRANCH"
    
    # Pull latest changes
    info "Pulling latest changes from $GITHUB_BRANCH..."
    git pull origin "$GITHUB_BRANCH"
    
    # Show what changed
    info "Recent commits:"
    git log --oneline -5
    
    log "Code updated successfully"
}

# Update backend
update_backend() {
    log "Updating backend..."
    
    cd "$APP_DIR/backend"
    
    # Check if requirements.txt changed
    info "Installing/updating Python dependencies..."
    pip install -r requirements.txt --quiet 2>/dev/null || pip install -r requirements.txt
    
    # Install emergentintegrations if needed
    pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/ --quiet 2>/dev/null || true
    
    log "Backend updated successfully"
}

# Update frontend
update_frontend() {
    log "Updating frontend..."
    
    cd "$APP_DIR/frontend"
    
    # Install dependencies
    info "Installing Node.js dependencies..."
    yarn install --silent 2>/dev/null || yarn install
    
    # Build for production
    info "Building frontend for production (this may take a few minutes)..."
    yarn build
    
    log "Frontend updated successfully"
}

# Restart services
restart_services() {
    log "Restarting services..."
    
    # Stop services
    info "Stopping services..."
    supervisorctl stop all 2>/dev/null || true
    
    # Wait a moment
    sleep 2
    
    # Start services
    info "Starting services..."
    supervisorctl start all
    
    # Wait for services to start
    sleep 5
    
    # Check status
    info "Service status:"
    supervisorctl status
    
    log "Services restarted successfully"
}

# Run database migrations (if any)
run_migrations() {
    log "Checking for database migrations..."
    
    # Add your migration commands here if needed
    # For example:
    # cd "$APP_DIR/backend"
    # python manage.py migrate
    
    info "No migrations to run"
    log "Migration check complete"
}

# Verify update
verify_update() {
    log "Verifying update..."
    
    # Check backend health
    info "Checking backend health..."
    sleep 3
    
    HEALTH_CHECK=$(curl -s http://localhost:8001/api/health 2>/dev/null || echo "failed")
    
    if [[ "$HEALTH_CHECK" == *"healthy"* ]] || [[ "$HEALTH_CHECK" == *"ok"* ]]; then
        log "Backend is healthy"
    else
        warn "Backend health check returned: $HEALTH_CHECK"
    fi
    
    # Check frontend
    info "Checking frontend..."
    FRONTEND_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null || echo "000")
    
    if [ "$FRONTEND_CHECK" == "200" ]; then
        log "Frontend is responding"
    else
        warn "Frontend returned HTTP $FRONTEND_CHECK"
    fi
    
    log "Verification complete"
}

# Show summary
show_summary() {
    echo ""
    echo -e "${GREEN}============================================${NC}"
    echo -e "${GREEN}        Update Complete!${NC}"
    echo -e "${GREEN}============================================${NC}"
    echo ""
    echo -e "${BLUE}Summary:${NC}"
    echo "  - Code pulled from: $GITHUB_REPO ($GITHUB_BRANCH)"
    echo "  - Backend dependencies: Updated"
    echo "  - Frontend: Rebuilt"
    echo "  - Services: Restarted"
    echo ""
    echo -e "${BLUE}Backup location:${NC}"
    echo "  $BACKUP_DIR"
    echo ""
    echo -e "${BLUE}Log file:${NC}"
    echo "  $LOG_FILE"
    echo ""
    echo -e "${BLUE}To rollback if needed:${NC}"
    echo "  1. Stop services: sudo supervisorctl stop all"
    echo "  2. Restore backup: tar -xzf $BACKUP_DIR/pre_update_*.tar.gz -C /"
    echo "  3. Restore database: mongorestore --db scrapos <backup_path>/db/scrapos"
    echo "  4. Start services: sudo supervisorctl start all"
    echo ""
}

# =============================================================================
# MAIN SCRIPT
# =============================================================================

echo ""
echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}   ScrapOS ERP - GitHub Update Script${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# Initialize log
mkdir -p "$(dirname "$LOG_FILE")"
echo "=== Update started at $(date) ===" >> "$LOG_FILE"

# Run update steps
check_root
create_backup
check_git_status
pull_latest_code
update_backend
update_frontend
run_migrations
restart_services
verify_update
show_summary

echo "=== Update completed at $(date) ===" >> "$LOG_FILE"
