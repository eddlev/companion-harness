// scripts/encrypt_env.js
const crypto = require('node:crypto');
const fs = require('node:fs');
const readline = require('node:readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Enter a strong Master Passphrase to encrypt your .env: ', (passphrase) => {
  const envPath = '.env';
  const encPath = '.env.enc';
  const algorithm = 'aes-256-cbc';

  // 1. Derive a 32-byte key from your passphrase using a salt
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(passphrase, salt, 32);
  const iv = crypto.randomBytes(16); // Initialization Vector

  const cipher = crypto.createCipheriv(algorithm, key, iv);
  const input = fs.readFileSync(envPath);
  
  const encrypted = Buffer.concat([cipher.update(input), cipher.final()]);

  // 2. Save Salt + IV + Encrypted Data to .env.enc
  const output = Buffer.concat([salt, iv, encrypted]);
  fs.writeFileSync(encPath, output);

  console.log(`\n[SUCCESS] .env encrypted to ${encPath}`);
  console.log('You may now safely delete the original .env file.');
  rl.close();
});