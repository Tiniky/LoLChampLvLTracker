function toggleSection(sectionId) {
    const section = document.getElementById(sectionId);
    section.classList.toggle('collapsed');
}

function toggleMenu() {
    const menu = document.getElementById('menu');
    menu.classList.toggle('open');
}

function showHamburgerMenu() {
    const hamburger = document.getElementById('hamburgerMenu');
    if (hamburger) {
        hamburger.style.display = 'block';
    }
}

const TIERS = ["10+", "9", "8", "7", "6", "5", "4", "3", "2", "1"];
let ALL_CHAMPS = [];
let CHAMPION_LEVELS = JSON.parse(localStorage.getItem("championLevels")) || {};

async function fetchChamps(version) {
    const res = await fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`);
    const data = await res.json();
    return Object.keys(data.data);
}

async function getLatestVersion() {
    const res = await fetch("https://ddragon.leagueoflegends.com/api/versions.json");
    const versions = await res.json();
    return versions[0];
}

const tierlistDiv = document.getElementById("tierlist");
let poolContainer = null;

if (tierlistDiv) {
    TIERS.forEach(tier => {
        const row = document.createElement("div");
        row.className = "tier";

        const label = document.createElement("div");
        label.className = "tier-label";
        label.innerText = tier;

        const container = document.createElement("div");
        container.className = "tier-row";
        container.id = `tier-${tier}`;

        row.appendChild(label);
        row.appendChild(container);
        tierlistDiv.appendChild(row);

        new Sortable(container, { 
            group: "shared", 
            animation: 150,
            onEnd: () => {
                updateFocus();
                saveLevelsToLocalStorage();
            }
        });
    });

    const poolRow = document.createElement("div");
    poolRow.className = "tier";
    poolRow.innerHTML = '<div class="tier-label">Pool</div>';
    poolContainer = document.createElement("div");
    poolContainer.className = "tier-row";
    poolContainer.id = "tier-Pool";
    poolRow.appendChild(poolContainer);
    tierlistDiv.appendChild(poolRow);
    new Sortable(poolContainer, { 
        group: "shared", 
        animation: 150,
        onEnd: saveLevelsToLocalStorage
    });
}

const focuslistDiv = document.getElementById("focuslist");
if (focuslistDiv) {
    const focusRow = document.createElement("div");
    focusRow.className = "tier";
    focusRow.innerHTML = '<div class="tier-label">Focus</div>';
    const focusContainer = document.createElement("div");
    focusContainer.className = "tier-row";
    focusContainer.id = "tier-Focus";
    focusRow.appendChild(focusContainer);
    focuslistDiv.appendChild(focusRow);
}

const secondaryPrioDiv = document.getElementById("secondaryPrioList");
if (secondaryPrioDiv) {
    const secondaryRow = document.createElement("div");
    secondaryRow.className = "tier";
    secondaryRow.innerHTML = '<div class="tier-label">Prio</div>';
    const secondaryContainer = document.createElement("div");
    secondaryContainer.className = "tier-row";
    secondaryContainer.id = "tier-SecondaryPrio";
    secondaryRow.appendChild(secondaryContainer);
    secondaryPrioDiv.appendChild(secondaryRow);
}

if (poolContainer) {
    getLatestVersion().then(version => {
        fetchChamps(version).then(champions => {
            ALL_CHAMPS = champions;
            const savedLevels = JSON.parse(localStorage.getItem("championLevels"));
            const savedOrder = JSON.parse(localStorage.getItem("championOrder"));
            
            if (savedLevels && Object.keys(savedLevels).length > 0) {
                CHAMPION_LEVELS = savedLevels;
                let championsToLoad = savedOrder || [];
                
                if (!savedOrder || savedOrder.length === 0) {
                    TIERS.forEach(tier => {
                        const levelValue = tier === "10+" ? 10 : parseInt(tier);
                        Object.keys(savedLevels).forEach(champ => {
                            if (savedLevels[champ] === levelValue && !championsToLoad.includes(champ)) {
                                championsToLoad.push(champ);
                            }
                        });
                    });
                }
                
                championsToLoad.forEach(champ => {
                    const level = savedLevels[champ];
                    const tier = level === 10 ? "10+" : level.toString();
                    const container = document.getElementById(`tier-${tier}`);
                    
                    const img = document.createElement("img");
                    img.src = `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${champ}.png`;
                    img.alt = champ;
                    img.dataset.name = champ;
                    
                    if (container) {
                        container.appendChild(img);
                    }
                });
                
                const savedChamps = new Set(Object.keys(savedLevels));
                champions.forEach(champ => {
                    if (!savedChamps.has(champ)) {
                        const img = document.createElement("img");
                        img.src = `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${champ}.png`;
                        img.alt = champ;
                        img.dataset.name = champ;
                        poolContainer.appendChild(img);
                    }
                });
                
                saveLevelsToLocalStorage();
                showHamburgerMenu();
            } else {
                champions.forEach(champ => {
                    const img = document.createElement("img");
                    img.src = `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${champ}.png`;
                    img.alt = champ;
                    img.dataset.name = champ;
                    poolContainer.appendChild(img);
                });
            }
        });
    });
} else {
    getLatestVersion().then(version => {
        fetchChamps(version).then(champions => {
            ALL_CHAMPS = champions;
            updateFocus();
            initializeChallenges(version, champions);
        });
    });
}

function saveCSV() {
    let rows = [];
    TIERS.concat(["Pool"]).forEach(tier => {
        const container = document.getElementById(`tier-${tier}`);
        const champs = Array.from(container.querySelectorAll("img")).map(img => img.dataset.name);
        rows.push(`${tier},${champs.join(";")}`);
    });
    
    const challenges = JSON.parse(localStorage.getItem("challenges")) || {};
    const challengeContainers = [
        "jack-of-all-champs",
        "all-random-all-champs",
        "invincible-champs",
        "perfectionist-champs",
        "same-penta-different-champs",
        "protean-override-champs"
    ];
    
    challengeContainers.forEach(containerId => {
        const champsInChallenge = challenges[containerId] || [];
        rows.push(`${containerId},${champsInChallenge.join(";")}`);
    });
    
    const blob = new Blob([rows.join("\n")], { type: 'text/csv' });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "lol.csv";
    a.click();
}

function loadCSV(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        const lines = e.target.result.split(/\r?\n/);
        const challenges = {};
        const challengeContainers = [
            "jack-of-all-champs",
            "all-random-all-champs",
            "invincible-champs",
            "perfectionist-champs",
            "same-penta-different-champs",
            "protean-override-champs"
        ];
        
        getLatestVersion().then(version => {
            lines.forEach(line => {
                const [tier, champs] = line.split(",");
                if (!tier || tier === "Focus") return;
                if (challengeContainers.includes(tier)) {
                    challenges[tier] = champs ? champs.split(";").filter(c => c) : [];
                } else {
                    const container = document.getElementById(`tier-${tier}`);
                    if (container) {
                        container.innerHTML = "";
                        if (champs) {
                            champs.split(";").forEach(champ => {
                                if (!champ) return;
                                const img = document.createElement("img");
                                img.src = `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${champ}.png`;
                                img.dataset.name = champ;
                                container.appendChild(img);
                            });
                        }
                    }
                }
            });
            
            if (Object.keys(challenges).length > 0) {
                localStorage.setItem("challenges", JSON.stringify(challenges));
            }
            
            saveLevelsToLocalStorage();
            updateFocus();
            showHamburgerMenu();
        });
    };
    reader.readAsText(file);
}

function addToAram() {
    const input = document.getElementById("champInput");
    var champ = input.value.trim();
    if (!champ) return;

    if (champ == "Wukong" || champ == "wukong") {
        champ = "MonkeyKing";
    }

    if (champ == "TF" || champ == "tf") {
        champ = "TwistedFate";
    }

    if (champ == "Mundo" || champ == "mundo") {
        champ = "DrMundo";
    }

    const aramChamps = Array.from(document.getElementById("aramlist").querySelectorAll("img")).map(img => img.dataset.name);
    if (aramChamps.includes(champ)) {
        input.value = "";
        return;
    }

    if (!ALL_CHAMPS.includes(champ)) {
        input.value = "";
        return;
    }

    getLatestVersion().then(version => {
        const img = document.createElement("img");
        img.src = `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${champ}.png`;
        img.alt = champ;
        img.dataset.name = champ;
        document.getElementById("aramlist").appendChild(img);
        input.value = "";
    });
}

const champInput = document.getElementById("champInput");
if (champInput) {
    champInput.addEventListener("keydown", e => {
        if (e.key === "Enter") addToAram();
    });

    champInput.addEventListener("input", e => {
        const input = e.target;
        const typed = input.value;
        if (!typed) return;

        const matches = ALL_CHAMPS.filter(champ => champ.toLowerCase().startsWith(typed.toLowerCase()));
        if (matches.length === 1 && matches[0].toLowerCase() !== typed.toLowerCase()) {
            const cursorPos = typed.length;
            input.value = matches[0];
            input.setSelectionRange(cursorPos, matches[0].length);
        }
    });
}

function saveLevelsToLocalStorage() {
    CHAMPION_LEVELS = {};
    const championOrder = [];
    TIERS.forEach(tier => {
        const container = document.getElementById(`tier-${tier}`);
        if (container) {
            const tierChamps = Array.from(container.querySelectorAll("img")).map(img => img.dataset.name);
            const levelValue = tier === "10+" ? 10 : parseInt(tier);
            tierChamps.forEach(champ => {
                CHAMPION_LEVELS[champ] = levelValue;
                championOrder.push(champ);
            });
        }
    });
    
    const poolContainer = document.getElementById("tier-Pool");
    if (poolContainer) {
        const poolChamps = Array.from(poolContainer.querySelectorAll("img")).map(img => img.dataset.name);
        poolChamps.forEach(champ => {
            if (!CHAMPION_LEVELS[champ]) {
                CHAMPION_LEVELS[champ] = 0;
                championOrder.push(champ);
            }
        });
    }
    
    localStorage.setItem("championLevels", JSON.stringify(CHAMPION_LEVELS));
    localStorage.setItem("championOrder", JSON.stringify(championOrder));
}

function updateFocus() {
    let focusChamps = [];
    if (document.getElementById("tierlist")) {
        CHAMPION_LEVELS = {};
        
        TIERS.forEach(tier => {
            const container = document.getElementById(`tier-${tier}`);
            const tierChamps = Array.from(container.querySelectorAll("img")).map(img => img.dataset.name);
            tierChamps.forEach(champ => {
                const levelValue = tier === "10+" ? 10 : parseInt(tier);
                CHAMPION_LEVELS[champ] = levelValue;
            });
        });
        
        localStorage.setItem("championLevels", JSON.stringify(CHAMPION_LEVELS));
    } else if (document.getElementById("tier-Focus")) {
        const savedOrder = JSON.parse(localStorage.getItem("championOrder"));
        if (savedOrder && savedOrder.length > 0) {
            focusChamps = savedOrder.slice().reverse();
        } else {
            const reversedTiers = TIERS.slice().reverse();
            reversedTiers.forEach(tier => {
                const levelValue = tier === "10+" ? 10 : parseInt(tier);
                Object.entries(CHAMPION_LEVELS).forEach(([champ, level]) => {
                    if (level === levelValue) {
                        focusChamps.push(champ);
                    }
                });
            });
        }
    }

    const top50 = focusChamps.slice(0, 50);
    getLatestVersion().then(version => {
        const focusContainer = document.getElementById("tier-Focus");
        if (focusContainer) {
            focusContainer.innerHTML = "";
            top50.forEach(champ => {
                const img = document.createElement("img");
                img.src = `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${champ}.png`;
                img.alt = champ;
                img.dataset.name = champ;
                focusContainer.appendChild(img);
            });
        }
    });
    
    updateSecondaryPrio();
}

function updateSecondaryPrio() {
    let secondaryChamps = [];
    if (document.getElementById("secondaryPrioList")) {
        const savedOrder = JSON.parse(localStorage.getItem("championOrder"));
        
        if (savedOrder && savedOrder.length > 0) {
            secondaryChamps = savedOrder.filter(champ => {
                const level = CHAMPION_LEVELS[champ];
                return level >= 5 && level <= 9;
            });
        } else {
            const tiers59 = ["9", "8", "7", "6", "5"];
            tiers59.forEach(tier => {
                const levelValue = parseInt(tier);
                Object.entries(CHAMPION_LEVELS).forEach(([champ, level]) => {
                    if (level === levelValue) {
                        secondaryChamps.push(champ);
                    }
                });
            });
        }
    }

    const top50 = secondaryChamps.slice(0, 50);
    getLatestVersion().then(version => {
        const secondaryContainer = document.getElementById("tier-SecondaryPrio");
        if (secondaryContainer) {
            secondaryContainer.innerHTML = "";
            top50.forEach(champ => {
                const img = document.createElement("img");
                img.src = `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${champ}.png`;
                img.alt = champ;
                img.dataset.name = champ;
                secondaryContainer.appendChild(img);
            });
        }
    });
}

function showMassImportPopup() {
    document.getElementById("massImportPopup").style.display = "block";
    document.getElementById("popupOverlay").style.display = "block";
}

function closeMassImportPopup() {
    document.getElementById("massImportPopup").style.display = "none";
    document.getElementById("popupOverlay").style.display = "none";
    document.getElementById("massImportText").value = "";
}

function submitMassImport() {
    const text = document.getElementById("massImportText").value.trim();
    
    if (!text) {
        alert("Please paste the champion mastery table");
        return;
    }

    getLatestVersion().then(version => {
        const lines = text.split('\n');
        const poolContainer = document.getElementById("tier-Pool");
        
        lines.forEach(line => {
            if (!line.trim()) return;
            
            const parts = line.split('\t').map(p => p.trim());
            if (parts.length < 2) return;
            
            let champName = parts[0];
            let level = parseInt(parts[1]);
            
            if (!champName || isNaN(level)) return;
            
            if (champName === "Wukong") champName = "MonkeyKing";
            if (champName === "Renata Glasc") champName = "Renata";
            if (champName === "Nunu & Willump") champName = "Nunu";
            
            const matchingChamp = ALL_CHAMPS.find(c => 
                c.toLowerCase() === champName.toLowerCase() || 
                c.toLowerCase().replace(/[^a-z]/g, '') === champName.toLowerCase().replace(/[^a-z]/g, '')
            );
            
            if (!matchingChamp) return;
            champName = matchingChamp;
            
            let tier = level >= 10 ? "10+" : level.toString();
            
            const poolImages = poolContainer.querySelectorAll("img");
            poolImages.forEach(img => {
                if (img.dataset.name === champName) {
                    img.remove();
                }
            });
            
            TIERS.forEach(t => {
                const container = document.getElementById(`tier-${t}`);
                if (container) {
                    const images = container.querySelectorAll("img");
                    images.forEach(img => {
                        if (img.dataset.name === champName) {
                            img.remove();
                        }
                    });
                }
            });
            
            const targetContainer = document.getElementById(`tier-${tier}`);
            if (targetContainer) {
                const img = document.createElement("img");
                img.src = `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${champName}.png`;
                img.alt = champName;
                img.dataset.name = champName;
                targetContainer.appendChild(img);
            }
        });
        
        saveLevelsToLocalStorage();
        updateFocus();
        closeMassImportPopup();
        showHamburgerMenu();
        alert("Import complete!");
    });
}

function clearData() {
    if (confirm("Are you sure you want to clear all data? Make sure to save first!")) {
        localStorage.removeItem("championLevels");
        localStorage.removeItem("championOrder");
        localStorage.removeItem("challenges");
        location.reload();
    }
}

function initializeChallenges(version, champions) {
    const challengeContainers = [
        "jack-of-all-champs",
        "all-random-all-champs",
        "invincible-champs",
        "perfectionist-champs",
        "same-penta-different-champs",
        "protean-override-champs"
    ];
    
    challengeContainers.forEach(containerId => {
        const container = document.getElementById(containerId);
        if (container) {
            const savedChallenges = JSON.parse(localStorage.getItem("challenges")) || {};
            const savedChamps = savedChallenges[containerId] || [];
            
            const champsToLoad = savedChamps.length > 0 ? savedChamps : champions;
            
            container.innerHTML = "";
            champsToLoad.forEach(champ => {
                const img = document.createElement("img");
                img.src = `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${champ}.png`;
                img.alt = champ;
                img.dataset.name = champ;
                
                img.addEventListener("dblclick", () => {
                    const champName = img.dataset.name;
                    img.remove();
                    saveChallengeData(containerId);
                    addToUndoHistory(containerId, champName);
                    updateChallengeTitle(containerId);
                });
                
                container.appendChild(img);
            });
            
            updateChallengeTitle(containerId);
        }
    });
}

function saveChallengeData(containerId) {
    const challenges = JSON.parse(localStorage.getItem("challenges")) || {};
    const container = document.getElementById(containerId);
    
    if (container) {
        const champsInContainer = Array.from(container.querySelectorAll("img")).map(img => img.dataset.name);
        challenges[containerId] = champsInContainer;
        localStorage.setItem("challenges", JSON.stringify(challenges));
    }
}

// Undo History Management
function addToUndoHistory(challengeId, championName) {
    let undoHistory = JSON.parse(localStorage.getItem("undoHistory")) || [];
    
    undoHistory.push({
        challengeId: challengeId,
        championName: championName,
        timestamp: Date.now()
    });
    
    // Keep only last 5 actions
    if (undoHistory.length > 5) {
        undoHistory = undoHistory.slice(-5);
    }
    
    localStorage.setItem("undoHistory", JSON.stringify(undoHistory));
    updateUndoButton();
}

function updateUndoButton() {
    const undoBtn = document.getElementById("undoBtn");
    if (undoBtn) {
        const undoHistory = JSON.parse(localStorage.getItem("undoHistory")) || [];
        undoBtn.disabled = undoHistory.length === 0;
        undoBtn.style.opacity = undoHistory.length === 0 ? "0.3" : "1";
        undoBtn.style.cursor = undoHistory.length === 0 ? "not-allowed" : "pointer";
    }
}

function undoLastRemoval() {
    const undoHistory = JSON.parse(localStorage.getItem("undoHistory")) || [];
    
    if (undoHistory.length === 0) {
        return;
    }
    
    const lastAction = undoHistory.pop();
    localStorage.setItem("undoHistory", JSON.stringify(undoHistory));
    
    const { challengeId, championName } = lastAction;
    const container = document.getElementById(challengeId);
    
    if (container) {
        getLatestVersion().then(version => {
            const img = document.createElement("img");
            img.src = `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${championName}.png`;
            img.alt = championName;
            img.dataset.name = championName;
            
            img.addEventListener("dblclick", () => {
                const champName = img.dataset.name;
                img.remove();
                saveChallengeData(challengeId);
                addToUndoHistory(challengeId, champName);
                updateChallengeTitle(challengeId);
            });
            
            container.appendChild(img);
            
            // Sort alphabetically
            const allImages = Array.from(container.querySelectorAll("img"));
            allImages.sort((a, b) => a.dataset.name.localeCompare(b.dataset.name));
            container.innerHTML = "";
            allImages.forEach(sortedImg => container.appendChild(sortedImg));
            
            saveChallengeData(challengeId);
            updateChallengeTitle(challengeId);
            updateUndoButton();
        });
    }
}

function updateChallengeTitle(containerId) {
    const titleMap = {
        "jack-of-all-champs": "title-jack-of-all",
        "all-random-all-champs": "title-all-random-all",
        "invincible-champs": "title-invincible",
        "perfectionist-champs": "title-perfectionist",
        "same-penta-different-champs": "title-same-penta-different",
        "protean-override-champs": "title-protean-override"
    };
    
    const titleId = titleMap[containerId];
    const titleElement = document.getElementById(titleId);
    
    if (titleElement) {
        const container = document.getElementById(containerId);
        const remaining = container ? container.querySelectorAll("img").length : 0;
        const total = ALL_CHAMPS.length;
        const completed = total - remaining;
        const challengeName = titleElement.dataset.challengeName;
        
        titleElement.textContent = `${challengeName} - ${remaining} remaining (${completed}/${total})`;
    }
}

// Initialize undo button state on page load
if (document.getElementById("undoBtn")) {
    updateUndoButton();
}

