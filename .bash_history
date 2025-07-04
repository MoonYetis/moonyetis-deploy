apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
q
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
apt-get install -y nodejs
node --version
npm --version
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
apt update
apt install -y mongodb-org
systemctl start mongod
systemctl enable mongod
systemctl status mongod
node --version
npm --version
apt install -y git nginx unzip curl
npm install -g pm2
pm2 --version
apt install -y git nginx unzip curl
git --version
nginx -v
mkdir -p /var/www/html
cd /var/www/html
ls -la
rm index.html
nano index.html
ls -la
nano /etc/nginx/sites-available/moonyetis
ln -s /etc/nginx/sites-available/moonyetis /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
systemctl status nginx
ls -la /var/www/html/
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs
node --version
npm --version
mkdir -p /var/www/html/backend
ls -la /var/www/html/
git clone https://github.com/MoonYetis/moonyetis-backend.git
ls -la
cd moonyetis-backend
ls -la
cat package.json
npm install
ls -la /var/www/html/
ls -la /var/www/html/moonyetis-backend-real/
cd /var/www/html/moonyetis-backend-real
ls -la
cat package.json
cd /var/www/html
rm -rf moonyetis-backend-real
rm -rf moonyetis-backend
ls -la
MoonYetis2024@#VPScrypto
cd /var/www/html
ls -la *.tar.gz
ls -lh moonyetis-backend.tar.gz
rm -f moonyetis-backend.tar.gz
cd /var/www/html
ls -la *.tar.gz
tar -xzf moonyetis-backend-clean.tar.gz
cd moonyetis-backend
npm install
node server.js
pm2 start server.js --name "moonyetis-backend"
pm2 save
curl http://localhost:3000/api/health
pm2 logs moonyetis-backend
pm2 status
curl http://localhost:3000/api/health
pwd
nano /etc/nginx/sites-available/moonyetis
nginx -t
systemctl reload nginx
systemctl status nginx
curl http://168.231.124.18/api/health
pm2 status
apt update && apt upgrade -y
apt install postgresql postgresql-contrib -y
systemctl status postgresql
sudo -u postgres psql
cd /var/www/html/moonyetis-backend
ls -la config/
ls -la services/
ls -la routes/
cat migrations/001_create_blockchain_tables.sql
exit
ls -la migrations/
cat migrations/001_create_blockchain_tables.sql
find . -name "*.js" -path "./config/*" | head -10
find . -name "*.js" -path "./services/*" | head -10
find . -name "*.js" -path "./routes/*" | head -10
find . -name "*blockchain*"
mkdir -p migrations
cat > migrations/001_create_blockchain_tables.sql << 'EOF'
-- Users table
CREATE TABLE IF NOT EXISTS user_accounts (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(64) UNIQUE NOT NULL,
    game_chips DECIMAL(18,8) DEFAULT 0,
    total_deposited DECIMAL(18,8) DEFAULT 0,
    total_withdrawn DECIMAL(18,8) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES user_accounts(id),
    type VARCHAR(20) NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'bet', 'win')),
    amount DECIMAL(18,8) NOT NULL,
    chips_amount DECIMAL(18,8),
    tx_hash VARCHAR(128),
    game_round_id INTEGER,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Game rounds table
CREATE TABLE IF NOT EXISTS game_rounds (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES user_accounts(id),
    bet_amount DECIMAL(18,8) NOT NULL,
    active_lines INTEGER NOT NULL,
    win_amount DECIMAL(18,8) DEFAULT 0,
    reel_results JSONB NOT NULL,
    winning_lines JSONB,
    game_seed VARCHAR(128) NOT NULL,
    client_seed VARCHAR(128) NOT NULL,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_accounts_wallet ON user_accounts(wallet_address);
CREATE INDEX IF NOT EXISTS idx_transactions_user_type ON transactions(user_id, type);
CREATE INDEX IF NOT EXISTS idx_transactions_hash ON transactions(tx_hash);
CREATE INDEX IF NOT EXISTS idx_game_rounds_user ON game_rounds(user_id);
CREATE INDEX IF NOT EXISTS idx_game_rounds_created ON game_rounds(created_at);
EOF

psql -U moonyetis_user -d moonyetis_slots -h localhost < migrations/001_create_blockchain_tables.sql
psql -U moonyetis_user -d moonyetis_slots -h localhost -c "\dt"
psql -U moonyetis_user -d moonyetis_slots -h localhost < migrations/001_create_blockchain_tables.sql
npm install pg express-session bcrypt dotenv
cat > .env << 'EOF'
DB_HOST=localhost
DB_NAME=moonyetis_slots
DB_USER=moonyetis_user
DB_PASSWORD=MoonYetis2024!
DB_PORT=5432
FRACTAL_RPC_URL=https://fractal-mainnet.example.com
GAME_CONTRACT_ADDRESS=pending
NODE_ENV=production
SERVER_SEED=moonyetis-secure-seed-2024
EOF

pm2 restart moonyetis-backend
pm2 logs moonyetis-backend
ls -la .env
head .env
cat > .env << 'EOF'
DB_HOST=localhost
DB_NAME=moonyetis_slots
DB_USER=moonyetis_user
DB_PASSWORD=MoonYetis2024!
DB_PORT=5432
FRACTAL_RPC_URL=https://fractal-mainnet.example.com
GAME_CONTRACT_ADDRESS=pending
NODE_ENV=production
SERVER_SEED=moonyetis-secure-seed-2024
EOF

ls -la .env
sudo nano /etc/postgresql/14/main/pg_hba.conf
systemctl restart postgresql
systemctl status postgresql
psql -U moonyetis_user -d moonyetis_slots -h localhost -c "SELECT 1;"
pm2 restart moonyetis-backend
curl http://localhost:3000/api/blockchain/config
curl -X POST http://localhost:3000/api/blockchain/connect-wallet   -H "Content-Type: application/json"   -d '{"walletType":"demo","address":"test123"}'
pm2 logs moonyetis-backend
sudo -u postgres psql
curl -X POST http://localhost:3000/api/blockchain/wallet/connect   -H "Content-Type: application/json"   -d '{"walletType":"demo","address":"test123"}'
sudo -i -u postgres
curl -X POST http://localhost:3000/api/blockchain/connect-wallet   -H "Content-Type: application/json"   -d '{"walletType":"demo","address":"test123"}'
sudo sed -i 's/local   all             all                                     md5/local   all             all                                     trust/g' /etc/postgresql/14/main/pg_hba.conf
systemctl restart postgresql
pm2 restart moonyetis-backend
curl http://localhost:3000/api/health
curl -X POST http://localhost:3000/api/blockchain/connect-wallet   -H "Content-Type: application/json"   -d '{"walletType":"demo","address":"test123"}'
pm2 logs moonyetis-backend --lines 10
grep -n "trust\|md5" /etc/postgresql/14/main/pg_hba.conf
systemctl restart postgresql
psql -U moonyetis_user -d moonyetis_slots -h localhost -c "SELECT 1;"
sed -i 's/DB_HOST=localhost/DB_HOST=/' .env
pm2 restart moonyetis-backend
pm2 logs moonyetis-backend --lines 5
curl -X POST http://localhost:3000/api/blockchain/connect-wallet   -H "Content-Type: application/json"   -d '{"walletType":"demo","address":"test123"}'
exit
pm2 restart moonyetis-backend
curl -X POST http://localhost:3000/api/blockchain/wallet/connect   -H "Content-Type: application/json"   -d '{"walletType":"demo","address":"test123"}'
pm2 logs moonyetis-backend --lines 10
curl http://localhost:3000/api/blockchain/config
curl http://localhost:3000/api/health
curl http://168.231.124.18/api/health
curl http://168.231.124.18/api/blockchain/config
cd /var/www/html/moonyetis-backend/
nano quick_fix.sh
node test_quick.js
pm2 status
curl http://localhost:3000/api/health
chmod +x quick_fix.sh
./quick_fix.sh
systemctl start postgresql
su - postgres
PGPASSWORD=MoonYetis2024! psql -h localhost -U moonyetis_user -d moonyetis_slots -c "SELECT version();"
pm2 restart moonyetis-backend
pm2 logs moonyetis-backend --lines 10
curl http://168.231.124.18/api/health
curl http://168.231.124.18/api/blockchain/config
curl http://168.231.124.18
cd /var/www/html/moonyetis-backend/frontend/
nano index.html
mkdir -p /var/www/html/moonyetis-backend/frontend/assets/symbols
ls -la /var/www/html/moonyetis-backend/frontend/assets/
exit
pm2 status
curl http://localhost:3000/api/health
ls /var/www/html/moonyetis-backend/frontend/assets/symbols/
mkdir -p /var/www/html/assets/symbols
cp /var/www/html/moonyetis-backend/frontend/assets/symbols/* /var/www/html/assets/symbols/
ls /var/www/html/assets/symbols/
curl -I http://168.231.124.18/assets/symbols/yeti-wild.png
claude
exit
ls -la /var/www/html/moonyetis-backend/frontend/assets/symbols/
mkdir -p /var/www/html/assets/symbols
cp /var/www/html/moonyetis-backend/frontend/assets/symbols/* /var/www/html/assets/symbols/
ls -la /var/www/html/assets/symbols/
curl -I http://168.231.124.18/assets/symbols/yeti-wild.png
cd /var/www/html/moonyetis-backend/frontend/
nano index.html
exit
ls -la /var/www/html/moonyetis-backend/frontend/assets/symbols/
cd /var/www/html/moonyetis-backend/frontend/
cp index.html index.html.backup
nano index.html
pm2 restart moonyetis-backend
curl http://168.231.124.18
grep -n "assets/symbols" /var/www/html/moonyetis-backend/frontend/index.html
curl -I http://168.231.124.18/assets/symbols/yeti-wild.png
grep -n "textContent" /var/www/html/moonyetis-backend/frontend/index.html
grep -n -A 15 "initializeReels" /var/www/html/moonyetis-backend/frontend/index.html
grep -n -A 10 "displayResults" /var/www/html/moonyetis-backend/frontend/index.html
grep -n -A 10 "displayResults" /var/www/html/moonyetis-backend/frontend/index.htmlsed -i '3211s/.*/                            if (results[reel][row].includes("\/assets\/")) { const img = document.createElement("img"); img.src = results[reel][row]; img.style.width = "60px"; img.style.height = "60px"; img.style.objectFit = "contain"; symbols[row + 3].innerHTML = ""; symbols[row + 3].appendChild(img); } else { symbols[row + 3].textContent = results[reel][row]; }/' /var/www/html/moonyetis-backend/frontend/index.html
sed -i '4329s/.*/        if (symbolPath.includes("\/assets\/")) { const img = document.createElement("img"); img.src = symbolPath; img.style.width = "60px"; img.style.height = "60px"; img.style.objectFit = "contain"; symbol.innerHTML = ""; symbol.appendChild(img); } else { symbol.textContent = symbolPath; }/' /var/www/html/moonyetis-backend/frontend/index.html
pm2 restart moonyetis-backend
grep -n "textContent.*results\|textContent.*SYMBOLS\|textContent.*symbolPath" /var/www/html/moonyetis-backend/frontend/index.html
nano /var/www/html/moonyetis-backend/frontend/index.html
pm2 restart moonyetis-backend
grep -A 10 -B 2 "symbols\[row + 3\]" /var/www/html/moonyetis-backend/frontend/index.html
pm2 restart moonyetis-backend
curl http://localhost:3000/api/health
curl -I http://168.231.124.18/assets/symbols/yeti-wild.png
grep -A 5 -B 5 "2934" /var/www/html/moonyetis-backend/frontend/index.html
grep -A 10 "const SYMBOLS = \[" /var/www/html/moonyetis-backend/frontend/index.html
sed -n '2930,2940p' /var/www/html/moonyetis-backend/frontend/index.html
grep -n "SYMBOLS.*🏔️\|SYMBOLS.*🚀" /var/www/html/moonyetis-backend/frontend/index.html
console.log("Testing:", SYMBOLS[0]);
console.log("Contains assets?", SYMBOLS[0].includes('/assets/'));
grep -n "SYMBOLS.*=" /var/www/html/moonyetis-backend/frontend/index.html
grep -A 5 -B 5 "🏔️\|🚀" /var/www/html/moonyetis-backend/frontend/index.html
sed -n '1380,1390p' /var/www/html/moonyetis-backend/frontend/index.html
sed -i '2465s/const symbols = \[.*\];/const symbols = SYMBOLS;/' /var/www/html/moonyetis-backend/frontend/index.html
sed -i '2499s/const symbols = \[.*\];/const symbols = SYMBOLS;/' /var/www/html/moonyetis-backend/frontend/index.html
grep -n "const symbols.*🏔️\|const symbols.*🚀" /var/www/html/moonyetis-backend/frontend/index.html
sed -i '2432s/.*/                        const symbols = SYMBOLS;/' /var/www/html/moonyetis-backend/frontend/index.html
sed -i '2463s/.*/                const symbols = SYMBOLS;/' /var/www/html/moonyetis-backend/frontend/index.html
grep -n "const symbols.*🏔️\|const symbols.*🚀" /var/www/html/moonyetis-backend/frontend/index.html
pm2 restart moonyetis-backend
grep -A 20 "initializeReels()" /var/www/html/moonyetis-backend/frontend/index.html
sed -n '2930,2940p' /var/www/html/moonyetis-backend/frontend/index.html
grep -n "SYMBOLS.*=" /var/www/html/moonyetis-backend/frontend/index.html
grep -n "🏔️.*🚀.*🌙" /var/www/html/moonyetis-backend/frontend/index.html
grep -n "SYMBOLS.*🏔️" /var/www/html/moonyetis-backend/frontend/index.html
grep -n "SYMBOLS.*=" /var/www/html/moonyetis-backend/frontend/index.html
grep -n "🏔️.*🚀.*🌙" /var/www/html/moonyetis-backend/frontend/index.html
grep -n "SYMBOLS.*🏔️" /var/www/html/moonyetis-backend/frontend/index.html
sed -n '1380,1390p' /var/www/html/moonyetis-backend/frontend/index.html
grep -n "SYMBOLS\[.*\].*=" /var/www/html/moonyetis-backend/frontend/index.html
grep -n "SYMBOLS\.push\|SYMBOLS\.splice\|SYMBOLS = " /var/www/html/moonyetis-backend/frontend/index.html
grep -n -A 3 "SYMBOLS.*\[" /var/www/html/moonyetis-backend/frontend/index.html
grep -A 15 "const SYMBOL_WEIGHTS" /var/www/html/moonyetis-backend/frontend/index.html
grep -n "WEIGHTED_SYMBOLS" /var/www/html/moonyetis-backend/frontend/index.html
sed -n '3165,3175p' /var/www/html/moonyetis-backend/frontend/index.html
grep -n -B 10 "WEIGHTED_SYMBOLS\[randomIndex\]" /var/www/html/moonyetis-backend/frontend/index.html
grep -n "getWeightedRandomSymbol\|getRandomLowValueSymbol" /var/www/html/moonyetis-backend/frontend/index.html
grep -n -A 50 "initializeReels()" /var/www/html/moonyetis-backend/frontend/index.html | grep -E "getWeighted|getRandomLow|randomSymbol"
sed -n '3173,3180p' /var/www/html/moonyetis-backend/frontend/index.html
sed -i '3174s/.*/                const lowValueSymbols = ["assets\/symbols\/ufo-special.png", "assets\/symbols\/alien-bonus.png", "assets\/symbols\/planet-low.png"];/' /var/www/html/moonyetis-backend/frontend/index.html
sed -i '3179s/.*/                const highValueSymbols = ["assets\/symbols\/coin-medium.png", "assets\/symbols\/star-medium.png", "assets\/symbols\/moon-scatter.png", "assets\/symbols\/rocket-high.png"];/' /var/www/html/moonyetis-backend/frontend/index.html
grep -n "getRandomLowValueSymbol\|getRandomHighValueSymbol" -A 3 /var/www/html/moonyetis-backend/frontend/index.html
pm2 restart moonyetis-backend
grep -n -A 10 -B 5 "WEIGHTED_SYMBOLS.push" /var/www/html/moonyetis-backend/frontend/index.html
grep -n "generateSpinResults\|createSymbol\|getSymbol" /var/www/html/moonyetis-backend/frontend/index.html
grep -n "Math.random.*SYMBOLS\|SYMBOLS.*Math.random" /var/www/html/moonyetis-backend/frontend/index.html
grep -n -C 5 "SYMBOLS.*=.*\[" /var/www/html/moonyetis-backend/frontend/index.html
awk '/const SYMBOLS = \[/,/\];/' /var/www/html/moonyetis-backend/frontend/index.html | grep
sed -n '3120,3140p' /var/www/html/moonyetis-backend/frontend/index.html
grep -n "SYMBOLS.*🏔️\|🏔️.*SYMBOLS" /var/www/html/moonyetis-backend/frontend/index.html
grep -n "SYMBOLS\s*=" /var/www/html/moonyetis-backend/frontend/index.html
grep -n -A 5 -B 5 "🏔️.*🚀.*🌙.*🪙" /var/www/html/moonyetis-backend/frontend/index.html
sed -n '1988,1996p' /var/www/html/moonyetis-backend/frontend/index.html
ssh root@168.231.124.18 "pm2 logs moonyetis-backend --lines 50"
exit
ls -la /var/www/html/index.html
ls -la /var/www/html/moonyetis-backend/frontend/index.html
cp /var/www/html/moonyetis-backend/frontend/index.html /var/www/html/index.html
grep -A 5 "const SYMBOLS" /var/www/html/index.html
ls -la /var/www/html/index.html
curl http://168.231.124.18/api/health
curl http://168.231.124.18/api/blockchain/config
grep -A 20 "connectWallet" /var/www/html/index.html
pm2 logs moonyetis-backend --lines 20
ssh root@168.231.124.18 "cat /var/www/html/index.html | grep -A 50 -B 10 'Connect Wallet'"
ssh root@168.231.124.18 "cat /var/www/html/index.html | grep -A 100 'async function connectWallet'"
ssh root@168.231.124.18 "ls -la /var/www/html/*.js 2>/dev/null || echo 'No separate JS files'"
ssh root@168.231.124.18 "tail -200 /var/www/html/index.html"
ssh root@168.231.124.18 "grep -n -A 30 -B 5 'class WalletManager\|WalletManager' /var/www/html/index.html"
ssh root@168.231.124.18 "grep -n -A 10 -B 5 'new WalletManager\|walletManager =' /var/www/html/index.html"
ssh root@168.231.124.18 "grep -n -A 50 '<script>' /var/www/html/index.html"
exit
scp -r root@168.231.124.18:/var/www/html/moonyetis-backend
cd moonyetis-backend
ls -la
ls -la frontend/index.html && echo "✅ Frontend OK"
ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa -N ""
exit
claude
exit
claude
which claude
exit
claude
which claude
find / -name "claude" -type f 2>/dev/null
echo $PATH
which node
which npm
npm list -g --depth=0 2>/dev/null | grep claude || echo "No encontrado en npm global"
history | tail -50 | grep -E "(install|pip|npm|curl|wget|apt)"
source ~/.bashrc
source ~/.profile 2>/dev/null
which claude
npm install -g @anthropic/claude-code
curl -fsSL https://claude.ai/install.sh | bash
curl -L -o /usr/local/bin/claude https://github.com/anthropic/claude-code/releases/latest/download/claude-linux-x64
chmod +x /usr/local/bin/claude
claude --version
sudo adduser claude-dev
source ~/.bashrc
claude
rm -f /usr/local/bin/claude
npm install -g @anthropic-ai/claude-code
claude --version
claude
hostname
pwd
whoami
claude
cd /path/to/moonyetis-project
claude
cd /root/Desktop/moonyetis-slots-FIXED-20250624-220958
node test-server.js
http://localhost:8080/test
exit
cd /root/Desktop/moonyetis-slots-FIXED-20250624-220958
node test-server.js
http://localhost:8080/test
extir
exit
claude
exit
git clone https://github.com/MoonYetis/moonyetis-slots-ultra-accessible.git
./deploy-vps.sh
http://localhost:3000
pm2 status
pm2 logs moonyetis-slots --lines 20
curl -I http://localhost:3000
apt update && apt install -y nginx certbot python3-certbot-nginx
claude
pm2 stop moonyetis-slots
cd /tmp && git clone https://github.com/MoonYetis/moonyetis-slots-ultra-accessible.git
cp -r /tmp/moonyetis-slots-ultra-accessible/* /root/Desktop/moonyetis-slots-FIXED-20250624-220958/
cd /root/Desktop/moonyetis-slots-FIXED-20250624-220958
pm2 start server.js --name moonyetis-slots
cd /tmp && git clone https://github.com/MoonYetis/moonyetis-slots-ultra-accessible.git
rm -rf /tmp/moonyetis-slots-ultra-accessible
git clone https://github.com/MoonYetis/moonyetis-slots-ultra-accessible.git
cp -r /tmp/moonyetis-slots-ultra-accessible/* /root/Desktop/moonyetis-slots-FIXED-20250624-220958/
pm2 restart moonyetis-slots
cd /root/Desktop/moonyetis-slots-FIXED-20250624-220958/frontend
cp simple-slot.html index.html
pm2 restart moonyetis-slots
claude
pm2 stop all
cd /root/Desktop/moonyetis-slots-FIXED-20250624-220958
pm2 start server.js --name moonyetis-slots
pm2 status
pm2 stop all
pm2 delete all
rm -rf /tmp/moonyetis-slots-ultra-accessible
cd /tmp && git clone https://github.com/MoonYetis/moonyetis-slots-ultra-accessible.git
rm -rf /root/Desktop/moonyetis-slots-FIXED-20250624-220958/*
cp -r /tmp/moonyetis-slots-ultra-accessible/* /root/Desktop/moonyetis-slots-FIXED-20250624-220958/
cp /root/Desktop/moonyetis-slots-FIXED-20250624-220958/frontend/production-casino.html/root/Desktop/moonyetis-slots-FIXED-20250624-220958/frontend/index.html
cp /root/Desktop/moonyetis-slots-FIXED-20250624-220958/frontend/production-casino.html
/root/Desktop/moonyetis-slots-FIXED-20250624-220958/frontend/index.html
cp /root/Desktop/moonyetis-slots-FIXED-20250624-220958/frontend/production-casino.html/root/Desktop/moonyetis-slots-FIXED-20250624-220958/frontend/index.html
cd /root/Desktop/moonyetis-slots-FIXED-20250624-220958/frontend
cp production-casino.html index.html
cd /root/Desktop/moonyetis-slots-FIXED-20250624-220958
pm2 start server.js --name moonyetis-slots
pm2 status
root@srv876195:/tmp# cd /root/Desktop/moonyetis-slots-FIXED-20250624-220958/frontend
root@srv876195:~/Desktop/moonyetis-slots-FIXED-20250624-220958/frontend# cp production-casino.html index.html
root@srv876195:~/Desktop/moonyetis-slots-FIXED-20250624-220958/frontend# cd /root/Desktop/moonyetis-slots-FIXED-20250624-220958
root@srv876195:~/Desktop/moonyetis-slots-FIXED-20250624-220958# pm2 start server.js --name moonyetis-slots
[PM2] Starting /root/Desktop/moonyetis-slots-FIXED-20250624-220958/server.js in fork_mode (1 instance)
[PM2] Done.
┌────┬────────────────────┬─────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┬──────────┬──────────┬──────────┬──────────┐
│ id │ name               │ namespace   │ version │ mode    │ pid      │ uptime │ ↺    │ status    │ cpu      │ mem      │ user     │ watching │
├────┼────────────────────┼─────────────┼─────────┼─────────┼──────────┼────────┼──────┼───────────┼──────────┼──────────┼──────────┼──────────┤
│ 0  │ moonyetis-slots    │ default     │ 1.0.0   │ fork    │ 2408072  │ 0s     │ 0    │ online    │ 0%       │ 9.7mb    │ root     │ disabled │
└────┴────────────────────┴─────────────┴─────────┴─────────┴──────────┴────────┴──────┴───────────┴──────────┴──────────┴──────────┴──────────┘
root@srv876195:~/Desktop/moonyetis-slots-FIXED-20250624-220958# pm2 status
┌────┬────────────────────┬─────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┬──────────┬──────────┬──────────┬──────────┐
│ id │ name               │ namespace   │ version │ mode    │ pid      │ uptime │ ↺    │ status    │ cpu      │ mem      │ user     │ watching │
├────┼────────────────────┼─────────────┼─────────┼─────────┼──────────┼────────┼──────┼───────────┼──────────┼──────────┼──────────┼──────────┤
│ 0  │ moonyetis-slots    │ default     │ 1.0.0   │ fork    │ 0        │ 0      │ 15   │ errored   │ 0%       │ 0b       │ root     │ disabled │
└────┴────────────────────┴─────────────┴─────────┴─────────┴──────────┴────────┴
pm2 logs moonyetis-slots --lines 20
npm install
npm install express cors helmet rate-limiter-flexible fs path
pm2 status
pm2 stop all
pm2 delete all
rm -rf /root/Desktop/moonyetis-slots-FIXED-20250624-220958
rm -rf /tmp/moonyetis-slots-ultra-accessible
ls -la /root/Desktop/
pm2 status
cd /root
pm2 status
claude
claude
BROWSER_TERMINAL_COMMANDS.md
HOSTINGER_PANEL_GUIDE.md
whoami
pwd
ls -la
node --version
npm --version
pm2 --version
claude --version
ls -la moonyetis-slots/
pm2 status
pm2 stop all
pm2 delete all
cd /var/www
mv moonyetis-slots moonyetis-slots-backup-$(date +%Y%m%d_%H%M%S)
pwd
git clone https://github.com/MoonYetis/moonyetis-production.git moonyetis-slots
exit
ss -tlnp | grep ssh
netstat -tlnp | grep ssh
cat /etc/ssh/sshd_config | grep Port
cat ~/.ssh/authorized_keys
ls -la ~/.ssh/
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC8MYWXGEtZn8BE0HhALrj0fkx6XGgZwKqP9oqUt32jW/81hbsywGzounqUOIHLOczfwb4CSkSQL60kmhx6udoHqIDRO2zMA6KTH+uha4yK1B/fgVaM0eaMP4azKMN1
claude
claude
chmod +x /root/deploy-production.sh
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres123';"
1
chmod +x /root/deploy-production.sh
bash /root/deploy-production.sh
sudo -u postgres psql -c "CREATE USER moonyetis_user WITH PASSWORD '6d14a9f3f17e0fa059903d6babe848f6';"
sudo systemctl restart postgresql
sudo -u postgres psql
cd /tmp
sudo -u postgres psql -c "CREATE DATABASE moonyetis_slots OWNER moonyetis_user;"
sudo -u postgres psql -c 'CREATE USER moonyetis_user WITH PASSWORD '"'"'MoonYetis2024!'"'"';'
sudo nano /etc/postgresql/*/main/pg_hba.conf
sudo systemctl restart postgresql
sudo -u postgres psql -c 'CREATE USER moonyetis_user WITH PASSWORD '"'"'MoonYetis2024!'"'"';'
sudo -u postgres psql -c 'CREATE DATABASE moonyetis_slots OWNER moonyetis_user;'
sudo -u postgres psql -c 'GRANT ALL PRIVILEGES ON DATABASE moonyetis_slots TO moonyetis_user;'
sudo -u postgres psql -c '\l' | grep moonyetis
/tmp
chmod +x /root/complete-deployment.sh
bash /root/complete-deployment.sh
PGPASSWORD='MoonYetis2024!' psql -h localhost -U postgres -d postgres -c "ALTER USER moonyetis_user WITH 
  PASSWORD 'MoonYetis2024!';"
sudo -u postgres psql -c 'ALTER USER moonyetis_user WITH PASSWORD '"'"'MoonYetis2024!'"'"';'
sudo -u postgres psql
sed -i 's/must-revalidate/must_revalidate/g' /root/moonyetis-slots/nginx-simple.conf
sudo cp /root/moonyetis-slots/nginx-simple.conf /etc/nginx/sites-available/moonyetis-slots
sudo nginx -t
sudo systemctl restart nginx
sed -i 's/gzip_proxied expired no-cache no-store private must_revalidate no_last_modified no_etag 
  auth;/gzip_proxied expired no-cache no-store private auth;/' /root/moonyetis-slots/nginx-simple.conf
claude
claude
exit
scp /Users/osmanmarin/Desktop/projects/moonyetis-clean.tar.gz root@168.231.124.18:/tmp/
claude
scp /Users/osmanmarin/Desktop/projects/moonyetis-real-wallet-20250629-1148.tar.gz root@168.231.124.18:/tmp/
exit
claude
claude
exit
claude
claude
claude
claude
claude
tail -f /var/log/nginx/access.log
tail -f /var/www/api/hd-wallet.log
mkdir -p /var/www/api
ps aux | grep node
claude
git --version
cd ~
mkdir moonyetis-deploy
cd moonyetis-deploy
git clone https://github.com/MoonYetis/moonyetis-deploy.git
git clone https://github.com/MoonYetis/moonyetis-deploy.git .
git init
git remote add origin https://github.com/MoonYetis/moonyetis-deploy.git
git add .
cd ~
exit
cd ~
mkdir moonyetis-deploy
cd moonyetis-deploy
cd ~/moonyetis-deploy
ls -la
git pull origin main
nano deploy.sh
chmod +x deploy.sh
./deploy.sh
/home/deploy/.ssh/authorized_keys
exit
mkdir -p /home/deploy/.ssh
echo "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQCmBnqlRi+fLT/KwokyWSOWe2wSqbkEi4qk26CQksy8KwMvwKPr9N2aRfWXJt0YgCz1yN9kFdpgye7taZzhy8FzeMCKa2I0MSpUFr2bm98CWE39Dy+SfWguwmtWp4G0y8x2wBoNJnqrQZI7gp2N8uGzgJlBhXubrjBPVUhnAz2v1kAA13HFZoTP2S02zb8xC0n86ThmtM2vO1XPajLxO9LNkaYkQRuYRn7iaqmHo+OhKXUdnKw5Z8OnVKfGxhvLthhqkqfKek7+B3yi51iroyiBZm4Md08RLWX9kwskcoZKSeaN7exXbcN5kk7AZ+BQAk1cU3rqUEvYFJndHjwSwHjXPSQzv6kkRaJ9/rXqBtJYandpPLMKJb5hmq+73232yF7Q6dRDfOVpNmpN9NrU5Qb5JtLpapgjvk6Z6BHXIC2SKvm34l+m1iq9kZOSqNJjIXglSiTHFR/zYvhIFQ7eua1ywqFLiYSiIojawLmbVamXKp6UObuU9n7oGCjFTGtSgr21M886xYc/xDKqRusOkHC8iza5MPvTRF5pCxHDPcBLza/ZuB/VmhKg79XTv1NpzZAjyvGeGe8LlK6EGPT3a80sXEegUKOih59nhmjAk5C8As4pOt/ritfTSAXNQsN1doiAzoOOs1LMQEpr1EUdS00E4VS+YLsFIv+MgwD3u6+e5Q== your-email@example.com" > /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
ssh deploy@168.231.124.18
nano /home/git/tu-app.git/hooks/post-receive
rm -rf /home/git/tu-app.git
cd /var/www/tu-app
mkdir -p /var/www/tu-app
cd /var/www/tu-app
nano /home/git/tu-app.git/hooks/post-receive
mkdir -p /home/git/tu-app.git
cd /home/git/tu-app.git
git init --bare
nano /home/git/tu-app.git/hooks/post-receive
cd /var/www/tu-app
nano /home/git/tu-app.git/hooks/post-receive
mkdir -p /var/www/tu-app
chown -R tu_usuario:www-data /var/www/tu-app
chmod -R 775 /var/www/tu-app
chown -R deploy:www-data /var/www/tu-app
chmod -R 775 /var/www/tu-app
ls -l /var/www/tu-app/deploy.sh
claude
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
id deploy
chown -R deploy:deploy /home/git/tu-app.git
chmod -R 755 /home/git/tu-app.git
claude
