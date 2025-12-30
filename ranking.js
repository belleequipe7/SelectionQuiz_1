class RankingManager {
    constructor() {
        this.rankingData = this.loadRankingFromStorage();
    }

    // Helper to load from localStorage
    loadRankingFromStorage() {
        const stored = localStorage.getItem('quizRanking');
        return stored ? JSON.parse(stored) : [];
    }

    // Helper to save to localStorage
    saveRankingToStorage(data) {
        localStorage.setItem('quizRanking', JSON.stringify(data));
    }

    async fetchRanking() {
        // Simulate async to keep interface compatible with script.js
        return new Promise((resolve) => {
            this.rankingData = this.loadRankingFromStorage();
            resolve(this.rankingData);
        });
    }

    getRanking() {
        return this.rankingData;
    }

    async saveScore(nickname, score, time) {
        return new Promise((resolve) => {
            const entry = { nickname, score, time, timestamp: Date.now() };
            let currentRanking = this.loadRankingFromStorage();

            // Add new entry
            currentRanking.push(entry);

            // Sort: High Score > Low Time > Oldest Timestamp
            currentRanking.sort((a, b) => {
                if (b.score !== a.score) {
                    return b.score - a.score; // Descending Score
                }
                if (a.time !== b.time) {
                    return a.time - b.time; // Ascending Time
                }
                return a.timestamp - b.timestamp; // Oldest first
            });

            // Keep top 10
            currentRanking = currentRanking.slice(0, 10);

            // Save back
            this.saveRankingToStorage(currentRanking);
            this.rankingData = currentRanking;

            // Find index of our entry
            // Note: Since we use timestamp, we can uniquely identify our entry unless it was dropped from top 10
            const index = this.rankingData.findIndex(r => r.timestamp === entry.timestamp);

            resolve(index);
        });
    }
}

