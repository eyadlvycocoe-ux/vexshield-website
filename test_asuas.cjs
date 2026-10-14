const fs = require('fs');

async function test() {
  const envFile = fs.readFileSync('.env', 'utf-8');
  const token = envFile.match(/VITE_ASUAS_API_TOKEN=(.+)/)[1].trim();

  const endpoints = ['bans', 'cheaters', 'events'];
  for (const ep of endpoints) {
    try {
      const res = await fetch(`https://api.asuas.eu/${ep}?discordID=1339366537085321257`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      console.log(`${ep.toUpperCase()}:`, JSON.stringify(data, null, 2).substring(0, 500));
    } catch (e) {
      console.log(e.message);
    }
  }
}

test();