console.log("Pathfinding site.js loaded!");

// ==========================================
// Global Variables & Application State
// We set up these variables to keep track of 
// the user interface state, like mouse actions,
// current application tab, and active tool modes.
// ==========================================
let currentTab = 'content';
let isMouseDown = false;
let drawMode = null;   // "wall", "erase", "move-start", "move-goal"
let lastMouseRow = null;
let lastMouseCol = null;
let isAlgorithmRunning = false;  // Flag to prevent interactions during algorithm execution


// Update the grid cell to be a wall (or remove a wall) if it's within bounds
function setWallAt(row, col, makeWall) {
    // Check if the condition is met before proceeding to avoid errors or wrong behavior.
    if (row < 0 || row >= gridRows || col < 0 || col >= gridCols) return;
    const cell = grid[row][col];
    // Check if the condition is met before proceeding to avoid errors or wrong behavior.
    if (cell.isStart || cell.isGoal) return;
    cell.isWall = makeWall;
}

// Handle moving the start or goal node to a new location on the grid
function moveSpecialNode(nodeType, targetRow, targetCol) {
    
    if (targetRow < 0 || targetRow >= gridRows || targetCol < 0 || targetCol >= gridCols) return;

    const targetCell = grid[targetRow][targetCol];
    if (!targetCell) return;

    if (targetCell.isWall) return;

    if (nodeType === 'start' && targetCell.isGoal) return;
    
    if (nodeType === 'goal' && targetCell.isStart) return;

    for (let r = 0; r < gridRows; r++) {
        for (let c = 0; c < gridCols; c++) {
            if (nodeType === 'start' && grid[r][c].isStart) {
                grid[r][c].isStart = false;
            }
            if (nodeType === 'goal' && grid[r][c].isGoal) {
                grid[r][c].isGoal = false;
            }
        }
    }

    if (nodeType === 'start') {
        targetCell.isStart = true;
    } else {
        targetCell.isGoal = true;
    }
}

// Create obstacles in a line between two points using Bresenham's line algorithm
// Draw a line of walls between two points so the user can click and drag
function drawLineTo(fromRow, fromCol, toRow, toCol, makeWall) {
    const dx = Math.abs(toCol - fromCol);
    const dy = Math.abs(toRow - fromRow);
    const sx = fromCol < toCol ? 1 : -1;
    const sy = fromRow < toRow ? 1 : -1;
    let err = dx - dy;
    
    let row = fromRow;
    let col = fromCol;

    while (true) {
        setWallAt(row, col, makeWall);
        
        if (row === toRow && col === toCol) break;
        
        const e2 = 2 * err;

        if (e2 > -dy) {
            err -= dy;
            col += sx;
        }
 
        if (e2 < dx) {
            err += dx;
            row += sy;
        }
    }
}

// Switch between different sections of the app (like grid, quiz, pdfs)
function showTab(tabName) {
    console.log("Switching to tab:", tabName); 
    
    // hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        console.log("Removing active from:", tab.id);
        tab.classList.remove('active');
    });
    
    // remove active class from all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // show target tab content
    const targetTab = document.getElementById(tabName + '-tab');
    console.log("Looking for tab with id:", tabName + '-tab');
    console.log("Found tab:", targetTab);

    if (targetTab) {
        console.log("Adding active class to tab");
        targetTab.classList.add('active');
    } else {
        console.log("ERROR: Tab not found!");
    }

    // add active class to clicked button
    const clickedButton = document.querySelector(`[onclick="showTab('${tabName}')"]`);
    console.log("Looking for button with onclick containing:", tabName);
    console.log("Found button:", clickedButton);
 
    if (clickedButton) {
        clickedButton.classList.add('active');
    }

    currentTab = tabName;
    
    // Load the tab of each 

    if (tabName === 'content') {
        loadPdfs();
    } else if (tabName === 'questions') {
        loadQuestions();
    } else if (tabName === 'visual') {

        if (!gridInitialized || !grid || grid.length === 0) {
            initGrid();
        }
        drawGrid();
    }
}

// Convert bytes to a readable format (KB, MB) for the PDF list
function formatPdfSize(bytes) {

    if (!Number.isFinite(bytes) || bytes <= 0) return 'Unknown size';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    // Keep looping through as long as we still have items to process.
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }
    return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

// Format the raw date string into something nicer for the UI
function formatPdfDate(isoDate) {
    // Check if the condition is met before proceeding to avoid errors or wrong behavior.
    if (!isoDate) return 'Unknown date';
    const date = new Date(isoDate);
    // Check if the condition is met before proceeding to avoid errors or wrong behavior.
    if (Number.isNaN(date.getTime())) return 'Unknown date';
    return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Load PDFs from backend
async function loadPdfs() {
    const pdfList = document.getElementById('pdf-list');
    // Check if the condition is met before proceeding to avoid errors or wrong behavior.
    if (!pdfList) return;

    pdfList.innerHTML = '<p class="pdf-empty">Loading PDF resources...</p>';

    try {
        const res = await fetch('/api/resources/pdfs');
        // Check if the condition is met before proceeding to avoid errors or wrong behavior.
        if (!res.ok) {
            const errorText = await res.text();
            console.warn('PDF API returned non-success response:', res.status, errorText);
            renderFallbackPdfList(pdfList, `HTTP ${res.status}`);
            return;
        }

        const pdfs = await res.json();
        // Check if the condition is met before proceeding to avoid errors or wrong behavior.
        if (!Array.isArray(pdfs) || pdfs.length === 0) {
            pdfList.innerHTML = `
                <div class="pdf-empty-wrap">
                    <p class="pdf-empty">No PDF files found yet.</p>
                    <p class="pdf-help">Add files to <strong>wwwroot/pdfs</strong> and refresh this tab.</p>
                </div>
            `;
            return;
        }

        const cardsHtml = pdfs.map(pdf => {
            const title = pdf.title || pdf.fileName || 'Untitled PDF';
            const url = pdf.url || '#';
            const sizeText = formatPdfSize(pdf.sizeBytes);
            const dateText = formatPdfDate(pdf.lastModifiedUtc);
            return `
                <article class="pdf-card">
                    <div class="pdf-card-main">
                        <h3 class="pdf-title">${title}</h3>
                        <p class="pdf-meta">${sizeText} • Updated ${dateText}</p>
                    </div>
                    <div class="pdf-actions">
                        <a class="pdf-btn pdf-btn-view" href="${url}" target="_blank" rel="noopener noreferrer">Open</a>
                        <a class="pdf-btn pdf-btn-download" href="${url}" download>Download</a>
                    </div>
                </article>
            `;
        }).join('');

        pdfList.innerHTML = cardsHtml;
    } catch (e) {
        console.error('Failed to load PDFs:', e);
        renderFallbackPdfList(pdfList, e && e.message ? e.message : 'Unknown error');
    }
}

// Load questions/quizzes for the Questions tab
// Fetch the quiz questions from the API to display to the user
function loadQuestions() {
    // The quiz interface is already defined in the HTML
    console.log("Questions tab loaded - quiz interface is ready");
}

// Quiz state
let currentQuiz = null;
let currentQuestions = [];
let currentQuestionIndex = 0;
let quizMode = 'mixed';


// go back to question 1 instead of starting a new quiz if quiz is already loaded
// Let the user pick up where they left off in the current quiz
function resumeQuiz() {
    currentQuestionIndex = 0;
    
    if (currentQuestions && currentQuestions.length > 0) {
        for (let i = 0; i < currentQuestions.length; i++) {
            const q = currentQuestions[i];
            const hasAnswer = localStorage.getItem(`quiz_q${q.id}_answer`);
            const hasMarks = localStorage.getItem(`quiz_q${q.id}_marks`);
            
            if (!hasAnswer || (q.type === 'LongAnswer' && !hasMarks)) {
                currentQuestionIndex = i;
                break;
            }
        }
    }
    
    displayQuestion();
}

// Start a quiz - load questions inline
// Show an error message during quiz configuration
function showQuizConfigError(message) {
    const errorDiv = document.getElementById('quiz-config-error');
    if (errorDiv) {
        if (message) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        } else {
            errorDiv.textContent = '';
            errorDiv.style.display = 'none';
        }
    }
}

async function startQuiz() {
    showQuizConfigError(''); // Clear previous errors
    const container = document.getElementById('quiz-container');
    const quizModeSelect = document.getElementById('quiz-mode');
    const questionCountInput = document.getElementById('question-count');
    quizMode = quizModeSelect ? quizModeSelect.value : 'mixed';
    const requestedCountRaw = questionCountInput ? questionCountInput.value.trim() : '';

    if (!requestedCountRaw) {
        //showQuizConfigError('Please enter how many questions you want (greater than 0).');
        return;
    }

    const requestedCount = parseInt(requestedCountRaw, 10);
    if (!Number.isInteger(requestedCount) || requestedCount <= 0) {
        showQuizConfigError('Please enter a valid number greater than 0.');
        return;
    }
    
    // Clear localStorage for this quiz to start fresh
    const keys = Object.keys(localStorage);
    keys.forEach(key => {

        if (key.startsWith('quiz_q')) {
            localStorage.removeItem(key);
        }
    });
    
    
    try {
        // Fetch quizzes
        console.log('Fetching quizzes from /api/quizzes...');
        const res = await fetch('/api/quizzes');
        console.log('Quizzes response status:', res.status);
        
        // Check if the condition is met before proceeding to avoid errors or wrong behavior.
        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`HTTP ${res.status}: ${res.statusText} - ${errorText}`);
        }
        
        const quizzes = await res.json();
        console.log('Quizzes fetched:', quizzes);
        
        // Check if the condition is met before proceeding to avoid errors or wrong behavior.
        if (!Array.isArray(quizzes) || quizzes.length === 0) {
            container.innerHTML = '<p>No quizzes available. Please seed the database.</p>';
            return;
        }
        
        currentQuiz = quizzes[0];
        console.log('Selected quiz:', currentQuiz);
        
        // Fetch questions for this quiz with the selected mode
        console.log(`Fetching questions from /api/quizzes/${currentQuiz.id}/questions?mode=${quizMode}...`);
        const questionsRes = await fetch(`/api/quizzes/${currentQuiz.id}/questions?mode=${quizMode}`);
        console.log('Questions response status:', questionsRes.status);
        
        // Check if the condition is met before proceeding to avoid errors or wrong behavior.
        if (!questionsRes.ok) {
            const errorText = await questionsRes.text();
            throw new Error(`HTTP ${questionsRes.status}: ${questionsRes.statusText} - ${errorText}`);
        }
        
        const questions = await questionsRes.json();
        console.log('Questions fetched:', questions);
        
        // Check if the condition is met before proceeding to avoid errors or wrong behavior.
        if (!Array.isArray(questions) || questions.length === 0) {
            container.innerHTML = '<p>No questions available for this mode.</p>';
            return;
        }

        // Check if the condition is met before proceeding to avoid errors or wrong behavior.
        if (requestedCount > questions.length) {
            showQuizConfigError(`Not enough questions available for this mode. Please choose ${questions.length} or fewer.`);
            container.innerHTML = '';
            return;
        }
        
        currentQuestions = questions.slice(0, requestedCount);
        currentQuestionIndex = 0;
        
        // Display first question
        displayQuestion();
        
    } catch (e) {
        console.error('Failed to load quiz:', e);
        container.innerHTML = `<p>Failed to load quiz. Error: ${e.message}</p>`;
    }
}

// Display the current question
// Update the screen to show the current question and its choices
function displayQuestion() {
    const container = document.getElementById('quiz-container');
    const question = currentQuestions[currentQuestionIndex];
    
    // Check if the condition is met before proceeding to avoid errors or wrong behavior.
    if (!question) {
        container.innerHTML = '<p>No questions available.</p>';
        return;
    }
    
    let html = `
        <div class="quiz-card">
            <div class="quiz-margin">
                <span class="quiz-meta">Question ${currentQuestionIndex + 1} of ${currentQuestions.length}</span>
            </div>
            <div class="question-box">
                <div class="question-text"><strong>${question.text}</strong></div>
                <div class="question-points">${question.points} points</div>
            </div>
    `;
    
    // Check if the condition is met before proceeding to avoid errors or wrong behavior.
    if (question.type === 'MultipleChoice' && question.choices && question.choices.length > 0) {
        html += '<div class="quiz-margin" id="choices-container">';
        // Loop through each item so we can update or check them one by one.
        for (const choice of question.choices) {
            html += `
                <div class="choice-margin choice-container" data-choice-id="${choice.id}" data-is-correct="${choice.isCorrect}" data-explanation="${(choice.explanation || '').replace(/"/g, '&quot;')}">
                    <label class="choice-label-style choice-label">
                        <input type="radio" name="quiz-answer" value="${choice.id}" class="radio-input" onchange="checkAnswer()" />
                        <span>${choice.text}</span>
                    </label>
                </div>
            `;
        }
        html += '<div id="feedback-container" class="feedback-box"></div>';
        html += '</div>';
    } else {
        // Long answer question - show hints if available
        html += '<div class="quiz-margin">';
        // Check if the condition is met before proceeding to avoid errors or wrong behavior.
        if (question.hints && question.hints.length > 0) {
            html += `
                <div class="hints-margin">
                    <details class="hints-details">
                        <summary class="hints-summary"> Hints ;) (${question.hints.length})</summary>
                        <div class="hints-content">
                            ${question.hints.map(hint => `<div class="hint-item">• ${hint.text}</div>`).join('')}
                        </div>
                    </details>
                </div>
            `;
        }
        html += `
                <textarea id="quiz-answer-text" rows="6" class="textarea-answer" placeholder="Type your answer here..."></textarea>
                <div id="long-answer-error" style="color: #dc3545; display: none; margin-top: 5px; font-weight: 500;">Please write an answer before submitting.</div>
            </div>
        <div id="model-answer-container" class="model-answer-box">
                <div class="model-answer-title"> Model Answer</div>
                <div id="model-answer-text" class="model-answer-content"></div>
                <div class="marking-title"> How many marks did you get? (Be honest!!)</div>
                <div class="marking-flex" id="marking-options"></div>
            </div>
        `;
    }
    
    // Navigation buttons
    html += '<div class="action-buttons">';
    
    // Check if the condition is met before proceeding to avoid errors or wrong behavior.
    if (currentQuestionIndex > 0) {
        html += '<button onclick="previousQuestion()" class="btn-secondary">← Previous</button>';
    }
    
    // Check if the condition is met before proceeding to avoid errors or wrong behavior.
    if (question.type === 'LongAnswer') {
        // For long-answer questions, add Submit Answer button
        html += '<button onclick="submitAnswer()" class="btn-warning">Submit Answer</button>';
    }
    
    // Check if the condition is met before proceeding to avoid errors or wrong behavior.
    if (currentQuestionIndex < currentQuestions.length - 1) {
        html += '<button onclick="nextQuestion()" class="btn-primary">Next →</button>';
    } else {
        html += '<button onclick="finishQuiz()" class="btn-success">Finish Quiz</button>';
    }
    
    html += '</div></div>';
    
    container.innerHTML = html;
//----------------------------------------------------------------------------------------------------------------------
    // Restore saved answers from localStorage
    // Check if the condition is met before proceeding to avoid errors or wrong behavior.
    if (question.type === 'MultipleChoice') {
        const savedAnswer = localStorage.getItem(`quiz_q${question.id}_answer`);
        // Check if the condition is met before proceeding to avoid errors or wrong behavior.
        if (savedAnswer) {
            const radio = document.querySelector(`input[name="quiz-answer"][value="${savedAnswer}"]`);
            // Check if the condition is met before proceeding to avoid errors or wrong behavior.
            if (radio) {
                radio.checked = true;
                // Re-run checkAnswer to show feedback
                checkAnswer();
            }
        }
    } else {
        // Long-form question
        const savedAnswer = localStorage.getItem(`quiz_q${question.id}_answer`);
        const textarea = document.getElementById('quiz-answer-text');
        // Check if the condition is met before proceeding to avoid errors or wrong behavior.
        if (savedAnswer && textarea) {
            textarea.value = savedAnswer;
            textarea.disabled = true;
        }
        
        // Restore model answer and marking if already submitted
        const savedMarks = localStorage.getItem(`quiz_q${question.id}_marks`);
        // Check if the condition is met before proceeding to avoid errors or wrong behavior.
        if (savedMarks !== null) {
            submitAnswer();
        }
    }
}
//----------------------------------------------------------------------------------------------------------------------
// Checks answer for multiple choice questions
// See if the user clicked the right choice and update their score
function checkAnswer() {
    const question = currentQuestions[currentQuestionIndex];
    // Check if the condition is met before proceeding to avoid errors or wrong behavior.
    if (!question || question.type !== 'MultipleChoice') return;
    
    console.log('Question:', question);
    console.log('Choices:', question.choices);
    
    const selectedRadio = document.querySelector('input[name="quiz-answer"]:checked');
    // Check if the condition is met before proceeding to avoid errors or wrong behavior.
    if (!selectedRadio) {
        return;
    }
    
    const selectedId = parseInt(selectedRadio.value);
    
    // Save answer to localStorage
    localStorage.setItem(`quiz_q${question.id}_answer`, selectedId);
    console.log('Selected ID:', selectedId);
    
    const choices = document.querySelectorAll('.choice-container');
    console.log('Choice elements:', choices);
    
    const feedbackContainer = document.getElementById('feedback-container');
    
    // Update the UI with feedback
    choices.forEach(choiceEl => {
        const choiceId = parseInt(choiceEl.getAttribute('data-choice-id'));
        const isCorrect = choiceEl.getAttribute('data-is-correct') === 'true';
        const explanation = choiceEl.getAttribute('data-explanation') || '';
        const label = choiceEl.querySelector('.choice-label');
        
        console.log('Choice ID:', choiceId, 'isCorrect:', isCorrect);
        
        // Conditional branch validating node accuracy
        // Check if the condition is met before proceeding to avoid errors or wrong behavior.
        if (isCorrect) {
            // Evaluates true: injects success CSS stylings directly into the DOM node
            label.style.border = '2px solid #28a745';
            label.style.backgroundColor = '#d4edda';
        } else if (choiceId === selectedId && !isCorrect) {
            // Evaluates false but selected: injects failure CSS stylings directly into DOM node 
            label.style.border = '2px solid #dc3545';
            label.style.backgroundColor = '#f8d7da';
            
            // Extracts API-provided textual explanation for incorrect choices
            // Check if the condition is met before proceeding to avoid errors or wrong behavior.
            if (feedbackContainer) {
              feedbackContainer.textContent = explanation || 'Incorrect';
                feedbackContainer.style.display = 'block';
            }
        }
    });
    
    // Disable all radio buttons
    const radios = document.querySelectorAll('input[name="quiz-answer"]');
    radios.forEach(radio => radio.disabled = true);
}


// Go back one question in the quiz
function previousQuestion() {

    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        displayQuestion();
    }
}

// Submit answer for long-form question and show model answer with marking
// Send the user's typed answer to the server for checking
function submitAnswer() {
    const question = currentQuestions[currentQuestionIndex];

    if (!question || question.type !== 'LongAnswer') return;
    
    const textAnswer = document.getElementById('quiz-answer-text');
    const errorDiv = document.getElementById('long-answer-error');
    if (!textAnswer || !textAnswer.value.trim()) {
        if (errorDiv) errorDiv.style.display = 'block';
        return;
    }
    if (errorDiv) errorDiv.style.display = 'none';

    // Save answer to localStorage
    localStorage.setItem(`quiz_q${question.id}_answer`, textAnswer.value);
    
    // Show the model answer and marking options
    const modelAnswerContainer = document.getElementById('model-answer-container');
    const modelAnswerText = document.getElementById('model-answer-text');
    const markingOptions = document.getElementById('marking-options');
    
    if (modelAnswerContainer && modelAnswerText) {
        modelAnswerText.textContent = question.modelAnswer || 'No model answer available.';
        
        // Generate marking options (0 to max points)
        markingOptions.innerHTML = '';
        for (let i = 0; i <= question.points; i++) {
            const isSelected = localStorage.getItem(`quiz_q${question.id}_marks`) == i;
            const buttonStyle = isSelected 
                ? 'background: #28a745; color: white; border: 2px solid #1e5a2b;'
                : 'background: white; color: #333; border: 1px solid #ddd;';
            
            markingOptions.innerHTML += `
                <button onclick="selectMarks(${question.id}, ${i})" class="mark-btn" style="${buttonStyle}">
                    ${i}/${question.points}
                </button>
            `;
        }
        
        modelAnswerContainer.style.display = 'block';
        
        // disable text area and submit button
        textAnswer.disabled = true;
        const submitBtn = Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.includes('Submit Answer'));        // Check if the condition is met before proceeding to avoid errors or wrong behavior.
        if (submitBtn) {
            submitBtn.style.display = 'none';
        }
    }
}

// Select marks for a long-form answer
// Update the score based on how the marker decided to grade the answer
function selectMarks(questionId, marks) {
    // Store in localStorage
    localStorage.setItem(`quiz_q${questionId}_marks`, marks);
    
    // Update button UI
    const markingOptions = document.getElementById('marking-options');
    const buttons = markingOptions.querySelectorAll('button');
    buttons.forEach((btn, index) => {
        // Check if the condition is met before proceeding to avoid errors or wrong behavior.
        if (index === marks) {
            btn.style.background = '#28a745';
            btn.style.color = 'white';
            btn.style.border = '2px solid #1e5a2b';
        } else {
            btn.style.background = 'white';
            btn.style.color = '#333';
            btn.style.border = '1px solid #ddd';
        }
    });
}

// Go to next question
// Move on to the next question in the list
function nextQuestion() {
    // Check if the condition is met before proceeding to avoid errors or wrong behavior.
    if (currentQuestionIndex < currentQuestions.length - 1) {
        currentQuestionIndex++;
        displayQuestion();
    }
}

// Finish the quiz and calculate score
async function finishQuiz() {
    const container = document.getElementById('quiz-container');
    
    // Collect answers and calculate score
    let totalMarks = 0;
    let marksObtained = 0;
    const answers = [];
    
    // Loop through each item so we can update or check them one by one.
    for (let i = 0; i < currentQuestions.length; i++) {
        const question = currentQuestions[i];
        let answer = null;
        let marks = 0;
        
        totalMarks += question.points;
        
        // Check if the condition is met before proceeding to avoid errors or wrong behavior.
        if (question.type === 'MultipleChoice') {
            // Retrieve answer from localStorage
            const savedAnswer = localStorage.getItem(`quiz_q${question.id}_answer`);
            // Check if the condition is met before proceeding to avoid errors or wrong behavior.
            if (savedAnswer) {
                answer = savedAnswer;
                // Check if correct answer
                const selectedChoice = question.choices.find(c => c.id === parseInt(answer));
                // Check if the condition is met before proceeding to avoid errors or wrong behavior.
                if (selectedChoice && selectedChoice.isCorrect) {
                    marks = question.points;
                }
            }
        } else {
            // Retrieve long-form answer from localStorage
            answer = localStorage.getItem(`quiz_q${question.id}_answer`);
            // Get manually assigned marks from localStorage
            const savedMarks = localStorage.getItem(`quiz_q${question.id}_marks`);
            marks = savedMarks ? parseInt(savedMarks) : 0;
        }
        
        marksObtained += marks;
        
        answers.push({
            questionId: question.id,
            answer: answer,
            marks: marks
        });
    }
    
    // Check if quiz is complete
    let unansweredCount = 0;
    // Loop through each item so we can update or check them one by one.
    for (let i = 0; i < currentQuestions.length; i++) {
        const question = currentQuestions[i];
        const savedAnswer = localStorage.getItem(`quiz_q${question.id}_answer`);
        console.log(`Question ${i} (ID: ${question.id}, Type: ${question.type}): saved answer =`, savedAnswer);
        
        // Check if the condition is met before proceeding to avoid errors or wrong behavior.
        if (!savedAnswer) {
            unansweredCount++;
        } else if (question.type === 'LongAnswer') {
            // For long-form, also check if marks have been assigned
            const savedMarks = localStorage.getItem(`quiz_q${question.id}_marks`);
            console.log(`Question ${i} marks:`, savedMarks);
            // Check if the condition is met before proceeding to avoid errors or wrong behavior.
            if (!savedMarks) {
                unansweredCount++;
            }
        }
    }
    
    console.log('Total unanswered count:', unansweredCount, 'Total questions:', currentQuestions.length);
    
    // Check if the condition is met before proceeding to avoid errors or wrong behavior.
    if (unansweredCount > 0) {
        container.innerHTML = `
            <div class="incomplete-box">
                <h3 class="incomplete-title">You have not answered all questions!</h3>
                <p class="incomplete-text">You have <strong>${unansweredCount}</strong> question(s) that need to be completed.</p>
                <p class="incomplete-text">Please answer all questions and assign marks to long-form answers before submitting.</p>
                <button onclick="resumeQuiz()" class="btn-primary mt-10">Back to Quiz</button>
            </div>
        `;
        return;
    }
    
    try {
        const submitRes = await fetch(`/api/quizzes/${currentQuiz.id}/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ answers: answers })
        });
        
        if (submitRes.ok) {
            const percentage = ((marksObtained / totalMarks) * 100).toFixed(1);
            container.innerHTML = `
                <div class="complete-box">
                    <h3 class="complete-title">✓ Quiz Completed!</h3>
                    <div class="score-box">
                        <div class="score-text">Your final score...: <strong>${marksObtained}/${totalMarks}</strong> (${percentage}%)</div>
                        <div class="progress-bg">
                            <div class="progress-bar" style="width: ${percentage}%;"></div>
                        </div>
                    </div>
                    <button onclick="startQuiz()" class="btn-primary mt-15">Take Another Quiz</button>
                </div>
            `;
        } else {
            container.innerHTML = '<p>Failed to submit quiz. Please try again.</p>';
        }
    } catch (e) {
        console.error('Failed to submit quiz:', e);
        container.innerHTML = '<p>Failed to submit quiz. Please try again.</p>';
    }
}

// Grid variables and helper functions for the Visualize tab
let grid = [];
let cellSize = 20;
let gridRows = 25;
let gridCols = 25;
let gridInitialized = false;
const MAX_EXPLANATION_ENTRIES = 140;
const VISITED_COLORS_BY_ALGORITHM = {
    dijkstra: '#87ceeb',
    astar: '#c9a4ff'
};

let activeVisualisationAlgorithm = 'dijkstra';
let lastExplanationFlushAt = 0;
let pendingExplanationMessages = [];
let explanationFlushTimer = null;
let pendingStepResolver = null;

// Check if the user turned on the live narration setting
function isLiveNarrationEnabled() {
    const toggle = document.getElementById('live-narration-toggle');
    return !toggle || toggle.checked;
}

// Check if we are running the algorithm step-by-step
function isStepModeEnabled() {
    const toggle = document.getElementById('step-mode-toggle');
    return !!(toggle && toggle.checked);
}

// Figure out how long to wait between explanation messages
function getNarrationThrottleDelay() {
    // Keep narration smoother and less noisy than frame updates.
    return Math.max(120, getAnimationDelay() * 2);
}

// Write all the queued-up explanation logs to the screen
function flushPendingExplanationMessages() {
    const { log } = getExplanationElements();
    // Check if the condition is met before proceeding to avoid errors or wrong behavior.
    if (!log || pendingExplanationMessages.length === 0 || !isLiveNarrationEnabled()) return;

    const fragment = document.createDocumentFragment();
    // Loop through each item so we can update or check them one by one.
    for (const message of pendingExplanationMessages) {
        const entry = document.createElement('p');
        entry.className = 'explanation-entry';
        entry.textContent = message;
        fragment.appendChild(entry);
    }

    log.appendChild(fragment);

    // Keep looping through as long as we still have items to process.
    while (log.children.length > MAX_EXPLANATION_ENTRIES) {
        log.removeChild(log.firstElementChild);
    }

    log.scrollTop = log.scrollHeight;
    pendingExplanationMessages = [];
    lastExplanationFlushAt = performance.now();
}

// Setup a timer to print the next batch of explanations
function scheduleExplanationFlush(force = false) {
    // Check if the condition is met before proceeding to avoid errors or wrong behavior.
    if (force) {
        // Check if the condition is met before proceeding to avoid errors or wrong behavior.
        if (explanationFlushTimer) {
            clearTimeout(explanationFlushTimer);
            explanationFlushTimer = null;
        }
        flushPendingExplanationMessages();
        return;
    }

    // Check if the condition is met before proceeding to avoid errors or wrong behavior.
    if (explanationFlushTimer) return;

    const elapsed = performance.now() - lastExplanationFlushAt;
    const wait = Math.max(0, getNarrationThrottleDelay() - elapsed);
    explanationFlushTimer = setTimeout(() => {
        explanationFlushTimer = null;
        flushPendingExplanationMessages();
    }, wait);
}

// Add a new message to the explanation log queue
function queueNarrationEvent(message, force = false) {
    // Check if the condition is met before proceeding to avoid errors or wrong behavior.
    if (!isLiveNarrationEnabled()) return;
    pendingExplanationMessages.push(message);
    scheduleExplanationFlush(force);
}

// Show or hide the step-by-step buttons on the UI
function updateStepModeControls() {
    const nextButton = document.getElementById('next-step-btn');
    if (nextButton) {
        nextButton.disabled = !(isAlgorithmRunning && isStepModeEnabled());
    }
}

// Move exactly one step forward in the algorithm
function advanceStepMode() {
    if (pendingStepResolver) {
        const resolver = pendingStepResolver;
        pendingStepResolver = null;
        resolver();
    }
}

async function waitForStepMode(stepHint = 'Step mode active. Click “Next Decision” to continue.') {
    if (!isAlgorithmRunning || !isStepModeEnabled()) return;

    setExplanationStatus(stepHint);
    updateStepModeControls();

    await new Promise(resolve => {
        pendingStepResolver = resolve;
    });

    updateStepModeControls();
}

// Figure out what color this cell should be based on which algorithm is running
function getVisitedColorForCell(cell) {
    const algorithmKey = cell.visitedBy || activeVisualisationAlgorithm;
    return VISITED_COLORS_BY_ALGORITHM[algorithmKey] || VISITED_COLORS_BY_ALGORITHM.dijkstra;
}

// Decide if we need to explain this step based on how far along we are
function shouldNarrateDecision(stepCount) {
    return stepCount <= 3 || stepCount % 5 === 0;
}

// Grab the HTML elements we need for the explanation panel
function getExplanationElements() {
    return {
        status: document.getElementById('explanation-status'),
        log: document.getElementById('explanation-log')
    };
}

// Empty out the log panel completely so we can start fresh
function clearExplanationPanel(statusText = 'Ready. Click “Run Algorithm” to start narrated steps.') {
    const { status, log } = getExplanationElements();
    if (status) status.textContent = statusText;
    pendingExplanationMessages = [];

    if (explanationFlushTimer) {
        clearTimeout(explanationFlushTimer);
        explanationFlushTimer = null;
    }
    lastExplanationFlushAt = 0;

    if (log) {
        log.innerHTML = '<p class="explanation-entry">As the algorithm runs, this panel will explain each decision it makes.</p>';
    }
}

// Create a new log entry and stick it in the panel
function addExplanationStep(message) {
    queueNarrationEvent(message, false);
}

// Update the little status text above the explanation log
function setExplanationStatus(message) {
    const { status } = getExplanationElements();
    // Check if the condition is met before proceeding to avoid errors or wrong behavior.
    if (status) status.textContent = message;
}

// Clear all the visited flags and scores from the grid so we can run again
function resetTraversalStates() {
  
    for (let r = 0; r < gridRows; r++) {

        for (let c = 0; c < gridCols; c++) {
            grid[r][c].state = 'empty';
            grid[r][c].visitedBy = null;
        }
    }
}

// Generate the baseline 2D array and HTML elements for our grid
function initGrid() {
    grid = [];
   
    for (let r = 0; r < gridRows; r++) {
        grid[r] = [];
        
        for (let c = 0; c < gridCols; c++) {
            grid[r][c] = {
                isWall: false,
                isStart: (r === 0 && c === 0),
                isGoal: (r === gridRows - 1 && c === gridCols - 1),
                state: 'empty',
                visitedBy: null
            };
        }
    }
    gridInitialized = true;
}

// Find start and goal coordinates from the grid
// Look through the grid to track exactly where the start and end nodes are right now
function getStartGoal() {
    let start = null, goal = null;
    // Loop through each item so we can update or check them one by one.
    for (let r = 0; r < gridRows; r++) {
        // Loop through each item so we can update or check them one by one.
        for (let c = 0; c < gridCols; c++) {
            // Check if the condition is met before proceeding to avoid errors or wrong behavior.
            if (grid[r][c].isStart) start = { r, c };
            // Check if the condition is met before proceeding to avoid errors or wrong behavior.
            if (grid[r][c].isGoal) goal = { r, c };
            // Check if the condition is met before proceeding to avoid errors or wrong behavior.
            if (start && goal) return { start, goal };
        }
    }
    // fallback to defaults
    return { start: { r: 0, c: 0 }, goal: { r: gridRows - 1, c: gridCols - 1 } };
}

// Breadth-first search that returns the path as an array of {r,c} or null
// Run Breadth-First Search to find a quick path, mostly used for the maze generator
function findPathBFS(startR, startC, goalR, goalC) {
    const q = [];
    const visited = Array.from({ length: gridRows }, () => Array(gridCols).fill(false));
    const parent = Array.from({ length: gridRows }, () => Array(gridCols).fill(null));

    q.push({ r: startR, c: startC });
    visited[startR][startC] = true;

    const dirs = [ [1,0], [-1,0], [0,1], [0 ,-1] ];

    // Keep looping through as long as we still have items to process.
    while (q.length > 0) {
        const cur = q.shift();
        // Check if the condition is met before proceeding to avoid errors or wrong behavior.
        if (cur.r === goalR && cur.c === goalC) {
            // reconstruct path
            const path = [];
            let node = cur;
            // Keep looping through as long as we still have items to process.
            while (node) {
                path.push({ r: node.r, c: node.c });
                node = parent[node.r][node.c];
            }
            path.reverse();
            return path;
        }

        // Loop through each item so we can update or check them one by one.
        for (const [dr, dc] of dirs) {
            const nr = cur.r + dr;
            const nc = cur.c + dc;
            // Check if the condition is met before proceeding to avoid errors or wrong behavior.
            if (nr < 0 || nr >= gridRows || nc < 0 || nc >= gridCols) continue;
            // Check if the condition is met before proceeding to avoid errors or wrong behavior.
            if (visited[nr][nc]) continue;
            // Check if the condition is met before proceeding to avoid errors or wrong behavior.
            if (grid[nr][nc].isWall) continue;
            visited[nr][nc] = true;
            parent[nr][nc] = cur;
            q.push({ r: nr, c: nc });
        }
    }

    return null;
}

// Generate a random path from start to goal using random walk
// Do a random walk across the board to build a goofy path
function generateRandomPath(startR, startC, goalR, goalC) {
    const path = new Set();
    let r = startR;
    let c = startC;
    path.add(`${r},${c}`);
    
    const dirs = [[1,0], [-1,0], [0,1], [0,-1]];
    
    // Random walk towards goal with some randomness
    // Keep looping through as long as we still have items to process.
    while (r !== goalR || c !== goalC) {
        // Get neighbors (prioritize towards goal, but with randomness)
        const neighbors = [];
        
        // Loop through each item so we can update or check them one by one.
        for (const [dr, dc] of dirs) {
            const nr = r + dr;
            const nc = c + dc;
            // Check if the condition is met before proceeding to avoid errors or wrong behavior.
            if (nr >= 0 && nr < gridRows && nc >= 0 && nc < gridCols) {
                neighbors.push({ r: nr, c: nc, dr, dc });
            }
        }
        
        // Sort by distance to goal (Manhattan distance)
        neighbors.sort((a, b) => {
            const distA = Math.abs(a.r - goalR) + Math.abs(a.c - goalC);
            const distB = Math.abs(b.r - goalR) + Math.abs(b.c - goalC);
            return distA - distB;
        });
        
        //  50/50 to move to goal/ move randomly
        let nextCell;
        // Check if the condition is met before proceeding to avoid errors or wrong behavior.
        if (Math.random() < 0.3 && neighbors.length > 0) {
            nextCell = neighbors[0];
        } else if (neighbors.length > 0) {
            nextCell = neighbors[Math.floor(Math.random() * neighbors.length)];
        } else {
            break;
        }
        
        r = nextCell.r;
        c = nextCell.c;
        path.add(`${r},${c}`);
    }
    
    return path;
}

// Scatter walls randomly but make sure there's always at least one valid path
function RandomizeGrid(density = 0.3, maxAttempts = 12) {

    // Check if the condition is met before proceeding to avoid errors or wrong behavior.
    if (!grid || grid.length === 0) initGrid(); // makes sure grid is initialized

    const { start, goal } = getStartGoal();
    
    const pathCells = generateRandomPath(start.r, start.c, goal.r, goal.c); 
    // this generates the random path

    // Try random generation with the guaranteed path
    // Loop through each item so we can update or check them one by one.
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        // randomize (respecting guaranteed path)
        // Loop through each item so we can update or check them one by one.
        for (let r = 0; r < gridRows; r++) {
            // Loop through each item so we can update or check them one by one.
            for (let c = 0; c < gridCols; c++) {
                // Check if the condition is met before proceeding to avoid errors or wrong behavior.
                if (!grid[r][c].isStart && !grid[r][c].isGoal && !pathCells.has(`${r},${c}`)) {
                    grid[r][c].isWall = Math.random() < density;
                } else {
                    grid[r][c].isWall = false;
                }
            }
        }

        // makes sure that there is a valid path
        const path = findPathBFS(start.r, start.c, goal.r, goal.c);
        // Check if the condition is met before proceeding to avoid errors or wrong behavior.
        if (path) {
            drawGrid();
            return; // success
        }
    }

    // generate random walls around path if we failed to create a valid maze after max attempts
    //initGrid(); 
    //for (let r = 0; r < gridRows; r++) {
        //for (let c = 0; c < gridCols; c++) {
            //if (pathCells.has(`${r},${c}`) || grid[r][c].isStart || grid[r][c].isGoal) {
                //grid[r][c].isWall = false;
           // } else if (Math.random() < density) {
           //     grid[r][c].isWall = true;
           // }
       // }
    //}

    drawGrid();
}
//------------------------------------------------------------------------------------
// Draw or redraw the entire grid to update visuals on the screen
function drawGrid() {
    const canvas = document.getElementById('grid-canvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Loop through each item so we can update or check them one by one.
    for (let r = 0; r < gridRows; r++) {
        // Loop through each item so we can update or check them one by one.
        for (let c = 0; c < gridCols; c++) {
            const x = c * cellSize;
            const y = r * cellSize;
            
            // colour the grid based on its state
            // Check if the condition is met before proceeding to avoid errors or wrong behavior.
            if (grid[r][c].isWall) {
                ctx.fillStyle = '#333';
                ctx.fillRect(x, y, cellSize - 1, cellSize - 1);
            } else if (grid[r][c].state === 'visiting') {
                ctx.fillStyle = '#ff6b6b';
                ctx.fillRect(x, y, cellSize - 1, cellSize - 1);
            } else if (grid[r][c].state === 'visited') {
                ctx.fillStyle = getVisitedColorForCell(grid[r][c]);
                ctx.fillRect(x, y, cellSize - 1, cellSize - 1);
            } else if (grid[r][c].state === 'path') {
                ctx.fillStyle = '#ffd700';
                ctx.fillRect(x, y, cellSize - 1, cellSize - 1);
            } else if (grid[r][c].isStart) {
                ctx.fillStyle = '#0f0';
                ctx.fillRect(x, y, cellSize - 1, cellSize - 1);
            } else if (grid[r][c].isGoal) {
                ctx.fillStyle = '#f00';
                ctx.fillRect(x, y, cellSize - 1, cellSize - 1);
            }
            
            ctx.strokeStyle = '#eee';
            ctx.strokeRect(x, y, cellSize, cellSize);
        }
    }
}
//------------------------------------------------------------------------------------

// Wipe away everything except walls, start, and goal (clean slate)
function clearGrid() {
    initGrid();
    clearExplanationPanel('Grid reset. Ready for a new narrated run.');
    drawGrid();
}

function setVisualisationControlsEnabled(enabled) {
    const ids = ['run-btn', 'clear-btn', 'random-btn', 'algorithm-select', 'algorithm'];
    ids.forEach(id => {
        const element = document.getElementById(id);
        if (!element) return;
        element.disabled = !enabled;
        if (enabled) {
            element.removeAttribute('disabled');
        }
    });
}

function disableVisualisationControls() {
    setVisualisationControlsEnabled(false);
}

function enableVisualisationControls() {
    setVisualisationControlsEnabled(true);
}

async function runAlgorithm() {
    console.log('runAlgorithm called');
    
    // Prevent running if already executing
    // Check if the condition is met before proceeding to avoid errors or wrong behavior.
    if (isAlgorithmRunning) {
        console.log('Algorithm already running');
        return;
    }
    
    isAlgorithmRunning = true;
    
    // disable the clear run and obstacles while the algorithm is running
    disableVisualisationControls();
    
    const algorithmSelect = document.getElementById('algorithm-select') || document.getElementById('algorithm');
    const algorithm = algorithmSelect ? algorithmSelect.value : 'dijkstra';
    activeVisualisationAlgorithm = algorithm;
    console.log('Algorithm selected:', algorithm);

    resetTraversalStates();
    clearExplanationPanel(`Running ${algorithm === 'astar' ? 'A*' : 'Dijkstra'}: watch each decision below.`);
    updateStepModeControls();
    
    const { start, goal } = getStartGoal();
    console.log('Start:', start, 'Goal:', goal);
    queueNarrationEvent(`Start at (${start.c}, ${start.r}). Goal is (${goal.c}, ${goal.r}).`, true);
    // Check if the condition is met before proceeding to avoid errors or wrong behavior.
    if (algorithm === 'astar') {
        addExplanationStep('A* uses f(n) = g(n) + h(n), balancing distance traveled and estimated distance to the goal.');
    } else {
        addExplanationStep('Dijkstra expands the cell with the smallest known path cost, without a goal-directed heuristic.');
    }
    
    // Get grid dimensions
    const width = gridCols;
    const height = gridRows;
    
    // convert the grid to a 2d arrays for the algorithm to be able to run
    const gridArray = [];
    // Loop through each item so we can update or check them one by one.
    for (let y = 0; y < height; y++) {
        gridArray[y] = [];
        // Loop through each item so we can update or check them one by one.
        for (let x = 0; x < width; x++) {
            gridArray[y][x] = grid[y][x].isWall ? 1 : 0;
        }
    }
    
    console.log('Running algorithm...');
    
    try {
        // Check if the condition is met before proceeding to avoid errors or wrong behavior.
        if (algorithm === 'astar') {
            await runAStarVisualization(start.c, start.r, goal.c, goal.r, gridArray, width, height);
        } else {
            await runDijkstraVisualization(start.c, start.r, goal.c, goal.r, gridArray, width, height);
        }
    } finally {
        // Check if the condition is met before proceeding to avoid errors or wrong behavior.
        if (pendingStepResolver) {
            const resolver = pendingStepResolver;
            pendingStepResolver = null;
            resolver();
        }
        scheduleExplanationFlush(true);
        // when the algorithm end, enable the buttons again
        isAlgorithmRunning = false;
        console.log('Finally in runAlgorithm: enabling buttons');
        
        enableVisualisationControls();
        console.log('Visualisation controls re-enabled');
        updateStepModeControls();
    }
}

// A* Visualization
async function runAStarVisualization(startX, startY, endX, endY, gridArray, width, height) {
    const openSet = [];
    const closedSet = new Set();
    const cameFrom = new Map();
    const gScore = new Map();
    const fScore = new Map();
    
    const startKey = `${startX},${startY}`;
    const endKey = `${endX},${endY}`;
    
    openSet.push({ x: startX, y: startY, f: heuristicAStar(startX, startY, endX, endY) });
    gScore.set(startKey, 0);
    fScore.set(startKey, heuristicAStar(startX, startY, endX, endY));
    
    let visitedCount = 0;
    let found = false;
    const startTime = performance.now();
    
    // Keep looping through as long as we still have items to process.
    while (openSet.length > 0) {
        await waitForStepMode('Step mode active. Click “Next Decision” to continue with A*.');

        openSet.sort((a, b) => a.f - b.f);
        const current = openSet.shift();
        const currentKey = `${current.x},${current.y}`;

        // Check if the condition is met before proceeding to avoid errors or wrong behavior.
        if (shouldNarrateDecision(visitedCount + 1)) {
            addExplanationStep(`A*: considering (${current.x}, ${current.y}) with current f-score ${current.f.toFixed(1)}.`);
        }
        
        // Check if reached end
        // Check if the condition is met before proceeding to avoid errors or wrong behavior.
        if (current.x === endX && current.y === endY) {
            found = true;
            break;
        }
        
        closedSet.add(currentKey);
        
        // Visualize visiting
        // Check if the condition is met before proceeding to avoid errors or wrong behavior.
        if (!(current.x === startX && current.y === startY) && 
            !(current.x === endX && current.y === endY)) {
            // Check if the condition is met before proceeding to avoid errors or wrong behavior.
            if (grid[current.y] && grid[current.y][current.x] !== undefined) {
                grid[current.y][current.x].state = 'visiting';
            }
            drawGrid();
            await sleep(getAnimationDelay());
        }
        visitedCount++;
        
        // Get neighbo
        const neighbours = getNeighborsAStar(current.x, current.y, width, height, gridArray);
        // Check if the condition is met before proceeding to avoid errors or wrong behavior.
        if (shouldNarrateDecision(visitedCount)) {
            addExplanationStep(`A*: evaluating ${neighbours.length} neighbour${neighbours.length === 1 ? '' : 's'} from (${current.x}, ${current.y}).`);
        }
        
        // Loop through each item so we can update or check them one by one.
        for (const neighbour of neighbours) {
            const neighbourKey = `${neighbour.x},${neighbour.y}`;
            
            // Check if the condition is met before proceeding to avoid errors or wrong behavior.
            if (closedSet.has(neighbourKey)) continue;
            
            const tentativeG = gScore.get(currentKey) + distanceAStar(current, neighbour);
            
            // Check if the condition is met before proceeding to avoid errors or wrong behavior.
            if (!gScore.has(neighbourKey) || tentativeG < gScore.get(neighbourKey)) {
                cameFrom.set(neighbourKey, currentKey);
                gScore.set(neighbourKey, tentativeG);
                fScore.set(neighbourKey, tentativeG + heuristicAStar(neighbour.x, neighbour.y, endX, endY));
                
                const inOpen = openSet.find(n => n.x === neighbour.x && n.y === neighbour.y);
                // Check if the condition is met before proceeding to avoid errors or wrong behavior.
                if (!inOpen) {
                    openSet.push({ x: neighbour.x, y: neighbour.y, f: fScore.get(neighbourKey) });
                }
            }
        }
        
        // Mark as visited
        // Check if the condition is met before proceeding to avoid errors or wrong behavior.
        if (!(current.x === startX && current.y === startY) && 
            !(current.x === endX && current.y === endY)) {
            // Check if the condition is met before proceeding to avoid errors or wrong behavior.
            if (grid[current.y] && grid[current.y][current.x] !== undefined) {
                grid[current.y][current.x].state = 'visited';
                grid[current.y][current.x].visitedBy = 'astar';
            }
            drawGrid();
            await sleep(getAnimationDelay());
        }
    }
    
    const endTime = performance.now();
    
    // Enable buttons after search
    isAlgorithmRunning = false;
    enableVisualisationControls();
    console.log('Visualisation controls re-enabled after A* search');
    updateStepModeControls();
    
    // Check if the condition is met before proceeding to avoid errors or wrong behavior.
    if (found) {
        setExplanationStatus('Goal reached. Now tracing back through the best choices to draw the final path.');
        queueNarrationEvent('Goal reached. Now tracing back through the best choices to draw the final path.', true);
        await reconstructPathAStar(cameFrom, endKey, startX, startY, endX, endY);
        queueNarrationEvent(`A* complete: visited ${visitedCount} cells before reconstructing the shortest route.`, true);
        displayStats(true, visitedCount, endTime - startTime);
    } else {
        setExplanationStatus('No path found. The search exhausted all reachable cells.');
        queueNarrationEvent('A* could not reach the goal because all possible routes were blocked.', true);
        displayStats(false, visitedCount, endTime - startTime);
    }
    console.log('runAStarVisualization finished');
}

// Dijkstra Visualization
async function runDijkstraVisualization(startX, startY, endX, endY, gridArray, width, height) {
    const distances = new Map();
    const previous = new Map();
    const visited = new Set();
    const unvisited = new Set();
    
    const startKey = `${startX},${startY}`;
    const endKey = `${endX},${endY}`;
    
    // Loop through each item so we can update or check them one by one.
    for (let y = 0; y < height; y++) {
        // Loop through each item so we can update or check them one by one.
        for (let x = 0; x < width; x++) {
            // Check if the condition is met before proceeding to avoid errors or wrong behavior.
            if (gridArray[y][x] !== 1) {
                const key = `${x},${y}`;
                distances.set(key, Infinity);
                unvisited.add(key);
            }
        }
    }
    
    distances.set(startKey, 0);
    
    let visitedCount = 0;
    let found = false;
    const startTime = performance.now();
    
    // Keep looping through as long as we still have items to process.
    while (unvisited.size > 0) {
        await waitForStepMode('Step mode active. Click “Next Decision” to continue with Dijkstra.');

        let minNode = null;
        let minDist = Infinity;
        
        // Loop through each item so we can update or check them one by one.
        for (const key of unvisited) {
            // Check if the condition is met before proceeding to avoid errors or wrong behavior.
            if (distances.get(key) < minDist) {
                minDist = distances.get(key);
                minNode = key;
            }
        }
        
        // Check if the condition is met before proceeding to avoid errors or wrong behavior.
        if (minNode === null || minNode === endKey) {
            // Check if the condition is met before proceeding to avoid errors or wrong behavior.
            if (minNode === endKey) found = true;
            break;
        }
        
        unvisited.delete(minNode);
        visited.add(minNode);
        
        const [currX, currY] = minNode.split(',').map(Number);
        // Check if the condition is met before proceeding to avoid errors or wrong behavior.
        if (shouldNarrateDecision(visitedCount + 1)) {
            addExplanationStep(`Dijkstra: selecting (${currX}, ${currY}) with best known distance ${minDist.toFixed(1)}.`);
        }
        
        // Visualize visiting
        // Check if the condition is met before proceeding to avoid errors or wrong behavior.
        if (!(currX === startX && currY === startY) && 
            !(currX === endX && currY === endY)) {
            // Check if the condition is met before proceeding to avoid errors or wrong behavior.
            if (grid[currY] && grid[currY][currX] !== undefined) {
                grid[currY][currX].state = 'visiting';
            }
            drawGrid();
            await sleep(getAnimationDelay());
        }
        visitedCount++;
        
        const neighbors = getNeighborsAStar(currX, currY, width, height, gridArray);
        // Check if the condition is met before proceeding to avoid errors or wrong behavior.
        if (shouldNarrateDecision(visitedCount)) {
            addExplanationStep(`Dijkstra: checking ${neighbors.length} neighbour${neighbors.length === 1 ? '' : 's'} from (${currX}, ${currY}).`);
        }
        
        // Loop through each item so we can update or check them one by one.
        for (const neighbor of neighbors) {
            const neighborKey = `${neighbor.x},${neighbor.y}`;
            
            // Check if the condition is met before proceeding to avoid errors or wrong behavior.
            if (!unvisited.has(neighborKey)) continue;
            
            const alt = distances.get(minNode) + distanceAStar({x: currX, y: currY}, neighbor);
            
            // Check if the condition is met before proceeding to avoid errors or wrong behavior.
            if (alt < distances.get(neighborKey)) {
                distances.set(neighborKey, alt);
                previous.set(neighborKey, minNode);
            }
        }
        
        // Mark as visited
        // Check if the condition is met before proceeding to avoid errors or wrong behavior.
        if (!(currX === startX && currY === startY) && 
            !(currX === endX && currY === endY)) {
            // Check if the condition is met before proceeding to avoid errors or wrong behavior.
            if (grid[currY] && grid[currY][currX] !== undefined) {
                grid[currY][currX].state = 'visited';
                grid[currY][currX].visitedBy = 'dijkstra';
            }
            drawGrid();
            await sleep(getAnimationDelay());
        }
    }
    
    const endTime = performance.now();
    
    // Enable buttons after search
    isAlgorithmRunning = false;
    enableVisualisationControls();
    console.log('Visualisation controls re-enabled after Dijkstra search');
    updateStepModeControls();
    
    // Check if the condition is met before proceeding to avoid errors or wrong behavior.
    if (found) {
        setExplanationStatus('Goal reached. Now tracing back through the best choices to draw the final path.');
        queueNarrationEvent('Goal reached. Now tracing back through the best choices to draw the final path.', true);
        await reconstructPathAStar(previous, endKey, startX, startY, endX, endY);
        queueNarrationEvent(`Dijkstra complete: visited ${visitedCount} cells before reconstructing the shortest route.`, true);
        displayStats(true, visitedCount, endTime - startTime);
    } else {
        setExplanationStatus('No path found. The search exhausted all reachable cells.');
        queueNarrationEvent('Dijkstra could not reach the goal because all possible routes were blocked.', true);
        displayStats(false, visitedCount, endTime - startTime);
    }
    console.log('runDijkstraVisualization finished');
}

// Figure out the Manhattan distance to guess how far we are from the goal
function heuristicAStar(x1, y1, x2, y2) {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

// Check if moving to this neighboring cell costs more (like diagonal vs straight)
function distanceAStar(a, b) {
    return 1;
}

// Find all the valid adjacent cells we can move to next
function getNeighborsAStar(x, y, width, height, gridArray) {
    const neighbors = [];
    const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    
    // Loop through each item so we can update or check them one by one.
    for (const [dx, dy] of directions) {
        const nx = x + dx;
        const ny = y + dy;
        
        // Check if the condition is met before proceeding to avoid errors or wrong behavior.
        if (nx >= 0 && nx < width && ny >= 0 && ny < height && 
            gridArray[ny][nx] !== 1) {
            neighbors.push({ x: nx, y: ny });
        }
    }
    
    return neighbors;
}

async function reconstructPathAStar(previous, endKey, startX, startY, endX, endY) {
    const path = [];
    let current = endKey;
    
    // Keep looping through as long as we still have items to process.
    while (current) {
        const [x, y] = current.split(',').map(Number);
        path.unshift({ x, y });
        current = previous.get(current);
    }

    queueNarrationEvent(`Tracing back produced ${Math.max(path.length - 1, 0)} step${path.length - 1 === 1 ? '' : 's'} from start to goal.`, true);
    
    // Visualize path
    // Loop through each item so we can update or check them one by one.
    for (let i = 1; i < path.length - 1; i++) {
        await waitForStepMode('Step mode active. Click “Next Decision” to continue tracing the final path.');

        // Check if the condition is met before proceeding to avoid errors or wrong behavior.
        if (grid[path[i].y] && grid[path[i].y][path[i].x] !== undefined) {
            grid[path[i].y][path[i].x].state = 'path';
        }

        // Check if the condition is met before proceeding to avoid errors or wrong behavior.
        if (i === 1 || i === path.length - 2 || i % 6 === 0) {
            addExplanationStep(`Path step ${i}: marking (${path[i].x}, ${path[i].y}) as part of the final route.`);
        }

        drawGrid();
        await sleep(getAnimationDelay());
    }

    setExplanationStatus('Run complete. Compare how this algorithm explored the grid before finding the path.');
    scheduleExplanationFlush(true);
    console.log('reconstructPathAStar finished');
}

// Show the final time and visited node count on the UI
function displayStats(found, visitedCount, executionTime) {
    const statsDiv = document.getElementById('stats');
    
    if (statsDiv) {
        statsDiv.innerHTML = `
            <p class="msg-box" style="background: ${found ? '#d4edda' : '#f8d7da'};">
                Path ${found ? 'Found' : 'Not Found'}<br>
                Cells Visited: ${visitedCount}<br>
                Execution Time: ${executionTime.toFixed(1)}ms
            </p>
        `;
    }
}


// Force the code to wait for a bit to create the animation effect
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Just trigger the randomizer function and lock it in
function randomWalls() {
    
    if (!grid || grid.length === 0) initGrid();
    const slider = document.getElementById('density-slider');
    const density = slider ? parseFloat(slider.value) : 0.3;
    RandomizeGrid(density);
}



// Canvas click handler
document.addEventListener('DOMContentLoaded', function () {
    const liveNarrationToggle = document.getElementById('live-narration-toggle');
    const stepModeToggle = document.getElementById('step-mode-toggle');
    const nextStepButton = document.getElementById('next-step-btn');
    const questionCountInput = document.getElementById('question-count');

    
    if (liveNarrationToggle) {
        liveNarrationToggle.addEventListener('change', function () {
           
            if (!this.checked) {
                pendingExplanationMessages = [];
            } else {
                queueNarrationEvent('Narration enabled. Important decisions will appear here in real time.', true);
            }
        });
    }

    
    if (stepModeToggle) {
        stepModeToggle.addEventListener('change', function () {
            
            if (!this.checked) {
                advanceStepMode();
                setExplanationStatus('Step mode off. The run continues automatically.');
            } else if (isAlgorithmRunning) {
                setExplanationStatus('Step mode on. Click “Next Decision” to continue.');
            }
            updateStepModeControls();
        });
    }

    
    if (nextStepButton) {
        nextStepButton.addEventListener('click', function () {
            advanceStepMode();
        });
    }

    
    if (questionCountInput) {
        questionCountInput.addEventListener('input', function () {
            
            if (this.value.trim() && parseInt(this.value, 10) > 0) {
            }
        });
    }

    updateStepModeControls();

    const canvas = document.getElementById('grid-canvas');
    
    if (!canvas) return;
    const rectFromCanvas = () => canvas.getBoundingClientRect();

    // Update density percentage display when slider changes
    const densitySlider = document.getElementById('density-slider');
    const densityValue = document.getElementById('density-value');
    
    if (densitySlider && densityValue) {
        densitySlider.addEventListener('input', function() {
            const percent = Math.round(parseFloat(this.value) * 100);
            densityValue.textContent = percent + '%';
        });
    }

    // Function getCellFromEvent logic to keep the code organized
    function getCellFromEvent(e) {

        const rect = rectFromCanvas();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const col = Math.floor(x / cellSize);
        const row = Math.floor(y / cellSize);
        return { row, col };
    }

    // Mouse down: decide mode (left = draw, right = erase)
    canvas.addEventListener('mousedown', function (e) {
        // Check if the condition is met before proceeding to avoid errors or wrong behavior.
        if (currentTab !== 'visual') return;
        
        // Prevent interaction while algorithm is running
        // Check if the condition is met before proceeding to avoid errors or wrong behavior.
        if (isAlgorithmRunning) return;

        e.preventDefault(); // no right click menu
        isMouseDown = true;

        const { row, col } = getCellFromEvent(e);

        // Check if the condition is met before proceeding to avoid errors or wrong behavior.
        if (e.button === 0 && grid[row] && grid[row][col] && grid[row][col].isStart) {
            drawMode = 'move-start';
            moveSpecialNode('start', row, col);
        } else if (e.button === 0 && grid[row] && grid[row][col] && grid[row][col].isGoal) {
            drawMode = 'move-goal';
            moveSpecialNode('goal', row, col);
        } else if (e.button === 0) {
            drawMode = "wall";     // left click → draw walls
            setWallAt(row, col, true);
        } else if (e.button === 2) {
            drawMode = "erase";    // right click → erase walls
            setWallAt(row, col, false);
        } else {
            drawMode = null;
        }

        lastMouseRow = row;
        lastMouseCol = col;
        drawGrid();
    });

    // Mouse move: while mouse is down, keep drawing/erasing
    canvas.addEventListener('mousemove', function (e) {
        // Prevent interaction while algorithm is running
        // Check if the condition is met before proceeding to avoid errors or wrong behavior.
        if (isAlgorithmRunning) return;
        
        // Check if the condition is met before proceeding to avoid errors or wrong behavior.
        if (!isMouseDown || currentTab !== 'visual' || !drawMode) return;

        const { row, col } = getCellFromEvent(e);

        // Check if the condition is met before proceeding to avoid errors or wrong behavior.
        if (drawMode === 'move-start') {
            moveSpecialNode('start', row, col);
            drawGrid();
            return;
        }

        // Check if the condition is met before proceeding to avoid errors or wrong behavior.
        if (drawMode === 'move-goal') {
            moveSpecialNode('goal', row, col);
            drawGrid();
            return;
        }
        
        // Draw a line from last position to current position to avoid gaps with fast movement
        // Check if the condition is met before proceeding to avoid errors or wrong behavior.
        if (lastMouseRow !== null && lastMouseCol !== null) {
            drawLineTo(lastMouseRow, lastMouseCol, row, col, drawMode === "wall");
        } else {
            setWallAt(row, col, drawMode === "wall");
        }
        
        lastMouseRow = row;
        lastMouseCol = col;
        drawGrid();
    });

    // Mouse up: stop drawing
    canvas.addEventListener('mouseup', function () {
        isMouseDown = false;
        drawMode = null;
        lastMouseRow = null;
        lastMouseCol = null;
    });

    canvas.addEventListener('mouseleave', function () {
        isMouseDown = false;
        drawMode = null;
        lastMouseRow = null;
        lastMouseCol = null;
    });

    // disable default right‑click menu on the grid.
    canvas.addEventListener('contextmenu', function (e) {
        e.preventDefault();
    });
});

// Speed slider functionality
const speedSlider = document.getElementById('speed-slider');
const speedValue = document.getElementById('speed-value');

// Check if the condition is met before proceeding to avoid errors or wrong behavior.
if (speedSlider && speedValue) {
    speedSlider.addEventListener('input', function() {
        const value = parseInt(this.value);
        let label = 'Normal';
        // Check if the condition is met before proceeding to avoid errors or wrong behavior.
        if (value < 20) label = 'Very Slow';
        else if (value < 40) label = 'Slow';
        else if (value < 60) label = 'Normal';
        else if (value < 80) label = 'Fast';
        else label = 'Very Fast';
        speedValue.textContent = label;
    });
}

// Calculate delay based on speed slider (returns ms delay)
// Grab the current speed from the slider to figure out our loop delay
function getAnimationDelay() {
    const speedSlider = document.getElementById('speed-slider');
    // Check if the condition is met before proceeding to avoid errors or wrong behavior.
    if (!speedSlider) return 50; // default
    
    const value = parseInt(speedSlider.value);
    // Map 1-100 to delay: 1 = 100ms, 100 = 1ms
    const delay = Math.max(1, Math.round(101 - value));
    return delay;
}

// Page load
window.addEventListener('load', function() {
    console.log("Page fully loaded");
    showTab('content');
    clearExplanationPanel();
});