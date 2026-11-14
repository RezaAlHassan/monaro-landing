import fs from 'node:fs';
import path from 'node:path';
fs.mkdirSync('public/assets',{recursive:true});
fs.copyFileSync('index.html','public/index.html');
for(const name of ['monaro-mark.png','monaro-favicon.png','monaro-logo.png','chat-pattern.svg']) fs.copyFileSync(path.join('assets',name),path.join('public/assets',name));
