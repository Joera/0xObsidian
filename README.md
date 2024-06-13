git clone https://github.com/Joera/cryptobsidian.git 
npm i 
npm run build
scp -r dist <yourvault>/.obisidian/plugins/0xObsidian 

nano <yourvault>/.obisidian/plugins/0xObsidian/.env

SEPOLIA_RPC_URL=

SEPOLIA_API_KEY=

MAINNET_RPC_URL=

MAINNET_API_KEY=

ARBISCAN_API_KEY=
