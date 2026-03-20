const fs = require('fs');
const files = fs.readdirSync('/home/surafel/.npm/_logs/').map(f => '/home/surafel/.npm/_logs/' + f);
files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  if (content.includes('400')) console.log(f, 'has 400');
});
