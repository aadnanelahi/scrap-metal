#!/bin/bash
# =============================================================================
# ScrapOS ERP - Ubuntu Server Management Script
# =============================================================================
# Usage: sudo ./scrapos-manage.sh [command]
# Commands: status, start, stop, restart, logs, update, backup, health
# =============================================================================

set -e

# Configuration
APP_DIR="/app"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"
BACKUP_DIR="$APP_DIR/backups"
LOG_DIR="/var/log/supervisor"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Banner
echo ""
echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}    ScrapOS ERP - Server Management${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# Functions
print_status() {
    if [ "$2" == "ok" ]; then
        echo -e "  $1: ${GREEN}$3${NC}"
    elif [ "$2" == "error" ]; then
        echo -e "  $1: ${RED}$3${NC}"
    else
        echo -e "  $1: ${YELLOW}$3${NC}"
    fi
}

check_status() {
    echo -e "${YELLOW}>>> Service Status${NC}"
    echo "----------------------------------------"
    
    # Check supervisor services
    echo -e "\n${BLUE}Supervisor Services:${NC}"
    sudo supervisorctl status
    
    # Check ports
    echo -e "\n${BLUE}Port Status:${NC}"
    for port in 80 443 3000 8001 27017; do
        if netstat -tuln 2>/dev/null | grep -q ":$port "; then
            print_status "Port $port" "ok" "LISTENING"
        else
            print_status "Port $port" "warn" "NOT LISTENING"
        fi
    done
    
    # Check MongoDB
    echo -e "\n${BLUE}MongoDB:${NC}"
    if pgrep -x mongod > /dev/null; then
        print_status "MongoDB" "ok" "RUNNING"
    else
        print_status "MongoDB" "error" "NOT RUNNING"
    fi
    
    # Check disk space
    echo -e "\n${BLUE}Disk Space:${NC}"
    df -h / | tail -1 | awk '{print "  Used: "$3" / "$2" ("$5" used)"}'
    
    # Check memory
    echo -e "\n${BLUE}Memory:${NC}"
    free -h | grep Mem | awk '{print "  Used: "$3" / "$2}'
}

start_services() {
    echo -e "${YELLOW}>>> Starting Services${NC}"
    sudo supervisorctl start all
    echo -e "${GREEN}All services started${NC}"
}

stop_services() {
    echo -e "${YELLOW}>>> Stopping Services${NC}"
    sudo supervisorctl stop all
    echo -e "${GREEN}All services stopped${NC}"
}

restart_services() {
    echo -e "${YELLOW}>>> Restarting Services${NC}"
    sudo supervisorctl restart all
    echo -e "${GREEN}All services restarted${NC}"
}

show_logs() {
    echo -e "${YELLOW}>>> Recent Logs${NC}"
    echo ""
    echo -e "${BLUE}Backend Logs (last 30 lines):${NC}"
    echo "----------------------------------------"
    tail -n 30 $LOG_DIR/backend.out.log 2>/dev/null || echo "No backend logs found"
    
    echo ""
    echo -e "${BLUE}Backend Errors (last 20 lines):${NC}"
    echo "----------------------------------------"
    tail -n 20 $LOG_DIR/backend.err.log 2>/dev/null || echo "No error logs found"
    
    echo ""
    echo -e "${BLUE}Frontend Logs (last 20 lines):${NC}"
    echo "----------------------------------------"
    tail -n 20 $LOG_DIR/frontend.out.log 2>/dev/null || echo "No frontend logs found"
}

follow_logs() {
    echo -e "${YELLOW}>>> Following Logs (Ctrl+C to stop)${NC}"
    tail -f $LOG_DIR/backend.out.log $LOG_DIR/backend.err.log
}

health_check() {
    echo -e "${YELLOW}>>> Health Check${NC}"
    echo ""
    
    # Backend API
    echo -e "${BLUE}Backend API:${NC}"
    BACKEND_URL="http://localhost:8001/api/health"
    if curl -s --connect-timeout 5 "$BACKEND_URL" > /dev/null 2>&1; then
        RESPONSE=$(curl -s "$BACKEND_URL")
        print_status "API Health" "ok" "$RESPONSE"
    else
        print_status "API Health" "error" "NOT RESPONDING"
    fi
    
    # Frontend
    echo -e "\n${BLUE}Frontend:${NC}"
    if curl -s --connect-timeout 5 "http://localhost:3000" > /dev/null 2>&1; then
        print_status "Frontend" "ok" "RESPONDING"
    else
        print_status "Frontend" "error" "NOT RESPONDING"
    fi
    
    # MongoDB
    echo -e "\n${BLUE}MongoDB:${NC}"
    if mongosh --eval "db.adminCommand('ping')" --quiet > /dev/null 2>&1; then
        print_status "MongoDB" "ok" "CONNECTED"
    else
        print_status "MongoDB" "error" "NOT CONNECTED"
    fi
    
    # Get preview URL
    echo -e "\n${BLUE}Application URL:${NC}"
    if [ -f "$FRONTEND_DIR/.env" ]; then
        APP_URL=$(grep REACT_APP_BACKEND_URL $FRONTEND_DIR/.env | cut -d '=' -f2)
        echo "  $APP_URL"
    fi
}

create_backup() {
    echo -e "${YELLOW}>>> Creating Backup${NC}"
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$BACKUP_DIR/scrapos_backup_$TIMESTAMP"
    
    mkdir -p $BACKUP_DIR
    
    # Backup MongoDB
    echo "Backing up database..."
    mongodump --db scrapos --out "$BACKUP_FILE/db" --quiet
    
    # Backup .env files
    echo "Backing up configuration..."
    mkdir -p "$BACKUP_FILE/config"
    cp $BACKEND_DIR/.env "$BACKUP_FILE/config/backend.env" 2>/dev/null || true
    cp $FRONTEND_DIR/.env "$BACKUP_FILE/config/frontend.env" 2>/dev/null || true
    
    # Create archive
    echo "Creating archive..."
    cd $BACKUP_DIR
    tar -czf "scrapos_backup_$TIMESTAMP.tar.gz" "scrapos_backup_$TIMESTAMP"
    rm -rf "scrapos_backup_$TIMESTAMP"
    
    echo -e "${GREEN}Backup created: $BACKUP_DIR/scrapos_backup_$TIMESTAMP.tar.gz${NC}"
    ls -lh "$BACKUP_DIR/scrapos_backup_$TIMESTAMP.tar.gz"
}

update_app() {
    echo -e "${YELLOW}>>> Updating Application${NC}"
    
    # Pull latest code (if using git)
    if [ -d "$APP_DIR/.git" ]; then
        echo "Pulling latest code..."
        cd $APP_DIR
        git pull origin main 2>/dev/null || git pull origin master 2>/dev/null || echo "Git pull skipped"
    fi
    
    # Update backend dependencies
    echo "Updating backend dependencies..."
    cd $BACKEND_DIR
    pip install -r requirements.txt --quiet
    
    # Update frontend dependencies and rebuild
    echo "Updating frontend dependencies..."
    cd $FRONTEND_DIR
    yarn install --silent
    
    echo "Building frontend..."
    yarn build
    
    # Restart services
    echo "Restarting services..."
    sudo supervisorctl restart backend frontend
    
    echo -e "${GREEN}Update complete!${NC}"
}

show_help() {
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  status    - Show status of all services"
    echo "  start     - Start all services"
    echo "  stop      - Stop all services"
    echo "  restart   - Restart all services"
    echo "  logs      - Show recent logs"
    echo "  follow    - Follow logs in real-time"
    echo "  health    - Run health check"
    echo "  backup    - Create database backup"
    echo "  update    - Update application"
    echo "  help      - Show this help message"
    echo ""
    echo "Quick Commands:"
    echo "  Backend restart:  sudo supervisorctl restart backend"
    echo "  Frontend restart: sudo supervisorctl restart frontend"
    echo "  View backend log: tail -f /var/log/supervisor/backend.out.log"
    echo "  View error log:   tail -f /var/log/supervisor/backend.err.log"
}

# Main
case "${1:-status}" in
    status)
        check_status
        ;;
    start)
        start_services
        ;;
    stop)
        stop_services
        ;;
    restart)
        restart_services
        ;;
    logs)
        show_logs
        ;;
    follow)
        follow_logs
        ;;
    health)
        health_check
        ;;
    backup)
        create_backup
        ;;
    update)
        update_app
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo "Unknown command: $1"
        show_help
        exit 1
        ;;
esac

echo ""
