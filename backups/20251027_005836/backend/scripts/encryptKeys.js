require('dotenv').config();
const { encryptPrivateKey, generateMasterKey } = require('../utils/encryption');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log('🔐 Bruno Token - Private Key Encryption Tool\n');

// Проверяем наличие мастер-ключа
if (!process.env.ENCRYPTION_MASTER_KEY) {
  console.log('⚠️  ENCRYPTION_MASTER_KEY not found in .env');
  console.log('Generating a new master key...\n');
  
  const masterKey = generateMasterKey();
  console.log('✅ Master Key generated:');
  console.log(masterKey);
  console.log('\n⚠️  Add this to your .env file:');
  console.log(`ENCRYPTION_MASTER_KEY=${masterKey}`);
  console.log('\n⚠️  IMPORTANT: Keep this key safe! Without it, you cannot decrypt your private keys.\n');
  
  rl.close();
  process.exit(0);
}

console.log('Enter private keys to encrypt (or press Ctrl+C to exit):\n');

rl.question('MetaMask Private Key: ', (metamaskKey) => {
  if (metamaskKey) {
    try {
      const encrypted = encryptPrivateKey(metamaskKey);
      console.log('\n✅ MetaMask key encrypted:');
      console.log(encrypted);
      console.log('\nAdd to .env:');
      console.log(`TREASURY_METAMASK_PRIVATE_KEY_ENCRYPTED=${encrypted}\n`);
    } catch (error) {
      console.error('❌ Error encrypting MetaMask key:', error.message);
    }
  }

  rl.question('TronLink Private Key: ', (tronKey) => {
    if (tronKey) {
      try {
        const encrypted = encryptPrivateKey(tronKey);
        console.log('\n✅ TronLink key encrypted:');
        console.log(encrypted);
        console.log('\nAdd to .env:');
        console.log(`TREASURY_TRONLINK_PRIVATE_KEY_ENCRYPTED=${encrypted}\n`);
      } catch (error) {
        console.error('❌ Error encrypting TronLink key:', error.message);
      }
    }

    console.log('✅ Done! Remember to add these to your .env file.\n');
    rl.close();
  });
});
