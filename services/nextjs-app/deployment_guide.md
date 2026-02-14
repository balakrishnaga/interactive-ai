# Deployment Guide - Insight Engine

Follow these steps to deploy your Chatbot LLM (Insight Engine) application to a production server.

## 1. Prerequisites
- **Node.js**: Version 18.x or 20.x (Recommended).
- **MongoDB Atlas**: A cloud MongoDB instance with Atlas Search enabled.
- **LLM Keys**: Valid Groq or HuggingFace API keys.

---

## 2. Environment Variables
You must configure the following environment variables on your production server:

| Variable | Description | Example |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_LLM_PROVIDER` | Active LLM provider | `groq` |
| `GROQ_API_KEY` | Your Groq API key | `gsk_...` |
| `HF_API_KEY` | HuggingFace API key (for embeddings) | `hf_...` |
| `MONGODB_URI` | MongoDB Connection String | `mongodb+srv://...` |
| `MONGODB_DB` | Database name | `insight-engine` |
| `HF_EMBEDDING_MODEL` | Embedding model ID | `BAAI/bge-small-en-v1.5` |
| `GROQ_MODEL` | LLM Model ID | `llama-3.3-70b-versatile` |

> [!IMPORTANT]
> If your MongoDB password contains special characters (like `@`, `$`, `!`), ensure they are URL-encoded in the `MONGODB_URI`.
> - `@` becomes `%40`
> - `$` becomes `%24`

---

## 3. MongoDB Vector Search Index Setup
For the "Insight Engine" to work, you **MUST** create a Vector Search Index in your MongoDB Atlas dashboard.

1. Go to your Atlas Cluster -> **Search**.
2. Click **Create Search Index**.
3. Select **JSON Editor** and choose the `vectors` collection.
4. Use the following configuration:
```json
{
  "fields": [
    {
      "numDimensions": 384,
      "path": "embedding",
      "similarity": "cosine",
      "type": "vector"
    },
    {
      "path": "metadata.filename",
      "type": "filter"
    }
  ]
}
```
5. Name the index: `vector_index`.
6. Click **Create Search Index**. It may take a few minutes to build.

### 4. Docker Installation (AlmaLinux 10)
If your VPS is running AlmaLinux 10, use these commands to install Docker and Docker Compose:

1. **Update and Install Plugins**:
   ```bash
   sudo dnf update -y
   sudo dnf install -y dnf-plugins-core
   ```

2. **Add Docker Repository**:
   ```bash
   sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
   ```

3. **Install Docker and Compose Plugin**:
   ```bash
   sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
   ```

4. **Start and Enable Docker**:
   ```bash
   sudo systemctl enable --now docker
   ```

5. **Verify**:
   ```bash
   sudo docker compose version
   ```

> [!IMPORTANT]
> **Permission Denied Error?**
> If you see `permission denied while trying to connect to the Docker daemon socket`, you have two options:
>
> **Option 1 (Simple):** Just use `sudo` before your command:
> ```bash
> sudo docker compose up -d --build
> ```
>
> **Option 2 (Persistent):** Add your user to the docker group (requires logout/login to take effect):
> ```bash
> sudo usermod -aG docker $USER
> # Then log out and log back in
> ```

---

## 5. Deployment Options

### Option A: Vercel (Recommended) &middot; *Fastest*
1. Push your code to a GitHub repository.
2. Link the repository to [Vercel](https://vercel.com).
3. Add the **Environment Variables** listed in Section 2 to the Vercel project settings.
4. Click **Deploy**. Vercel will automatically handle the build and SSL.

### Option B: Linux VPS (Docker) &middot; *Recommended*
Docker is generally better for VPS deployment as it ensures the environment is identical to development.

1. **Prerequisites**: Install Docker and Docker Compose on your VPS.
2. **Setup**:
   - Clone the repo.
   - Create a `.env.production` file with your variables.
3. **Deploy**:
   ```bash
   docker compose up -d --build
   ```
   *This handles dependencies, building, and running in the background automatically.*

### Option C: Linux VPS (Git Clone + PM2)
Best if you want to avoid Docker overhead.

1. **Install Dependencies**:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   sudo npm install -g pm2
   ```

2. **Clone and Build**:
   ```bash
   git clone <your-repo-url>
   cd chatbot-llm
   npm install
   npm run build
   ```

3. **Start with PM2**:
   ```bash
   pm2 start npm --name "chatbot" -- start
   pm2 save
   pm2 startup
   ```

4. **Nginx Reverse Proxy**:
   Configure Nginx to forward traffic from port 80 to `localhost:3000`.

---

### 6. Accessing your App
Yes, you can access your app directly via your VPS IP address.

- **With Docker Compose**: By default, I set it to `3000:3000`. You can access it at `http://<YOUR_VPS_IP>:3000`.
- **To remove the :3000**: Change the port mapping in `docker-compose.yml` to `"80:3000"`. Then you can simply visit `http://<YOUR_VPS_IP>`.

### 8. Mapping to a Domain Name
Yes, you can easily map your Dockerized app to a domain name.

#### Step 1: DNS Configuration
Go to your domain provider (GoDaddy, Namecheap, Cloudflare) and create an **A Record**:
- **Name**: `@` or `www`
- **Value**: Your VPS Public IP Address

#### Step 2: Reverse Proxy with Nginx (Recommended for SSL)
While you *can* map Docker directly to port 80, using a reverse proxy is professional as it allows you to run multiple apps and handle SSL (HTTPS) properly.

1. **Install Nginx** on your VPS:
   ```bash
   sudo apt update
   sudo apt install nginx
   ```

2. **Configure Nginx**:
   Create a file `/etc/nginx/sites-available/chatbot`:
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
   *Note: Ensure your `docker-compose.yml` is port-mapped to `3000:3000` so Nginx can find it.*

3. **Enable and Restart**:
   ```bash
   sudo ln -s /etc/nginx/sites-available/chatbot /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

#### Step 3: Add HTTPS (SSL)
Use **Certbot** to get a free SSL certificate from Let's Encrypt:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

### 9. Multi-App Hosting (Different Domains)
To host multiple apps on one VPS, you use Nginx **Server Blocks** (similar to Virtual Hosts). Nginx looks at the domain name in the request and "forwards" it to the correct internal port.

#### Scenario Example:
- `chat.yourdomain.com` -> Points to Chatbot App (internal port 3000)
- `portfolio.com` -> Points to another app (internal port 4000)

#### Configuration:
1. Create a separate config file for each app in `/etc/nginx/sites-available/`:

**File: `/etc/nginx/sites-available/chatbot`**
```nginx
server {
    listen 80;
    server_name chat.yourdomain.com; # <--- The Magic happens here

    location / {
        proxy_pass http://localhost:3000; # Forwards to chatbot container
        # ... (proxy headers same as above)
    }
}
```

**File: `/etc/nginx/sites-available/portfolio`**
```nginx
server {
    listen 80;
    server_name portfolio.com; # <--- Different Domain

    location / {
        proxy_pass http://localhost:4000; # Forwards to portfolio container
        # ... (proxy headers same as above)
    }
}
```

2. **Enable both**:
   ```bash
   sudo ln -s /etc/nginx/sites-available/chatbot /etc/nginx/sites-enabled/
   sudo ln -s /etc/nginx/sites-available/portfolio /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

3. **SSL for Multiple Domains**:
   Run Certbot once for each or together:
   ```bash
   sudo certbot --nginx -d chat.yourdomain.com -d portfolio.com
   ```

### 11. Building Locally and Transferring (Docker Save/Load)
Yes, if you don't want to build on your VPS (to save its CPU/RAM), you can build locally and transfer the image file.

#### Step 1: Build the image locally
If you are on a Mac (M1/M2) and your VPS is Linux (x86_64), you **MUST** specify the platform architecture:
```bash
docker build --platform linux/amd64 -t chatbot-app:latest .
```

#### Step 2: Save the image to a file
```bash
docker save chatbot-app:latest | gzip > chatbot-app.tar.gz
```

#### Step 3: Transfer to VPS
```bash
scp chatbot-app.tar.gz user@your-vps-ip:~/
```

#### Step 4: Load and Run on VPS
Log into your VPS and run:
```bash
docker load < ~/chatbot-app.tar.gz
docker run -d --name chatbot -p 80:3000 --env-file .env chatbot-app:latest
```

> [!WARNING]
> Building on a Mac (ARM) and deploying to a Linux (AMD64) VPS without the `--platform` flag will cause an `exec format error` on the server. Always use `--platform linux/amd64` when building for a typical VPS.

---

### 13. Monitoring & Logs (Troubleshooting)
If something isn't working, check the logs of your containers and your web server.

#### A. Docker Logs
To see the output of your application:
```bash
# View last 100 lines and follow live
sudo docker compose logs -f --tail 100

# To see a specific service (if multiple exist)
sudo docker compose logs -f chatbot
```

#### B. Nginx Logs
If your domain isn't loading but Docker seems fine, check Nginx:
```bash
# General error log
sudo tail -f /var/log/nginx/error.log

# Access log (see incoming requests)
sudo tail -f /var/log/nginx/access.log
```

#### C. Common Fixes
- **502 Bad Gateway**: Usually means Nginx is running but Docker is not (or it's on a different port than Nginx expects).
- **SSL / MongoServerSelectionError**: This almost always means your VPS IP is not allowed to connect to your MongoDB Atlas cluster.
  - **The Fix**: Find your VPS IP using `curl ifconfig.me` and add it to **Network Access** -> **IP Access List** in the MongoDB Atlas dashboard.

#### D. Whitelisting VPS IP in MongoDB Atlas
If you see a `MongoServerSelectionError` with an `SSL alert`, follow these steps:

1. **Get your VPS IP**:
   Run this on your VPS:
   ```bash
   curl ifconfig.me
   ```

2. **Update Atlas**:
   - Log in to [MongoDB Atlas](https://cloud.mongodb.com/).
   - Select your project.
   - Go to **Security** -> **Network Access**.
   - Click **Add IP Address**.
   - Paste the IP you got in Step 1.
   - Click **Confirm**.

3. **Retry**: Restart your docker container (`docker compose restart`).
