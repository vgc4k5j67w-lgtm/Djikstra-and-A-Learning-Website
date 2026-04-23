const fs = require('fs');
const d = JSON.parse(fs.readFileSync('dummy.json'));
let currentQuestions = d;
let currentQuestionIndex = 0;
// copy paste displayQuestion
