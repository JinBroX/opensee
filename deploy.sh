#!/bin/bash

# Zen-Tap 一键部署脚本
# 适用于 OpenCloudOS 9 / CentOS 9 / RHEL 9

set -e

echo "==== Zen-Tap 部署脚本 ===="

# 配置变量
GIT_REPO="https://github.com/JinBroX/zen-tap.git"
INSTALL_DIR="/var/www/zen-tap"
DOMAIN=""
NODE_PORT=3001

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 检查是否为 root
if [ "$EUID" -ne 0 ]; then
  log_error "请用 root 用户运行此脚本: sudo bash deploy.sh"
  exit 1
fi

# 1. 安装 Node.js（如果没有）
if ! command -v node &> /dev/null; then
  log_info "安装 Node.js 20.x..."
  curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
  dnf install -y nodejs
else
  log_info "Node.js 已安装: $(node -v)"
fi

# 2. 安装 PM2（如果没有）
if ! command -v pm2 &> /dev/null; then
  log_info "安装 PM2..."
  npm install -g pm2
else
  log_info "PM2 已安装: $(pm2 -v)"
fi

# 3. 安装 Nginx（如果没有）
if ! command -v nginx &> /dev/null; then
  log_info "安装 Nginx..."
  dnf install -y nginx
  systemctl enable nginx
  systemctl start nginx
else
  log_info "Nginx 已安装"
fi

# 4. Clone 或更新代码
if [ -d "$INSTALL_DIR/.git" ]; then
  log_info "更新代码..."
  cd $INSTALL_DIR
  git pull origin main
else
  log_info "Clone 代码..."
  mkdir -p /var/www
  cd /var/www
  rm -rf zen-tap
  git clone $GIT_REPO zen-tap
fi

# 5. 安装后端依赖
log_info "安装后端依赖..."
cd $INSTALL_DIR/server
npm install

# 6. 配置环境变量
log_info "配置环境变量..."
if [ ! -f "$INSTALL_DIR/server/.env" ]; then
  cat > $INSTALL_DIR/server/.env << 'EOF'
DEEPSEEK_API_KEY=sk-35208ecc632b4813b4ec052091c2602f
PAYPAL_CLIENT_ID=AXbfi2yd8Eoe1ypXuj4pk2g9FC4VmquyX_NicPMXWRDoI68CJRios6wuOwgpFW0O_otTJ6dk3Ysn15PV
EOF
  log_warn "已创建 .env 文件，请确认配置正确"
else
  log_info ".env 已存在，跳过"
fi

# 7. 用 PM2 启动服务
log_info "启动后端服务..."
cd $INSTALL_DIR/server
pm2 stop zen-tap 2>/dev/null || true
pm2 delete zen-tap 2>/dev/null || true
pm2 start server.js --name zen-tap
pm2 save

# 8. 配置 Nginx
log_info "配置 Nginx 反向代理..."

# 读取域名
echo ""
echo -n "请输入你的域名（直接回车用 IP 访问）: "
read DOMAIN

if [ -z "$DOMAIN" ]; then
  DOMAIN=$(hostname -I | awk '{print $1}')
  log_info "使用 IP 地址: $DOMAIN"
fi

cat > /etc/nginx/conf.d/zen-tap.conf << EOF
server {
    listen 80;
    server_name $DOMAIN;

    # 前端静态文件
    location / {
        root $INSTALL_DIR/public;
        try_files $uri $uri/ /index.html;
        index index.html;
    }

    # 后端 API
    location /api/ {
        proxy_pass http://127.0.0.1:$NODE_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    # 健康检查
    location /health {
        proxy_pass http://127.0.0.1:$NODE_PORT/api/health;
    }
}
EOF

nginx -t && systemctl reload nginx

# 9. 开放防火墙端口
log_info "开放防火墙端口..."
firewall-cmd --permanent --add-service=http 2>/dev/null || true
firewall-cmd --permanent --add-service=https 2>/dev/null || true
firewall-cmd --permanent --add-port=$NODE_PORT/tcp 2>/dev/null || true
firewall-cmd --reload 2>/dev/null || true

# 10. 完成
echo ""
echo "==== 部署完成 ===="
echo ""
echo "访问地址: http://$DOMAIN"
echo ""
echo "常用命令:"
echo "  查看日志: pm2 logs zen-tap"
echo "  重启服务: pm2 restart zen-tap"
echo "  查看状态: pm2 status"
echo ""
echo "如需配置 HTTPS，运行:"
echo "  sudo certbot --nginx -d $DOMAIN"
echo ""
