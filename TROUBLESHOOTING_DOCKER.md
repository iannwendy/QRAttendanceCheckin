# 🔧 Xử lý khi Docker Installation bị kẹt

## Tình huống: Script cài đặt Docker bị treo

Nếu script `get-docker.sh` bị kẹt hoặc mất nhiều thời gian, làm theo các bước sau:

### Bước 1: Kiểm tra xem Docker đã cài đặt chưa

Nhấn `Ctrl+C` để dừng script (nếu đang chạy), sau đó chạy:

```bash
# Kiểm tra Docker
docker --version

# Kiểm tra Docker Compose
docker compose version
```

Nếu các lệnh trên hoạt động → Docker đã cài đặt thành công! Bỏ qua các bước tiếp theo.

### Bước 2: Nếu Docker chưa cài đặt - Cài đặt thủ công

```bash
# Update package list
sudo apt update

# Cài đặt dependencies
sudo apt install -y ca-certificates curl gnupg lsb-release

# Thêm Docker GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Thêm Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Update và cài đặt
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Khởi động Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Thêm user vào docker group
sudo usermod -aG docker $USER
```

### Bước 3: Logout và Login lại

Sau khi thêm user vào docker group, bạn cần logout và login lại:

```bash
# Logout
exit

# Sau đó SSH lại vào VPS
```

Hoặc chạy lệnh này để áp dụng ngay (không cần logout):

```bash
newgrp docker
```

### Bước 4: Kiểm tra lại

```bash
# Kiểm tra Docker
docker --version
docker compose version

# Test Docker (chạy container hello-world)
docker run hello-world
```

Nếu tất cả đều hoạt động → ✅ Hoàn tất!

## Các lỗi thường gặp

### Lỗi: "Cannot connect to the Docker daemon"

```bash
# Khởi động Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Kiểm tra status
sudo systemctl status docker
```

### Lỗi: "Permission denied"

```bash
# Thêm user vào docker group
sudo usermod -aG docker $USER

# Logout và login lại, hoặc:
newgrp docker
```

### Lỗi: "apt-get lock"

```bash
# Kiểm tra process đang lock
sudo lsof /var/lib/dpkg/lock-frontend

# Nếu có process, đợi nó hoàn thành hoặc kill nó
# Sau đó:
sudo rm /var/lib/dpkg/lock-frontend
sudo rm /var/lib/apt/lists/lock
sudo dpkg --configure -a
```

## Sau khi Docker đã cài đặt thành công

Tiếp tục với các bước triển khai:

```bash
# Upload code lên VPS (nếu chưa)
cd ~

# Cấu hình environment
cd SOA_QRAttendance
cp env.production.example .env.production
nano .env.production

# Triển khai
./deploy.sh
```

