import { readFileSync } from 'node:fs'
for (const file of ['index.html','styles/base.css','styles/app.css','src/app.js','supabase/schema.sql']) readFileSync(file, 'utf8')
console.log('Build check completed: static assets are present.')
