const bcrypt = require('bcrypt');

async function testAuth() {
  const testPassword = 'test1234';
  const testHash = '$2b$10$wLpa5V5QVMWmCQkXUddkrO7nAqAu7t.p7vUkkwVdMNAWpVhY3Mlbm';
  
  console.log('🔍 Testing password verification...');
  console.log('Password:', testPassword);
  console.log('Hash:', testHash);
  
  const isValid = await bcrypt.compare(testPassword, testHash);
  console.log('Password valid:', isValid);
  
  if (!isValid) {
    console.log('❌ Password hash is invalid!');
    console.log('🔧 Generating new hash...');
    const newHash = await bcrypt.hash(testPassword, 10);
    console.log('New hash:', newHash);
  } else {
    console.log('✅ Password hash is valid!');
  }
}

testAuth().catch(console.error);
