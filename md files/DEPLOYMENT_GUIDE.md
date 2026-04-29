# HMX Deployment Guide

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Setup](#database-setup)
4. [Backend Deployment](#backend-deployment)
5. [Frontend Deployment](#frontend-deployment)
6. [Domain & SSL Setup](#domain--ssl-setup)
7. [Monitoring & Logging](#monitoring--logging)
8. [Backup Strategy](#backup-strategy)
9. [Security Checklist](#security-checklist)
10. [Troubleshooting](#troubleshooting)

## 🔧 Prerequisites

### **System Requirements**
- **Server**: Ubuntu 20.04+ or CentOS 8+
- **RAM**: Minimum 2GB (4GB recommended)
- **Storage**: 20GB+ available space
- **CPU**: 2+ cores
- **Network**: Stable internet connection

### **Software Requirements**
- **Python**: 3.11+
- **Node.js**: 18+
- **Nginx**: Latest stable version
- **PostgreSQL**: 13+ (production) or SQLite (development)
- **Git**: Latest version
- **SSL Certificate**: Let's Encrypt or commercial certificate

## ⚙️ Environment Setup

### **1. Server Preparation**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget git unzip software-properties-common

# Install Python
sudo apt install -y python3 python3-pip python3-venv

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Nginx
sudo apt install -y nginx

# Install PostgreSQL (for production)
sudo apt install -y postgresql postgresql-contrib
```

### **2. Create Application User**
```bash
# Create user for the application
sudo adduser hmx
sudo usermod -aG sudo hmx

# Switch to application user
sudo su - hmx
```

### **3. Clone Repository**
```bash
# Clone the repository
git clone <repository-url> /home/hmx/hmx-app
cd /home/hmx/hmx-app

# Set proper permissions
sudo chown -R hmx:hmx /home/hmx/hmx-app
```

## 🗄️ Database Setup

### **Development (SQLite)**
```bash
# SQLite is already configured
# Database file: backend/hmx.db
# No additional setup required
```

### **Production (PostgreSQL)**
```bash
# Create database and user
sudo -u postgres psql

CREATE DATABASE hmx_production;
CREATE USER hmx_user WITH PASSWORD 'secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE hmx_production TO hmx_user;
\q

# Test connection
psql -h localhost -U hmx_user -d hmx_production
```

### **Database Migration**
```bash
# Update database configuration
# Edit backend/config.py
DATABASE_URL = "postgresql://hmx_user:secure_password_here@localhost/hmx_production"

# Run database initialization
cd backend
python app.py
```

## 🚀 Backend Deployment

### **1. Python Environment Setup**
```bash
cd /home/hmx/hmx-app/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Install additional production dependencies
pip install gunicorn psycopg2-binary
```

### **2. Environment Variables**
```bash
# Create .env file
nano .env
```

```env
# Production Environment
FLASK_ENV=production
FLASK_DEBUG=False

# Database
DATABASE_URL=postgresql://hmx_user:secure_password_here@localhost/hmx_production

# JWT Secret (generate a strong secret)
JWT_SECRET_KEY=your-super-secure-jwt-secret-key-here

# PhonePe Configuration (Production)
PHONEPE_MERCHANT_ID=your_production_merchant_id
PHONEPE_SALT_KEY=your_production_salt_key
PHONEPE_SALT_INDEX=1
PHONEPE_BASE_URL=https://api.phonepe.com/apis/hermes
PHONEPE_REDIRECT_URL=https://yourdomain.com/payment/callback

# Server Configuration
HOST=0.0.0.0
PORT=5000
```

### **3. Gunicorn Configuration**
```bash
# Create gunicorn config
nano gunicorn.conf.py
```

```python
# Gunicorn configuration
bind = "0.0.0.0:5000"
workers = 4
worker_class = "sync"
worker_connections = 1000
timeout = 30
keepalive = 2
max_requests = 1000
max_requests_jitter = 100
preload_app = True
```

### **4. Systemd Service**
```bash
# Create systemd service file
sudo nano /etc/systemd/system/hmx-backend.service
```

```ini
[Unit]
Description=HMX Backend API
After=network.target

[Service]
Type=notify
User=hmx
Group=hmx
WorkingDirectory=/home/hmx/hmx-app/backend
Environment=PATH=/home/hmx/hmx-app/backend/venv/bin
ExecStart=/home/hmx/hmx-app/backend/venv/bin/gunicorn -c gunicorn.conf.py app:app
ExecReload=/bin/kill -s HUP $MAINPID
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### **5. Start Backend Service**
```bash
# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable hmx-backend
sudo systemctl start hmx-backend

# Check status
sudo systemctl status hmx-backend

# View logs
sudo journalctl -u hmx-backend -f
```

## 🎨 Frontend Deployment

### **1. Build Frontend**
```bash
cd /home/hmx/hmx-app

# Install dependencies
npm install

# Build for production
npm run build

# The build output will be in the 'dist' directory
```

### **2. Nginx Configuration**
```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/hmx
```

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Frontend (React app)
    location / {
        root /home/hmx/hmx-app/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS headers
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
        add_header Access-Control-Allow-Headers "Content-Type, Authorization";
        
        # Handle preflight requests
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin *;
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
            add_header Access-Control-Allow-Headers "Content-Type, Authorization";
            add_header Content-Length 0;
            add_header Content-Type text/plain;
            return 204;
        }
    }
    
    # Payment callback
    location /payment/callback {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}
```

### **3. Enable Site**
```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/hmx /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

## 🔒 Domain & SSL Setup

### **1. Domain Configuration**
```bash
# Point your domain to your server IP
# Add A record: yourdomain.com -> YOUR_SERVER_IP
# Add A record: www.yourdomain.com -> YOUR_SERVER_IP
```

### **2. SSL Certificate (Let's Encrypt)**
```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### **3. Update Frontend API URL**
```bash
# Update API base URL in production
# Edit src/services/api.ts
const API_BASE_URL = 'https://yourdomain.com/api';
```

## 📊 Monitoring & Logging

### **1. Application Logs**
```bash
# Backend logs
sudo journalctl -u hmx-backend -f

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Application logs
tail -f /home/hmx/hmx-app/backend/app.log
```

### **2. System Monitoring**
```bash
# Install monitoring tools
sudo apt install -y htop iotop nethogs

# Monitor system resources
htop
df -h
free -h
```

### **3. Health Checks**
```bash
# Create health check script
nano /home/hmx/health-check.sh
```

```bash
#!/bin/bash
# Health check script

# Check backend
if curl -f http://localhost:5000/api/health > /dev/null 2>&1; then
    echo "Backend: OK"
else
    echo "Backend: FAILED"
    exit 1
fi

# Check database
if sudo -u postgres psql -d hmx_production -c "SELECT 1;" > /dev/null 2>&1; then
    echo "Database: OK"
else
    echo "Database: FAILED"
    exit 1
fi

echo "All systems operational"
```

## 💾 Backup Strategy

### **1. Database Backup**
```bash
# Create backup script
nano /home/hmx/backup-db.sh
```

```bash
#!/bin/bash
# Database backup script

BACKUP_DIR="/home/hmx/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="hmx_db_$DATE.sql"

mkdir -p $BACKUP_DIR

# Backup PostgreSQL database
sudo -u postgres pg_dump hmx_production > $BACKUP_DIR/$BACKUP_FILE

# Compress backup
gzip $BACKUP_DIR/$BACKUP_FILE

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE.gz"
```

### **2. Application Backup**
```bash
# Create application backup script
nano /home/hmx/backup-app.sh
```

```bash
#!/bin/bash
# Application backup script

BACKUP_DIR="/home/hmx/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="hmx_app_$DATE.tar.gz"

mkdir -p $BACKUP_DIR

# Backup application files
tar -czf $BACKUP_DIR/$BACKUP_FILE /home/hmx/hmx-app

# Keep only last 7 days of backups
find $BACKUP_DIR -name "hmx_app_*.tar.gz" -mtime +7 -delete

echo "Application backup completed: $BACKUP_FILE"
```

### **3. Automated Backups**
```bash
# Add to crontab
crontab -e

# Daily database backup at 2 AM
0 2 * * * /home/hmx/backup-db.sh

# Weekly application backup on Sunday at 3 AM
0 3 * * 0 /home/hmx/backup-app.sh
```

## 🔐 Security Checklist

### **1. Firewall Setup**
```bash
# Install UFW
sudo apt install -y ufw

# Configure firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### **2. SSH Security**
```bash
# Edit SSH configuration
sudo nano /etc/ssh/sshd_config

# Disable root login
PermitRootLogin no

# Use key-based authentication
PasswordAuthentication no

# Restart SSH
sudo systemctl restart ssh
```

### **3. File Permissions**
```bash
# Set proper permissions
sudo chown -R hmx:hmx /home/hmx/hmx-app
sudo chmod -R 755 /home/hmx/hmx-app
sudo chmod 600 /home/hmx/hmx-app/backend/.env
```

### **4. Regular Updates**
```bash
# Create update script
nano /home/hmx/update-system.sh
```

```bash
#!/bin/bash
# System update script

sudo apt update
sudo apt upgrade -y
sudo apt autoremove -y

# Restart services if needed
sudo systemctl restart hmx-backend
sudo systemctl restart nginx
```

## 🔧 Troubleshooting

### **Common Issues**

#### **1. Backend Not Starting**
```bash
# Check service status
sudo systemctl status hmx-backend

# Check logs
sudo journalctl -u hmx-backend -f

# Check port availability
sudo netstat -tlnp | grep :5000
```

#### **2. Database Connection Issues**
```bash
# Test database connection
sudo -u postgres psql -d hmx_production

# Check PostgreSQL status
sudo systemctl status postgresql

# Check database logs
sudo tail -f /var/log/postgresql/postgresql-*.log
```

#### **3. Nginx Issues**
```bash
# Test configuration
sudo nginx -t

# Check Nginx status
sudo systemctl status nginx

# Check error logs
sudo tail -f /var/log/nginx/error.log
```

#### **4. SSL Certificate Issues**
```bash
# Check certificate status
sudo certbot certificates

# Renew certificate manually
sudo certbot renew

# Check certificate expiration
openssl x509 -in /etc/letsencrypt/live/yourdomain.com/fullchain.pem -text -noout
```

### **Performance Optimization**

#### **1. Database Optimization**
```sql
-- Add indexes for better performance
CREATE INDEX idx_bookings_client_id ON bookings(client_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_payments_booking_id ON payments(booking_id);
```

#### **2. Nginx Optimization**
```nginx
# Add to nginx.conf
worker_processes auto;
worker_connections 1024;
keepalive_timeout 65;
gzip on;
gzip_types text/plain text/css application/json application/javascript;
```

#### **3. Application Optimization**
```python
# Enable caching in Flask
from flask_caching import Cache

cache = Cache(config={'CACHE_TYPE': 'simple'})
cache.init_app(app)
```

## 📞 Support

For deployment issues:
1. Check the troubleshooting section
2. Review logs for error messages
3. Verify configuration files
4. Test connectivity and permissions
5. Contact the development team

---

**Note:** This deployment guide covers the essential steps for production deployment. Always test in a staging environment first and ensure proper security measures are in place.
