const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '../micropay-docs.html');
let html = fs.readFileSync(target, 'utf8');

// Replace all instances of localhost:3000 with micropay.up.railway.app
html = html.replace(/localhost:3000/g, 'micropay.up.railway.app');
html = html.replace(/http:\/\/localhost/g, 'https://micropay'); // Some cURLs might use http instead of https

fs.writeFileSync(target, html, 'utf8');
console.log('URLs updated to Railway.');
