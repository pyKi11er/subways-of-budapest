import stations from './stations.json';
import lines from './lines.json';

const railwayPoints = [0, 1, 2, 4, 6, 8, 11, 14, 17, 21, 25];

const gameState = {
    playerName: '',
    startTime: null,
    currentRound: 0,
    roundOrder: [],
    currentCard: null,
    cardsDrawn: 0,
    deck: [],
    segments: [],
    selectedStation: null,
    roundScores: [],
    railwayStationsVisited: 0,
    timer: null
};

function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function createDeck() {
    const cards = ['A', 'B', 'C', 'D', 'Joker', 'A', 'B', 'C', 'D', 'Joker', 'Switch'];
    return shuffleArray(cards);
}

function initGame() {
    const playerName = document.querySelector('#playerName').value.trim();
    if (!playerName) {
        return;
    }

    gameState.playerName = playerName;
    gameState.startTime = Date.now();
    gameState.roundOrder = shuffleArray([0, 1, 2, 3]);
    gameState.currentRound = 0;
    gameState.cardsDrawn = 0;
    gameState.deck = createDeck();
    gameState.segments = [];
    gameState.selectedStation = null;
    gameState.roundScores = [];
    gameState.railwayStationsVisited = 0;

    document.querySelector('#playerDisplay').textContent = playerName;
    
    document.querySelector('#menu').classList.remove('active');
    document.querySelector('#game').classList.add('active');

    renderGrid();
    renderRoundList();
    updateCurrentLine();
    updateScore();

    gameState.timer = setInterval(updateTimer, 1000);
}

function renderGrid() {
// --- TO index.js, inside renderGrid() ---

    const station = stations.find(s => s.x === x && s.y === y);
    if (station) {
        const stationDiv = document.createElement('div');
        stationDiv.className = 'station'; // Base class
        stationDiv.dataset.stationId = station.id;

        // --- NEW CODE ---
        // Add a class for the station type, e.g., "station-type-A", "station-type-?"
        // We escape the '?' for CSS compatibility, though "joker-station" also works
        const typeClass = station.type === '?' ? 'station-type-joker' : `station-type-${station.type}`;
        stationDiv.classList.add(typeClass);
        // --- END NEW CODE ---

        const currentLine = lines[gameState.roundOrder[gameState.currentRound]];
        if (station.id === currentLine.start) {
            stationDiv.classList.add('start');
        }
        
        if (station.train) {
            stationDiv.classList.add('train'); // Keep this, it's useful!
        }
        
        // This class is also good, we can use it
        if (station.type === '?') {
            stationDiv.classList.add('joker-station'); 
        }

        // --- REMOVED ---
        // We don't need the text label anymore, the image will replace it.
        // const label = document.createElement('span');
        // label.textContent = station.type === '?' ? '★' : station.type;
        // stationDiv.appendChild(label);
        // --- END REMOVED ---

        stationDiv.addEventListener('click', () => handleStationClick(station));
        cell.appendChild(stationDiv);
    }
    renderSegments();
}

function renderSegments() {
    const grid = document.querySelector('#gridContainer');
    const existingLines = grid.querySelectorAll('.segment-line');
    existingLines.forEach(line => line.remove());

    const cellSize = grid.offsetWidth / 10;

    gameState.segments.forEach(segment => {
        const fromStation = stations.find(s => s.id === segment.from);
        const toStation = stations.find(s => s.id === segment.to);

        const line = document.createElement('div');
        line.className = 'segment-line';
        line.style.color = segment.color;

        const x1 = fromStation.x * cellSize + cellSize / 2;
        const y1 = fromStation.y * cellSize + cellSize / 2;
        const x2 = toStation.x * cellSize + cellSize / 2;
        const y2 = toStation.y * cellSize + cellSize / 2;

        const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
        const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;

        line.style.width = length + 'px';
        line.style.height = '4px';
        line.style.left = x1 + 'px';
        line.style.top = (y1 - 2) + 'px';
        line.style.transform = `rotate(${angle}deg)`;
        line.style.transformOrigin = '0 50%';

        grid.appendChild(line);
    });

    stations.forEach(station => {
        const connectedLines = getConnectedLines(station.id);
        if (connectedLines.length > 0) {
            const stationEl = grid.querySelector(`[data-station-id="${station.id}"]`);
            if (stationEl) {
                stationEl.classList.add('connected');
            }
        }
    });
}

function handleStationClick(station) {
    if (!gameState.currentCard) {
        return;
    }

    const currentLine = lines[gameState.roundOrder[gameState.currentRound]];
    const currentLineSegments = gameState.segments.filter(s => s.lineId === currentLine.id);

    if (!gameState.selectedStation) {
        const canStartFrom = currentLineSegments.length === 0 
            ? station.id === currentLine.start
            : isEndpoint(station.id, currentLine.id);

        if (canStartFrom) {
            gameState.selectedStation = station.id;
            highlightStation(station.id, true);
        }
    } else {
        if (canDrawSegment(gameState.selectedStation, station.id)) {
            addSegment(gameState.selectedStation, station.id, currentLine);
            gameState.selectedStation = null;
            gameState.currentCard = null;
            gameState.cardsDrawn++;
            
            updateCardDisplay();
            updateScore();
            renderGrid();
            
            if (gameState.cardsDrawn >= 8) {
                endRound();
            }
        } else {
            gameState.selectedStation = null;
            highlightStation(station.id, false);
        }
    }
}

function highlightStation(stationId, highlight) {
    const stationEl = document.querySelector(`[data-station-id="${stationId}"]`);
    if (stationEl) {
        if (highlight) {
            stationEl.style.background = 'rgba(255, 255, 0, 0.5)';
        } else {
            stationEl.style.background = '';
        }
    }
}

function isEndpoint(stationId, lineId) {
    const lineSegments = gameState.segments.filter(s => s.lineId === lineId);
    if (lineSegments.length === 0) return false;

    const endpoints = new Set();
    lineSegments.forEach(seg => {
        endpoints.add(seg.from);
        endpoints.add(seg.to);
    });

    const counts = {};
    lineSegments.forEach(seg => {
        counts[seg.from] = (counts[seg.from] || 0) + 1;
        counts[seg.to] = (counts[seg.to] || 0) + 1;
    });

    return counts[stationId] === 1;
}

function canDrawSegment(fromId, toId) {
    const fromStation = stations.find(s => s.id === fromId);
    const toStation = stations.find(s => s.id === toId);
    const currentLine = lines[gameState.roundOrder[gameState.currentRound]];

    if (fromId === toId) return false;

    const card = gameState.currentCard;
    if (card !== 'Joker' && toStation.type !== '?' && toStation.type !== card) {
        return false;
    }

    if (!isStraightLine(fromStation, toStation)) return false;

    if (passesThrough(fromStation, toStation)) return false;

    if (hasSegmentBetween(fromId, toId)) return false;

    const lineSegments = gameState.segments.filter(s => s.lineId === currentLine.id);
    const visitedStations = new Set();
    lineSegments.forEach(seg => {
        visitedStations.add(seg.from);
        visitedStations.add(seg.to);
    });
    if (visitedStations.has(toId)) return false;

    if (intersectsExisting(fromStation, toStation)) return false;

    return true;
}

function isStraightLine(from, to) {
    return from.x === to.x || from.y === to.y;
}

function passesThrough(from, to) {
    const stationsOnPath = stations.filter(s => {
        if (s.id === from.id || s.id === to.id) return false;
        
        if (from.x === to.x && s.x === from.x) {
            const minY = Math.min(from.y, to.y);
            const maxY = Math.max(from.y, to.y);
            return s.y > minY && s.y < maxY;
        }
        
        if (from.y === to.y && s.y === from.y) {
            const minX = Math.min(from.x, to.x);
            const maxX = Math.max(from.x, to.x);
            return s.x > minX && s.x < maxX;
        }
        
        return false;
    });
    
    return stationsOnPath.length > 0;
}

function hasSegmentBetween(fromId, toId) {
    return gameState.segments.some(s => 
        (s.from === fromId && s.to === toId) || 
        (s.from === toId && s.to === fromId)
    );
}

function intersectsExisting(from, to) {
    return false;
}

function addSegment(fromId, toId, line) {
    gameState.segments.push({
        from: fromId,
        to: toId,
        lineId: line.id,
        color: line.color
    });

    const toStation = stations.find(s => s.id === toId);
    if (toStation && toStation.train) {
        gameState.railwayStationsVisited++;
    }
}

function drawCard() {
    if (gameState.deck.length === 0) {
        gameState.deck = createDeck();
    }

    gameState.currentCard = gameState.deck.pop();
    updateCardDisplay();
}

// --- TO index.js ---
function updateCardDisplay() {
    const cardEl = document.querySelector('#currentCard');
    const cardType = gameState.currentCard;

    // Clear previous card state
    cardEl.textContent = '';
    cardEl.style.backgroundImage = 'none'; // Clear old image
    cardEl.classList.remove('joker-card-style'); // Remove special joker style

    if (cardType) {
        switch (cardType) {
            case 'A':
                // Use the image you provided for 'A'
                cardEl.style.backgroundImage = "url('assets/variant=inside.png')";
                // The image already has "A", so we don't set textContent
                break;
            case 'B':
                // TO-DO: You need to create 'variant=B.png' or similar
                // cardEl.style.backgroundImage = "url('assets/variant=B.png')";
                cardEl.textContent = 'B'; // Fallback to text
                break;
            case 'C':
                // TO-DO: You need to create 'variant=C.png' or similar
                cardEl.textContent = 'C'; // Fallback to text
                break;
            case 'D':
                // TO-DO: You need to create 'variant=D.png' or similar
                cardEl.textContent = 'D'; // Fallback to text
                break;
            case 'Joker':
                // We can give the Joker card a special style
                cardEl.textContent = '★';
                cardEl.classList.add('joker-card-style');
                break;
            case 'Switch':
                cardEl.textContent = 'Switch'; // Or find an icon
                break;
            default:
                cardEl.textContent = '-';
        }
    } else {
        cardEl.textContent = '-';
    }

    document.querySelector('#cardCount').textContent = `${gameState.cardsDrawn}/8`;
}

function skipCard() {
    gameState.currentCard = null;
    gameState.cardsDrawn++;
    gameState.selectedStation = null;
    
    updateCardDisplay();
    
    if (gameState.cardsDrawn >= 8) {
        endRound();
    }
}

function endRound() {
    const currentLine = lines[gameState.roundOrder[gameState.currentRound]];
    const roundScore = calculateRoundScore(currentLine.id);
    gameState.roundScores.push(roundScore);

    gameState.currentRound++;
    gameState.cardsDrawn = 0;
    gameState.currentCard = null;
    gameState.selectedStation = null;
    gameState.deck = createDeck();

    if (gameState.currentRound >= 4) {
        endGame();
    } else {
        updateCurrentLine();
        updateScore();
        renderRoundList();
        renderGrid();
    }
}

function calculateRoundScore(lineId) {
    const lineSegments = gameState.segments.filter(s => s.lineId === lineId);
    const visitedStations = new Set();
    lineSegments.forEach(seg => {
        visitedStations.add(seg.from);
        visitedStations.add(seg.to);
    });

    const districts = new Set();
    const districtCounts = {};
    visitedStations.forEach(stationId => {
        const station = stations.find(s => s.id === stationId);
        if (station) {
            districts.add(station.district);
            districtCounts[station.district] = (districtCounts[station.district] || 0) + 1;
        }
    });

    const PK = districts.size;
    const PM = Math.max(...Object.values(districtCounts), 0);

    let PD = 0;
    lineSegments.forEach(seg => {
        const from = stations.find(s => s.id === seg.from);
        const to = stations.find(s => s.id === seg.to);
        if (from && to && from.side !== to.side) {
            PD++;
        }
    });

    const FP = (PK * PM) + PD;
    return { PK, PM, PD, FP };
}

function getConnectedLines(stationId) {
    const lines = new Set();
    gameState.segments.forEach(seg => {
        if (seg.from === stationId || seg.to === stationId) {
            lines.add(seg.lineId);
        }
    });
    return Array.from(lines);
}

function endGame() {
    clearInterval(gameState.timer);

    const sumFP = gameState.roundScores.reduce((sum, score) => sum + score.FP, 0);
    const PP = railwayPoints[Math.min(gameState.railwayStationsVisited, railwayPoints.length - 1)];

    const junctionCounts = { 2: 0, 3: 0, 4: 0 };
    stations.forEach(station => {
        const connected = getConnectedLines(station.id);
        if (connected.length >= 2) {
            junctionCounts[connected.length] = (junctionCounts[connected.length] || 0) + 1;
        }
    });

    const finalScore = sumFP + PP + (2 * junctionCounts[2]) + (5 * junctionCounts[3]) + (9 * junctionCounts[4]);

    alert(`Game Over!\n\nPlayer: ${gameState.playerName}\nFinal Score: ${finalScore}\nTime: ${document.querySelector('#timer').textContent}`);

    document.querySelector('#game').classList.remove('active');
    document.querySelector('#menu').classList.add('active');
}

function updateScore() {
    const scoreEl = document.querySelector('#scoreDetails');
    
    let html = '';
    gameState.roundScores.forEach((score, i) => {
        const line = lines[gameState.roundOrder[i]];
        html += `<div class="score-item">
            <span>${line.name}</span>
            <span>${score.FP}</span>
        </div>`;
    });

    const PP = railwayPoints[Math.min(gameState.railwayStationsVisited, railwayPoints.length - 1)];
    html += `<div class="score-item">
        <span>Railway</span>
        <span>${PP}</span>
    </div>`;

    const sumFP = gameState.roundScores.reduce((sum, score) => sum + score.FP, 0);
    const junctionCounts = { 2: 0, 3: 0, 4: 0 };
    stations.forEach(station => {
        const connected = getConnectedLines(station.id);
        if (connected.length >= 2) {
            junctionCounts[connected.length] = (junctionCounts[connected.length] || 0) + 1;
        }
    });

    const junctionScore = (2 * junctionCounts[2]) + (5 * junctionCounts[3]) + (9 * junctionCounts[4]);
    html += `<div class="score-item">
        <span>Junctions</span>
        <span>${junctionScore}</span>
    </div>`;

    const totalScore = sumFP + PP + junctionScore;
    html += `<div class="score-item">
        <span>Total</span>
        <span>${totalScore}</span>
    </div>`;

    html += `<div class="railway-track">
        <div style="font-size: 12px; margin-bottom: 5px;">Railway Progress: ${gameState.railwayStationsVisited}/10</div>
        <div class="railway-bar">
            <div class="railway-progress" style="width: ${gameState.railwayStationsVisited * 10}%"></div>
        </div>
        <div class="railway-values">
            ${railwayPoints.map(p => `<span>${p}</span>`).join('')}
        </div>
    </div>`;

    scoreEl.innerHTML = html;
}

function updateCurrentLine() {
    const currentLine = lines[gameState.roundOrder[gameState.currentRound]];
    const lineEl = document.querySelector('#currentLine');
    lineEl.textContent = `Current Line: ${currentLine.name}`;
    lineEl.style.background = currentLine.color;
}

function renderRoundList() {
    const roundListEl = document.querySelector('#roundList');
    roundListEl.innerHTML = '';

    gameState.roundOrder.forEach((lineId, index) => {
        const line = lines[lineId];
        const roundItem = document.createElement('div');
        roundItem.className = 'round-item';
        roundItem.style.background = line.color;
        roundItem.textContent = line.name;

        if (index === gameState.currentRound) {
            roundItem.classList.add('active');
        } else if (index < gameState.currentRound) {
            roundItem.classList.add('completed');
        }

        roundListEl.appendChild(roundItem);
    });
}

function updateTimer() {
    const elapsed = Math.floor((Date.now() - gameState.startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    document.querySelector('#timer').textContent = 
        `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

document.querySelector('#startBtn').addEventListener('click', initGame);

document.querySelector('#rulesBtn').addEventListener('click', () => {
    const rulesSection = document.querySelector('#rulesSection');
    rulesSection.style.display = rulesSection.style.display === 'none' ? 'block' : 'none';
});

document.querySelector('#drawCardBtn').addEventListener('click', drawCard);
document.querySelector('#skipBtn').addEventListener('click', skipCard);

const easter = document.querySelector('.easter');
const colors = ['💙', '❤️', '💚', '💛', '💜', '🧡'];
let colorIndex = 0;
easter.addEventListener('click', () => {
    colorIndex = (colorIndex + 1) % colors.length;
    easter.textContent = colors[colorIndex];
});