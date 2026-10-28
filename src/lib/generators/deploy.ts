// Generator konfigurasi deployment: Dockerfile, docker-compose, GitHub
// Actions CI/CD, reverse proxy (Nginx/Caddy), dan catatan platform.
// Output peta { "path": "isi" } — dirender & disalin di browser.

export type DeployStack = "node" | "python" | "static";
export type DeployTarget = "vercel" | "vps-docker" | "vps-pm2";
export type Database = "none" | "postgres" | "mysql" | "redis";
export type Ci = "none" | "github-actions";

export interface DeployConfig {
  projectName: string;
  stack: DeployStack;
  target: DeployTarget;
  database: Database;
  ci: Ci;
  domain: string; // boleh kosong
}

export interface DeployFile {
  path: string;
  content: string;
  language: string; // untuk syntax highlight sederhana
}

function dockerfileNode(): string {
  return [
    "# Multi-stage: build kecil & aman (non-root).",
    "FROM node:22-alpine AS deps",
    "WORKDIR /app",
    "COPY package*.json ./",
    "RUN npm ci --omit=dev",
    "",
    "FROM node:22-alpine",
    "ENV NODE_ENV=production",
    "WORKDIR /app",
    "RUN addgroup -S app && adduser -S app -G app",
    "COPY --from=deps /app/node_modules ./node_modules",
    "COPY . .",
    "USER app",
    "EXPOSE 3000",
    'CMD ["node", "dist/index.js"]',
  ].join("\n") + "\n";
}

function dockerfilePython(): string {
  return [
    "FROM python:3.12-slim",
    "ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1",
    "WORKDIR /app",
    "COPY pyproject.toml ./",
    "RUN pip install --no-cache-dir .",
    "COPY src ./src",
    "RUN adduser --disabled-password app",
    "USER app",
    "EXPOSE 8000",
    'CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]',
  ].join("\n") + "\n";
}

function compose(c: DeployConfig): string {
  const port = c.stack === "python" ? "8000" : "3000";
  const services: string[] = [
    "services:",
    `  ${c.projectName || "app"}:`,
    "    build: .",
    "    restart: unless-stopped",
    "    ports:",
    `      - "${port}:${port}"`,
    "    env_file: .env",
  ];
  if (c.database === "postgres") {
    services.push(
      "    depends_on:",
      "      - db",
      "",
      "  db:",
      "    image: postgres:17-alpine",
      "    restart: unless-stopped",
      "    environment:",
      "      POSTGRES_USER: app",
      "      POSTGRES_PASSWORD: ganti-password-ini",
      "      POSTGRES_DB: app",
      "    volumes:",
      "      - pgdata:/var/lib/postgresql/data",
      "",
      "volumes:",
      "  pgdata:",
    );
  } else if (c.database === "mysql") {
    services.push(
      "    depends_on:",
      "      - db",
      "",
      "  db:",
      "    image: mysql:9",
      "    restart: unless-stopped",
      "    environment:",
      "      MYSQL_DATABASE: app",
      "      MYSQL_USER: app",
      "      MYSQL_PASSWORD: ganti-password-ini",
      "      MYSQL_ROOT_PASSWORD: ganti-juga-ini",
      "    volumes:",
      "      - mysqldata:/var/lib/mysql",
      "",
      "volumes:",
      "  mysqldata:",
    );
  } else if (c.database === "redis") {
    services.push(
      "    depends_on:",
      "      - redis",
      "",
      "  redis:",
      "    image: redis:7-alpine",
      "    restart: unless-stopped",
      '    command: ["redis-server", "--appendonly", "yes"]',
      "    volumes:",
      "      - redisdata:/data",
      "",
      "volumes:",
      "  redisdata:",
    );
  }
  return services.join("\n") + "\n";
}

function nginxConf(c: DeployConfig): string {
  const serverName = c.domain || "_";
  return [
    "# Reverse proxy di depan container app (docker-compose).",
    "# Letakkan di /etc/nginx/sites-available/" + (c.projectName || "app") + " lalu symlink ke sites-enabled.",
    "server {",
    "    listen 80;",
    `    server_name ${serverName};`,
    "",
    "    location /.well-known/acme-challenge/ {",
    "        root /var/www/certbot;",
    "    }",
    "    location / {",
    "        return 301 https://$host$request_uri;",
    "    }",
    "}",
    "",
    "server {",
    "    listen 443 ssl http2;",
    `    server_name ${serverName};`,
    "",
    "    ssl_certificate     /etc/letsencrypt/live/" + (c.domain || "domainanda") + "/fullchain.pem;",
    "    ssl_certificate_key /etc/letsencrypt/live/" + (c.domain || "domainanda") + "/privkey.pem;",
    "",
    "    location / {",
    "        proxy_pass http://127.0.0.1:" + (c.stack === "python" ? "8000" : "3000") + ";",
    "        proxy_http_version 1.1;",
    '        proxy_set_header Upgrade $http_upgrade;',
    '        proxy_set_header Connection "upgrade";',
    "        proxy_set_header Host $host;",
    "        proxy_set_header X-Real-IP $remote_addr;",
    "        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;",
    "        proxy_set_header X-Forwarded-Proto $scheme;",
    "    }",
    "}",
  ].join("\n") + "\n";
}

function caddyfile(c: DeployConfig): string {
  const site = c.domain || "localhost";
  return [
    `# Caddy: TLS otomatis (Let's Encrypt) tanpa konfigurasi tambahan.`,
    `${site} {`,
    "    reverse_proxy 127.0.0.1:" + (c.stack === "python" ? "8000" : "3000"),
    "}",
  ].join("\n") + "\n";
}

function workflow(c: DeployConfig): string {
  if (c.target === "vercel") {
    return [
      "name: deploy",
      "",
      "on:",
      "  push:",
      "    branches: [main]",
      "",
      "jobs:",
      "  deploy:",
      "    runs-on: ubuntu-latest",
      "    steps:",
      "      - uses: actions/checkout@v4",
      "      # Vercel otomatis deploy tiap push — workflow ini menambahkan gate test.",
      ...(c.stack === "node"
        ? [
            "      - uses: actions/setup-node@v4",
            "        with: { node-version: 22, cache: npm }",
            "      - run: npm ci",
            "      - run: npm test --if-present",
            "      - run: npm run build --if-present",
          ]
        : c.stack === "python"
          ? [
              "      - uses: actions/setup-python@v5",
              "        with: { python-version: '3.12' }",
              "      - run: pip install -e . pytest",
              "      - run: pytest",
            ]
          : []),
      "      # Set VERCEL_TOKEN & VERCEL_ORG_ID/PROJECT_ID sebagai repo secrets",
      "      - run: npx vercel deploy --prod --token=$VERCEL_TOKEN --yes",
      "        env:",
      "          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}",
    ].join("\n") + "\n";
  }
  // VPS (docker atau pm2): build image & deploy via ssh
  return [
    "name: deploy",
    "",
    "on:",
    "  push:",
    "    branches: [main]",
    "",
    "jobs:",
    "  deploy:",
    "    runs-on: ubuntu-latest",
    "    steps:",
    "      - uses: actions/checkout@v4",
    ...(c.stack === "node"
      ? [
          "      - uses: actions/setup-node@v4",
          "        with: { node-version: 22, cache: npm }",
          "      - run: npm ci",
          "      - run: npm test --if-present",
          "      - run: npm run build --if-present",
        ]
      : c.stack === "python"
        ? [
            "      - uses: actions/setup-python@v5",
            "        with: { python-version: '3.12' }",
            "      - run: pip install -e . pytest",
            "      - run: pytest",
          ]
        : []),
    "      # Set SSH_HOST, SSH_USER, SSH_KEY sebagai repo secrets",
    "      - name: Deploy ke VPS",
    "        uses: appleboy/ssh-action@v1",
    "        with:",
    "          host: ${{ secrets.SSH_HOST }}",
    "          username: ${{ secrets.SSH_USER }}",
    "          key: ${{ secrets.SSH_KEY }}",
    "          script: |",
    `            cd /opt/${c.projectName || "app"}`,
    "            git pull",
    ...(c.target === "vps-docker" ? ["            docker compose up -d --build"] : ["            npm ci --omit=dev", "            pm2 restart all || pm2 start dist/index.js --name app"]),
  ].join("\n") + "\n";
}

function ecosystemPm2(c: DeployConfig): string {
  return JSON.stringify(
    {
      apps: [
        {
          name: c.projectName || "app",
          script: c.stack === "python" ? ".venv/bin/uvicorn" : "dist/index.js",
          ...(c.stack === "python" ? { args: "src.main:app --port 8000" } : {}),
          instances: "max",
          exec_mode: "cluster",
          env: { NODE_ENV: "production", PORT: 3000 },
        },
      ],
    },
    null,
    2,
  ) + "\n";
}

function vercelJson(c: DeployConfig): string {
  return JSON.stringify(
    {
      $schema: "https://openapi.vercel.sh/vercel.json",
      framework: c.stack === "python" ? null : undefined,
      builds: undefined,
      cleanUrls: true,
    },
    (k, v) => (v === undefined ? undefined : v),
    2,
  ).replace(/"framework": null,\s*/g, "");
}

function notes(c: DeployConfig): string {
  const lines: string[] = [
    `# Catatan deployment — ${c.projectName || "app"}`,
    "",
  ];
  if (c.target === "vercel") {
    lines.push(
      "## Vercel",
      "1. Import repo ke Vercel (atau `npx vercel`).",
      "2. Set environment variables di dashboard (DATABASE_URL, dsb).",
      "3. vercel.json tersedia untuk konfigurasi tambahan (cleanUrls).",
      "",
    );
  } else if (c.target === "vps-docker") {
    lines.push(
      "## VPS + Docker",
      "1. Install Docker + Compose plugin di VPS.",
      "2. `cp .env.example .env` lalu isi nilai produksi.",
      "3. `docker compose up -d --build`.",
      "4. TLS: jalankan Caddy (paling mudah) atau Nginx + certbot — file konfigurasi tersedia di samping.",
      "5. Hardening: ufw allow 22,80,443; fail2ban; auto-update (unattended-upgrades).",
      "",
    );
  } else {
    lines.push(
      "## VPS + PM2",
      "1. Install Node 22 LTS (atau Python 3.12) + pm2 (`npm i -g pm2`).",
      "2. `npm ci --omit=dev && npm run build` (atau setup venv untuk Python).",
      "3. `pm2 start ecosystem.config.js && pm2 save && pm2 startup`.",
      "4. TLS: Caddyfile/Nginx tersedia di samping.",
      "",
    );
  }
  if (c.database !== "none") {
    lines.push(
      "## Database",
      `- Service ${c.database} sudah termasuk di docker-compose dengan volume persisten.`,
      "- Jangan pernah commit password asli — pakai .env.",
      "",
    );
  }
  if (c.ci === "github-actions") {
    lines.push(
      "## CI/CD",
      "- Workflow `.github/workflows/deploy.yml` menjalankan test lalu deploy.",
      "- Simpan kredensial sebagai GitHub Actions Secrets, bukan di file.",
      "",
    );
  }
  return lines.join("\n") + "\n";
}

export function generateDeployConfig(c: DeployConfig): DeployFile[] {
  const files: DeployFile[] = [];
  if (c.target === "vercel") {
    files.push({ path: "vercel.json", content: vercelJson(c), language: "json" });
  } else {
    files.push({
      path: "Dockerfile",
      content: c.stack === "python" ? dockerfilePython() : dockerfileNode(),
      language: "dockerfile",
    });
    files.push({ path: "docker-compose.yml", content: compose(c), language: "yaml" });
    if (c.target === "vps-pm2") {
      files.push({ path: "ecosystem.config.js", content: ecosystemPm2(c), language: "js" });
    }
  }
  if (c.target !== "vercel") {
    files.push({ path: "Caddyfile", content: caddyfile(c), language: "ini" });
    files.push({ path: "nginx.conf", content: nginxConf(c), language: "nginx" });
  }
  if (c.ci === "github-actions") {
    files.push({ path: ".github/workflows/deploy.yml", content: workflow(c), language: "yaml" });
  }
  files.push({ path: "DEPLOY-NOTES.md", content: notes(c), language: "markdown" });
  return files;
}
