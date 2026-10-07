#!/usr/bin/env node
// Builds the single self-contained page from the files in src/.
//   node build.js        -> index.html (for GitHub Pages) and dist/artifact.html (body-only variant)
const fs = require('fs'), path = require('path');
const src = (f) => fs.readFileSync(path.join(__dirname, 'src', f), 'utf8');
const ENGINE = ['core', 'content-earth', 'tape-co', 'tape', 'run', 'meta'].map((f) => 'engine/' + f + '.js');
const UI = ['dom', 'audio', 'charts', 'app', 'screens-run', 'screens-life', 'screens-hub', 'casino'].map((f) => 'ui/' + f + '.js');
const js = ENGINE.concat(UI).filter((f) => fs.existsSync(path.join(__dirname, 'src', f))).map((f) => '/* ==== ' + f + ' ==== */\n' + src(f)).join('\n');
const css = src('fonts.css') + '\n' + src('style.css');
const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
const body = '<div id="app" data-th="th_floor" data-cd="cd_classic"><noscript>Bellwether needs JavaScript switched on.</noscript></div>';
const boot = '\nwindow.BW_BUILD=' + JSON.stringify(stamp) + ';\n(function(){function go(){try{BW.App.boot();}catch(e){console.error(e);var a=document.getElementById("app");if(a)a.innerHTML=\'<p style="padding:24px;font:16px system-ui;color:#fff">Bellwether hit an error while starting: \'+String(e&&e.message||e)+\'</p>\';}}' +
  'if(window.claude&&window.claude.hot&&window.claude.hot.ready){window.claude.hot.ready(go);}else if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",go);}else{go();}})();';
const head = '<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">\n<meta name="theme-color" content="#0E1B2C">\n' +
  '<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="mobile-web-app-capable" content="yes">\n<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n<meta name="apple-mobile-web-app-title" content="Bellwether">\n' +
  '<link rel="icon" href="data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#0E1B2C"/><path d="M32 12c-9 0-13 7-13 15 0 12-5 15-6 19h38c-1-4-6-7-6-19 0-8-4-15-13-15z" fill="#E6BA4E"/><circle cx="32" cy="50" r="5" fill="#B98E2C"/></svg>') + '">';
const full = '<!doctype html>\n<html lang="en">\n<head>\n' + head + '\n<title>Bellwether</title>\n<style>\n' + css + '\n</style>\n</head>\n<body>\n' + body + '\n<script>\n' + js + boot + '\n</script>\n</body>\n</html>\n';
fs.writeFileSync(path.join(__dirname, 'index.html'), full);
fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
// The artifact host supplies its own doctype/head/body, so this variant is content only.
fs.writeFileSync(path.join(__dirname, 'dist', 'artifact.html'), '<title>Bellwether</title>\n<meta name="theme-color" content="#0E1B2C">\n<style>\n:root{color-scheme:dark;padding:0!important}\n' + css + '\n</style>\n' + body + '\n<script>\n' + js + boot + '\n</script>\n');
console.log('built index.html', (full.length / 1024).toFixed(0) + ' KB');
