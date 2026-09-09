#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="/home/ubuntu/Richochet-Android-main"
SERVICE_PATH="/etc/systemd/system/ricochet-download.service"

mkdir -p "$PROJECT_DIR"
cp -R . "$PROJECT_DIR/"

cat > "$SERVICE_PATH" <<'EOF'
[Unit]
Description=Ricochet Download Web Server
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/ubuntu/Richochet-Android-main
ExecStart=/usr/bin/docker compose -f /home/ubuntu/Richochet-Android-main/docker-compose.yml up --build -d
ExecStop=/usr/bin/docker compose -f /home/ubuntu/Richochet-Android-main/docker-compose.yml down

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now ricochet-download.service
systemctl status ricochet-download.service --no-pager
