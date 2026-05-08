const fs = require('fs');
const path = require('path');

const srcApp = path.join(__dirname, 'src', 'app');
const adminGroup = path.join(srcApp, '(admin)');

if (!fs.existsSync(adminGroup)) {
    fs.mkdirSync(adminGroup);
}

const itemsToMove = [
    'admissions',
    'courses',
    'finance',
    'insights',
    'login',
    'staff',
    'students',
    'page.tsx'
];

itemsToMove.forEach(item => {
    const oldPath = path.join(srcApp, item);
    const newPath = path.join(adminGroup, item);
    if (fs.existsSync(oldPath)) {
        fs.renameSync(oldPath, newPath);
        console.log(`Moved ${item} to (admin)`);
    } else {
        console.log(`Could not find ${item}`);
    }
});
