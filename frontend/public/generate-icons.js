// Run: node public/generate-icons.js
// Creates placeholder PNG icons for development

const fs = require('fs')
const path = require('path')

const iconsDir = path.join(__dirname, 'icons')
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true })
}

// Create SVG icon (K letter in gold circle)
const createSvgIcon = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" 
  xmlns="http://www.w3.org/2000/svg">
  <circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="#0A0A0F"/>
  <circle cx="${size/2}" cy="${size/2}" r="${size/2 - size*0.04}" fill="#F5A623"/>
  <text x="${size/2}" y="${size/2 + size*0.15}" 
    font-family="Arial Black,sans-serif" 
    font-size="${size * 0.5}" 
    font-weight="900" 
    fill="#0A0A0F" 
    text-anchor="middle">K</text>
</svg>
`

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]
sizes.forEach((size) => {
  fs.writeFileSync(
    path.join(iconsDir, `icon-${size}x${size}.svg`),
    createSvgIcon(size)
  )
  console.log(`✅ Created icon-${size}x${size}.svg`)
})

// Shortcut icons
const shortcuts = ['sos', 'ai', 'feed', 'bet']
const shortcutColors = {
  sos: '#FF2D2D', ai: '#F5A623', feed: '#10B981', bet: '#8B5CF6',
}
const shortcutEmojis = { sos: '🆘', ai: '🤖', feed: '📸', bet: '🎯' }

shortcuts.forEach((name) => {
  const color = shortcutColors[name]
  const svg = `
<svg width="96" height="96" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
  <circle cx="48" cy="48" r="48" fill="${color}"/>
  <text x="48" y="63" font-size="40" text-anchor="middle">${shortcutEmojis[name]}</text>
</svg>`
  fs.writeFileSync(path.join(iconsDir, `shortcut-${name}.svg`), svg)
  console.log(`✅ Created shortcut-${name}.svg`)
})

console.log('\n✅ All icons created! Convert SVG to PNG for production.')
console.log('For production: use sharp or squoosh.app to convert to PNG')