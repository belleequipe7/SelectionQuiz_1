class AudioManager {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }

    playTone(frequency, type, duration, startTime = 0) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(frequency, this.ctx.currentTime + startTime);
        gain.gain.setValueAtTime(0.3, this.ctx.currentTime + startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + startTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(this.ctx.currentTime + startTime);
        osc.stop(this.ctx.currentTime + startTime + duration);
    }

    playCorrect() {
        this.playTone(1318.51, 'sine', 0.2, 0); // High Mi (E6)
        this.playTone(523.25, 'sine', 0.4, 0.2); // Low Do (C5)
    }

    playIncorrect() {
        this.playTone(150, 'sawtooth', 0.8, 0);
    }

    // ... (existing methods)

    endGame() {
        this.endTime = Date.now();
        const duration = (this.endTime - this.startTime) / 1000; // seconds

        const isRankIn = this.saveScore(this.nickname, this.score, duration);
        let rankMsg = "";
        if (!isRankIn) {
            rankMsg = "<br><span style='font-size: 0.8em; color: gray;'>ランキング外です</span>";
        }

        this.resultPopup.classList.remove('hidden');
        if (this.score === this.currentQuestions.length) {
            this.resultTitle.textContent = "全問正解！";
            this.resultMessage.innerHTML = `おめでとうございます！アニメマスターです！<br>タイム: ${duration.toFixed(1)}秒${rankMsg}`;
            this.audio.playLevelUp();
        } else {
            this.resultTitle.textContent = "ゲーム終了";
            this.resultMessage.innerHTML = `あなたのスコアは ${this.score} / ${this.currentQuestions.length} です<br>タイム: ${duration.toFixed(1)}秒${rankMsg}`;
        }

        // Render ranking in the popup
        this.renderRanking();
    }

    // ... (saveScore, escapeHtml)

    returnToStart() {
        this.resultPopup.classList.add('hidden');
        this.quizScreen.classList.remove('active');
        this.startScreen.classList.add('active');
        // No need to render ranking on start screen anymore
    }

    playLevelUp() {
        const now = this.ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50, 783.99, 1046.50];
        const times = [0, 0.15, 0.3, 0.45, 0.6, 0.75];
        const durations = [0.15, 0.15, 0.15, 0.15, 0.15, 0.8];

        times.forEach((t, i) => {
            this.playTone(notes[i], 'square', durations[i], t);
        });
    }
}

class QuizGame {
    constructor() {
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.currentQuestions = []; // subset of 10
        this.audio = new AudioManager();
        this.rankingManager = new RankingManager();

        this.startTime = 0;
        this.endTime = 0;
        this.nickname = "";

        // Play Count & Stars
        this.playCount = parseInt(localStorage.getItem('playCount')) || 0;
        this.starCount = parseInt(localStorage.getItem('starCount')) || 0;

        // DOM Elements
        this.startScreen = document.getElementById('start-screen');
        this.quizScreen = document.getElementById('quiz-screen');
        this.resultPopup = document.getElementById('result-popup');
        this.questionImageContainer = document.getElementById('question-image-container');
        this.questionImage = document.getElementById('question-image');
        this.questionNumber = document.getElementById('question-number');
        this.questionText = document.getElementById('question-text');
        this.optionButtons = document.querySelectorAll('.option-btn');
        this.resultTitle = document.getElementById('result-title');
        this.resultMessage = document.getElementById('result-message');
        this.nicknameInput = document.getElementById('nickname-input');
        this.rankingList = document.getElementById('ranking-list');
        this.gameTitle = document.getElementById('game-title');
        this.titleStars = document.getElementById('title-stars');

        // Info Popup Elements
        this.infoPopup = document.getElementById('info-popup');
        this.infoPlayCount = document.getElementById('info-play-count');
        this.closeInfoBtn = document.getElementById('close-info-btn');

        // Removed export/import logic

        this.bindEvents();
        this.renderStars();
        this.renderRanking();
    }

    bindEvents() {
        document.getElementById('start-btn').addEventListener('click', () => this.startGame());
        document.getElementById('restart-btn').addEventListener('click', () => {
            this.resultPopup.classList.add('hidden');
            this.startGame();
        });
        document.getElementById('exit-btn-start').addEventListener('click', () => this.exitGame());
        document.getElementById('exit-btn-start').addEventListener('click', () => this.exitGame());
        document.getElementById('exit-btn-popup').addEventListener('click', () => this.returnToStart());
        this.closeInfoBtn.addEventListener('click', () => {
            this.infoPopup.classList.add('hidden');
        });

        this.optionButtons.forEach(btn => {
            btn.addEventListener('click', (e) => this.checkAnswer(e.target));
        });

        // Title Click Event
        this.gameTitle.addEventListener('click', () => this.showPlayCount());
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    startGame() {
        if (this.audio.ctx.state === 'suspended') {
            this.audio.ctx.resume();
        }

        // Increment Play Count
        this.playCount++;
        if (this.playCount > 1000000) {
            this.playCount = 0;
            this.starCount++;
            localStorage.setItem('starCount', this.starCount);
            this.renderStars();
        }
        localStorage.setItem('playCount', this.playCount);


        // Capture Nickname
        this.nickname = this.nicknameInput.value.trim();
        if (!this.nickname) {
            this.nickname = "名無し";
        }

        // Start Timer
        this.startTime = Date.now();

        // Separate Meiho questions from others
        const meihoQuestions = allQuestions.filter(q => q.category === 'meiho');
        const otherQuestions = allQuestions.filter(q => q.category !== 'meiho');

        // Select 9 random questions from others
        const shuffledOthers = this.shuffleArray([...otherQuestions]);
        const selectedOthers = shuffledOthers.slice(0, 9);

        // Select 1 random question from Meiho
        const shuffledMeiho = this.shuffleArray([...meihoQuestions]);
        const selectedMeiho = shuffledMeiho[0];

        // Combine: 9 others + 1 Meiho at the end
        this.currentQuestions = [...selectedOthers, selectedMeiho];

        this.currentQuestionIndex = 0;
        this.score = 0;
        this.startScreen.classList.remove('active');
        this.quizScreen.classList.add('active');
        this.loadQuestion();
    }

    loadQuestion() {
        const data = this.currentQuestions[this.currentQuestionIndex];
        this.questionNumber.textContent = `第${this.currentQuestionIndex + 1}問`;

        // Handle Image
        this.questionImageContainer.innerHTML = ''; // Clear previous
        const img = document.createElement('img');
        img.id = 'question-image';

        let imageSrc = null;
        if (data.theme) {
            imageSrc = `assets/quiz_${data.theme}.png`;
        }

        if (imageSrc) {
            img.src = imageSrc;
            img.onerror = () => {
                this.showPlaceholder();
            };
            img.onload = () => {
                this.questionImageContainer.appendChild(img);
            }
            // Append immediately, onerror will swap if needed
            this.questionImageContainer.appendChild(img);
        } else {
            this.showPlaceholder();
        }

        this.questionText.textContent = data.q;

        // Prepare Options (Shuffle)
        // correct answer is always at index 0 in data.o
        const correctAnswerText = data.o[0];
        const options = [...data.o];
        this.shuffleArray(options);

        this.optionButtons.forEach((btn, idx) => {
            btn.textContent = options[idx];
            btn.dataset.isCorrect = (options[idx] === correctAnswerText);
            btn.disabled = false;
            btn.style.backgroundColor = '';
            btn.style.color = '';
        });
    }

    showPlaceholder() {
        this.questionImageContainer.innerHTML = `
            <div class="placeholder-container">
                <div class="placeholder-bg"></div>
                <div class="placeholder-icon">?</div>
            </div>
        `;
    }

    checkAnswer(selectedBtn) {
        const isCorrect = selectedBtn.dataset.isCorrect === 'true';
        selectedBtn.blur(); // Remove focus to prevent sticky hover on mobile

        this.optionButtons.forEach(btn => btn.disabled = true);

        if (isCorrect) {
            this.score++;
            this.audio.playCorrect();
            selectedBtn.style.backgroundColor = '#4ECDC4';
            selectedBtn.style.color = '#fff';
        } else {
            this.audio.playIncorrect();
            selectedBtn.style.backgroundColor = '#FF6B6B';
            selectedBtn.style.color = '#fff';

            // Show correct answer
            this.optionButtons.forEach(btn => {
                if (btn.dataset.isCorrect === 'true') {
                    btn.style.backgroundColor = '#4ECDC4';
                    btn.style.color = '#fff';
                }
            });
        }

        setTimeout(() => {
            this.nextQuestion();
        }, 1500);
    }

    nextQuestion() {
        this.currentQuestionIndex++;
        if (this.currentQuestionIndex < this.currentQuestions.length) {
            this.loadQuestion();
        } else {
            this.endGame();
        }
    }

    async endGame() {
        this.endTime = Date.now();
        const duration = (this.endTime - this.startTime) / 1000; // seconds

        const rankIndex = await this.saveScore(this.nickname, this.score, duration);
        let rankMsg = "";

        // rankIndex is 0-based index if in top 10, or -1 if outside
        if (rankIndex === -1) {
            rankMsg = "<br><span style='font-size: 0.8em; color: gray;'>ランキング外です</span>";
        }

        this.resultPopup.classList.remove('hidden');
        if (this.score === this.currentQuestions.length) {
            this.resultTitle.textContent = "全問正解！";
            this.resultMessage.innerHTML = `おめでとうございます！アニメマスターです！<br>タイム: ${duration.toFixed(1)}秒${rankMsg}`;
            this.audio.playLevelUp();
        } else {
            this.resultTitle.textContent = "ゲーム終了";
            this.resultMessage.innerHTML = `あなたのスコアは ${this.score} / ${this.currentQuestions.length} です<br>タイム: ${duration.toFixed(1)}秒${rankMsg}`;
        }

        // Render ranking in the popup with highlight
        this.renderRanking(rankIndex);
    }

    async saveScore(nickname, score, time) {
        return await this.rankingManager.saveScore(nickname, score, time);
    }

    async renderRanking(highlightIndex = -1) {
        // Fetch fresh ranking data
        await this.rankingManager.fetchRanking();
        let ranking = this.rankingManager.getRanking();

        if (ranking.length === 0) {
            this.rankingList.innerHTML = '<div class="ranking-item empty">ランキングデータはありません</div>';
            return;
        }

        this.rankingList.innerHTML = ranking.map((item, index) => {
            const isHighlight = index === highlightIndex ? 'current' : '';
            return `
            <div class="ranking-item ${isHighlight}">
                <span class="rank-place">${index + 1}位</span>
                <span class="rank-name">${this.escapeHtml(item.nickname)}</span>
                <span class="rank-score">${item.score}問</span>
                <span class="rank-time">${item.time.toFixed(1)}秒</span>
            </div>
        `}).join('');
    }

    escapeHtml(str) {
        if (!str) return "";
        return str.replace(/[&<>"']/g, function (m) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            }[m];
        });
    }

    renderStars() {
        let stars = "";
        for (let i = 0; i < this.starCount; i++) {
            stars += "⭐️";
        }
        this.titleStars.textContent = stars;
    }

    showPlayCount() {
        this.infoPlayCount.textContent = `${this.playCount}回`;
        this.infoPopup.classList.remove('hidden');
    }

    returnToStart() {
        this.resultPopup.classList.add('hidden');
        this.quizScreen.classList.remove('active');
        this.startScreen.classList.add('active');
    }

    exitGame() {
        window.close();
        alert("ブラウザのタブを閉じて終了してください。");
    }
}

const game = new QuizGame();
