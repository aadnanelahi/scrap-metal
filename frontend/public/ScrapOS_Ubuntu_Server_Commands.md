# ScrapOS ERP - Ubuntu Server Management Guide

## Table of Contents
1. Service Management (Supervisor)
2. View Logs
3. Health Check
4. Database (MongoDB)
5. Update Application
6. System Info
7. Management Script
8. Application URLs

---

## 1. Service Management (Supervisor)

### Check status of all services
```
sudo supervisorctl status
```

### Restart all services
```
sudo supervisorctl restart all
```

### Restart backend only
```
sudo supervisorctl restart backend
```

### Restart frontend only
```
sudo supervisorctl restart frontend
```

### Stop all services
```
sudo supervisorctl stop all
```

### Start all services
```
sudo supervisorctl start all
```

---

## 2. View Logs

### Backend output log (follow in real-time)
```
tail -f /var/log/supervisor/backend.out.log
```

### Backend error log (follow in real-time)
```
tail -f /var/log/supervisor/backend.err.log
```

### Frontend log (follow in real-time)
```
tail -f /var/log/supervisor/frontend.out.log
```

### Last 100 lines of backend log
```
tail -n 100 /var/log/supervisor/backend.out.log
```

### Last 50 lines of error log
```
tail -n 50 /var/log/supervisor/backend.err.log
```

### Search for errors in logs
```
grep -i "error" /var/log/supervisor/backend.err.log
```

### Search for specific text in logs
```
grep -i "purchase" /var/log/supervisor/backend.out.log
```

---

## 3. Health Check

### Test backend API locally
```
curl http://localhost:8001/api/health
```

### Test backend API from external URL
```
curl https://erp-accounting-fix-3.preview.emergentagent.com/api/health
```

### Check if backend port is listening
```
netstat -tuln | grep 8001
```

### Check if frontend port is listening
```
netstat -tuln | grep 3000
```

### Check MongoDB connection
```
mongosh --eval "db.adminCommand('ping')"
```

### Check all running services
```
ps aux | grep -E "python|node|mongo"
```

---

## 4. Database (MongoDB)

### Open MongoDB shell
```
mongosh
```

### Connect to ScrapOS database
```
mongosh scrapos
```

### Show all collections
```
mongosh scrapos --eval "db.getCollectionNames()"
```

### Count documents in a collection
```
mongosh scrapos --eval "db.users.countDocuments()"
```

### Backup entire database
```
mongodump --db scrapos --out /app/backups/$(date +%Y%m%d)
```

### Backup to specific folder
```
mongodump --db scrapos --out /app/backups/manual_backup
```

### Restore database from backup
```
mongorestore --db scrapos /app/backups/YYYYMMDD/scrapos
```

### Drop and restore (fresh restore)
```
mongosh scrapos --eval "db.dropDatabase()"
mongorestore --db scrapos /app/backups/YYYYMMDD/scrapos
```

### Seed database with initial data
```
curl -X POST http://localhost:8001/api/seed
```

### Reset admin password (in mongosh)
```
use scrapos
db.users.updateOne(
  {email: "admin@scrapos.ae"},
  {$set: {password_hash: "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.3VLpWjhQmKPxOe"}}
)
```
Note: This sets password to "Admin!234"

---

## 5. Update Application

### Update backend dependencies
```
cd /app/backend
pip install -r requirements.txt
```

### Update frontend dependencies
```
cd /app/frontend
yarn install
```

### Rebuild frontend
```
cd /app/frontend
yarn build
```

### Full update sequence
```
cd /app/backend && pip install -r requirements.txt
cd /app/frontend && yarn install && yarn build
sudo supervisorctl restart backend frontend
```

### Restart after code changes
```
sudo supervisorctl restart backend frontend
```

---

## 6. System Info

### Check disk space
```
df -h
```

### Check memory usage
```
free -h
```

### Check CPU usage
```
top -bn1 | head -20
```

### Check all ports in use
```
netstat -tuln
```

### Check specific ports (ScrapOS)
```
netstat -tuln | grep -E "3000|8001|27017|80"
```

### Check running processes
```
ps aux | grep -E "python|node|mongo"
```

### Check system uptime
```
uptime
```

### Check Ubuntu version
```
lsb_release -a
```

---

## 7. Management Script

A management script is available at /app/scrapos-manage.sh

### Make it executable (one-time)
```
chmod +x /app/scrapos-manage.sh
```

### Check status
```
./scrapos-manage.sh status
```

### Health check
```
./scrapos-manage.sh health
```

### View logs
```
./scrapos-manage.sh logs
```

### Follow logs in real-time
```
./scrapos-manage.sh follow
```

### Restart all services
```
./scrapos-manage.sh restart
```

### Create database backup
```
./scrapos-manage.sh backup
```

### Update application
```
./scrapos-manage.sh update
```

### Show help
```
./scrapos-manage.sh help
```

---

## 8. Application URLs

| Service | URL |
|---------|-----|
| Frontend (External) | https://erp-accounting-fix-3.preview.emergentagent.com |
| API (External) | https://erp-accounting-fix-3.preview.emergentagent.com/api |
| Backend (Local) | http://localhost:8001 |
| Frontend (Local) | http://localhost:3000 |
| MongoDB (Local) | mongodb://localhost:27017 |

---

## 9. Common Troubleshooting

### Backend won't start
```
# Check error log
tail -n 50 /var/log/supervisor/backend.err.log

# Check if port is in use
netstat -tuln | grep 8001

# Try running manually to see errors
cd /app/backend
python -m uvicorn server:app --host 0.0.0.0 --port 8001
```

### Frontend won't start
```
# Check error log
tail -n 50 /var/log/supervisor/frontend.err.log

# Try running manually
cd /app/frontend
yarn start
```

### MongoDB connection issues
```
# Check if MongoDB is running
sudo systemctl status mongod

# Start MongoDB
sudo systemctl start mongod

# Check MongoDB logs
tail -n 50 /var/log/mongodb/mongod.log
```

### Permission issues
```
# Fix ownership
sudo chown -R $USER:$USER /app

# Fix permissions
chmod -R 755 /app
```

### Clear and rebuild frontend
```
cd /app/frontend
rm -rf node_modules build
yarn install
yarn build
sudo supervisorctl restart frontend
```

---

## 10. Quick Reference Card

| Task | Command |
|------|---------|
| Check status | sudo supervisorctl status |
| Restart all | sudo supervisorctl restart all |
| Restart backend | sudo supervisorctl restart backend |
| View backend log | tail -f /var/log/supervisor/backend.out.log |
| View error log | tail -f /var/log/supervisor/backend.err.log |
| Test API | curl http://localhost:8001/api/health |
| Backup DB | mongodump --db scrapos --out /app/backups/$(date +%Y%m%d) |
| Seed DB | curl -X POST http://localhost:8001/api/seed |
| Check disk | df -h |
| Check memory | free -h |

---

## Login Credentials

| User | Email | Password |
|------|-------|----------|
| Admin | admin@scrapos.ae | Admin!234 |
| Viewer | viewer@test.com | password |

---

Document Version: 1.0
Last Updated: March 2026
