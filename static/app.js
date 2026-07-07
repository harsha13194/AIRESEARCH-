// ==========================================================================
// State Management & Constants
// ==========================================================================
const state = {
    currentTopic: "",
    reportMarkdown: "",
    sources: [],
    heuristics: {
        definitions: [],
        statistics: [],
        history: []
    },
    logs: [],
    historyList: JSON.parse(localStorage.getItem("research_history") || "[]"),
    nvidiaApiKey: localStorage.getItem("nvidia_api_key") || "",
    elevenLabsApiKey: localStorage.getItem("elevenlabs_api_key") || "",
    narratorVoiceId: localStorage.getItem("narrator_voice_id") || "21m00Tcm4TlvDq8ikWAM",
    isNarrating: false,
    audioNarration: null
};

// ==========================================================================
// DOM Element Selectors
// ==========================================================================
const elements = {
    searchSection: document.getElementById("search-section"),
    terminalSection: document.getElementById("terminal-section"),
    workspaceSection: document.getElementById("workspace-section"),
    searchForm: document.getElementById("search-form"),
    topicInput: document.getElementById("topic-input"),
    terminalBody: document.getElementById("terminal-body"),
    terminalTopicVal: document.getElementById("terminal-topic-val"),
    loaderProgress: document.getElementById("loader-progress"),
    reportRendered: document.getElementById("report-rendered"),
    definitionsView: document.getElementById("definitions-view"),
    statisticsView: document.getElementById("statistics-view"),
    timelineView: document.getElementById("timeline-view"),
    metricSources: document.getElementById("metric-sources"),
    metricConcepts: document.getElementById("metric-concepts"),
    metricStats: document.getElementById("metric-stats"),
    sourceBadge: document.getElementById("source-badge"),
    sourcesListContainer: document.getElementById("sources-list-container"),
    btnCopy: document.getElementById("btn-copy"),
    btnPdf: document.getElementById("btn-pdf"),
    btnNewResearch: document.getElementById("btn-new-research"),
    historyBar: document.getElementById("history-bar"),
    historyChips: document.getElementById("history-chips"),
    clearHistoryBtn: document.getElementById("clear-history-btn"),
    settingsToggleBtn: document.getElementById("settings-toggle-btn"),
    settingsContent: document.getElementById("settings-content"),
    apiKeyInput: document.getElementById("api-key-input"),
    toggleKeyVisibility: document.getElementById("toggle-key-visibility"),
    micBtn: document.getElementById("mic-btn"),
    elevenKeyInput: document.getElementById("eleven-key-input"),
    toggleElevenVisibility: document.getElementById("toggle-eleven-visibility"),
    voiceSelector: document.getElementById("voice-selector"),
    btnSpeak: document.getElementById("btn-speak"),
    speakIcon: document.getElementById("speak-icon"),
    speakText: document.getElementById("speak-text")
};

// ==========================================================================
// Client-side Custom Markdown-to-HTML Parser
// ==========================================================================
function parseMarkdown(md) {
    if (!md) return "";
    
    let html = md;
    
    // Escape HTML characters to avoid XSS issues
    html = html
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
        
    // 1. Convert Headers
    html = html.split('\n').map(line => {
        if (line.startsWith('# ')) {
            return `<h1>${line.substring(2)}</h1>`;
        } else if (line.startsWith('## ')) {
            return `<h2>${line.substring(3)}</h2>`;
        } else if (line.startsWith('### ')) {
            return `<h3>${line.substring(4)}</h3>`;
        }
        return line;
    }).join('\n');

    // 2. Bold tags (**text**)
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    
    // 3. Code Blocks (fenced)
    html = html.replace(/```(.*?)```/gs, "<pre><code>$1</code></pre>");
    
    // 4. Blockquotes (> text)
    html = html.replace(/^&gt;\s?(.*?)$/gm, "<blockquote>$1</blockquote>");
    
    // 5. Links ([text](url))
    // We un-escape '&' inside link targets so they resolve correctly
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, (match, text, url) => {
        const cleanUrl = url.replace(/&amp;/g, '&');
        return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer">${text}</a>`;
    });
    
    // 6. Bullet lists (- list item)
    // We group consecutive list lines together
    let inList = false;
    const lines = html.split('\n');
    const processedLines = lines.map(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            const content = trimmed.substring(2);
            if (!inList) {
                inList = true;
                return `<ul><li>${content}</li>`;
            }
            return `<li>${content}</li>`;
        } else {
            if (inList) {
                inList = false;
                return `</ul>\n${line}`;
            }
            return line;
        }
    });
    if (inList) processedLines.push('</ul>');
    html = processedLines.join('\n');
    
    // 7. Ordered lists (1. list item)
    let inOList = false;
    const olLines = html.split('\n');
    const processedOLLines = olLines.map(line => {
        const trimmed = line.trim();
        const olMatch = trimmed.match(/^\d+\.\s(.*)$/);
        if (olMatch) {
            const content = olMatch[1];
            if (!inOList) {
                inOList = true;
                return `<ol><li>${content}</li>`;
            }
            return `<li>${content}</li>`;
        } else {
            if (inOList) {
                inOList = false;
                return `</ol>\n${line}`;
            }
            return line;
        }
    });
    if (inOList) processedOLLines.push('</ol>');
    html = processedOLLines.join('\n');

    // 8. Paragraphs split by empty lines
    html = html.split(/\n{2,}/).map(paragraph => {
        const trimmed = paragraph.trim();
        if (trimmed && !trimmed.startsWith('<h') && !trimmed.startsWith('<ul') && !trimmed.startsWith('<ol') && !trimmed.startsWith('<blockquote') && !trimmed.startsWith('<pre')) {
            return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
        }
        return paragraph;
    }).join('\n');
    
    return html;
}

// ==========================================================================
// Live Agent Terminal Presentation Logic
// ==========================================================================
async function animateTerminalLogs(actualLogs, callback) {
    elements.terminalBody.innerHTML = `
        <div class="terminal-line"><span class="t-prompt">$</span> initialize_agent --topic="${state.currentTopic}"</div>
        <div class="terminal-line text-info"><i class="fa-solid fa-gear fa-spin"></i> Spinning up research pathways...</div>
    `;
    elements.loaderProgress.style.width = "5%";
    
    // Simulated comprehensive step-by-step logs to make the scraping feel extremely visual and interactive
    const simulatedSteps = [
        { type: "info", text: "Analyzing query expansion keywords..." },
        { type: "info", text: "Targeting DuckDuckGo HTML Index and backup nodes..." },
        { type: "success", text: "Primary search crawler connected successfully." },
        { type: "warning", text: "Analyzing search page structure. Filtering redirects..." },
        { type: "success", text: "Crawling page HTML trees for relevant article tags..." },
        { type: "info", text: "Running clean heuristics. Stripping boilerplates, footer elements..." },
        { type: "info", text: "Filtering extracted paragraphs with TF-IDF keyword density..." },
        { type: "success", text: "Performing definitions extraction & historical date parsing..." },
        { type: "info", text: "Structuring executive dossier sections..." }
    ];
    
    // Combine simulated logs with actual logs from Python
    const totalSteps = [...simulatedSteps];
    
    // Inject actual logs at logical intervals
    if (actualLogs && actualLogs.length > 0) {
        // Map actual python logs to our format
        const cleanActual = actualLogs.map(log => {
            if (log.toLowerCase().includes("failed") || log.toLowerCase().includes("error")) {
                return { type: "error", text: log };
            } else if (log.toLowerCase().includes("successfully") || log.toLowerCase().includes("completed")) {
                return { type: "success", text: log };
            } else {
                return { type: "info", text: log };
            }
        });
        
        // Insert real steps
        totalSteps.push(...cleanActual);
    }
    
    totalSteps.push({ type: "success", text: "Synthesized report compiled! Opening workspace workspace_view.bin..." });

    let currentStep = 0;
    
    function addStepLine() {
        if (currentStep >= totalSteps.length) {
            elements.loaderProgress.style.width = "100%";
            setTimeout(callback, 800);
            return;
        }
        
        const step = totalSteps[currentStep];
        const line = document.createElement("div");
        line.className = "terminal-line";
        
        if (step.type === "success") line.classList.add("text-success");
        if (step.type === "warning") line.classList.add("text-warning");
        if (step.type === "error") line.classList.add("text-error");
        
        line.innerHTML = `<span class="t-prompt">$</span> ${step.text}`;
        
        // Remove typing indicator from previous line
        const activeCursor = elements.terminalBody.querySelector(".cursor");
        if (activeCursor) activeCursor.classList.remove("cursor");
        
        // Add cursor to current line
        line.classList.add("cursor");
        
        elements.terminalBody.appendChild(line);
        elements.terminalBody.scrollTop = elements.terminalBody.scrollHeight;
        
        // Smoothly update progress loader
        const progressPercent = Math.min(10 + Math.floor((currentStep / totalSteps.length) * 85), 95);
        elements.loaderProgress.style.width = `${progressPercent}%`;
        
        currentStep++;
        
        // Variable writing speed for a natural typing/scraping vibe
        const delay = Math.floor(Math.random() * 200) + 150;
        setTimeout(addStepLine, delay);
    }
    
    setTimeout(addStepLine, 500);
}

// ==========================================================================
// Data Binding & Workspace Rendering
// ==========================================================================
function renderWorkspace(data) {
    // 1. Set full report
    state.reportMarkdown = data.report;
    elements.reportRendered.innerHTML = parseMarkdown(data.report);
    
    // 2. Set sidebar metrics
    elements.metricSources.textContent = data.sources.length;
    elements.metricConcepts.textContent = data.heuristics.definitions.length;
    elements.metricStats.textContent = data.heuristics.statistics.length;
    elements.sourceBadge.textContent = `${data.sources.length} Sites`;
    
    // 3. Render definitions tab
    elements.definitionsView.innerHTML = "";
    if (data.heuristics.definitions.length === 0) {
        elements.definitionsView.innerHTML = `<div class="fact-content">No explicit definitions could be parsed. Check full report view.</div>`;
    } else {
        data.heuristics.definitions.forEach(def => {
            const card = document.createElement("div");
            card.className = "fact-item-card def-type";
            card.innerHTML = `
                <div class="fact-icon-wrapper"><i class="fa-solid fa-book"></i></div>
                <div class="fact-content">${def}</div>
            `;
            elements.definitionsView.appendChild(card);
        });
    }
    
    // 4. Render statistics tab
    elements.statisticsView.innerHTML = "";
    if (data.heuristics.statistics.length === 0) {
        elements.statisticsView.innerHTML = `<div class="fact-content">No specific numeric data records extracted. Refer to sources list.</div>`;
    } else {
        data.heuristics.statistics.forEach(stat => {
            const card = document.createElement("div");
            card.className = "fact-item-card";
            card.innerHTML = `
                <div class="fact-icon-wrapper"><i class="fa-solid fa-chart-simple"></i></div>
                <div class="fact-content">${stat}</div>
            `;
            elements.statisticsView.appendChild(card);
        });
    }
    
    // 5. Render historical timeline tab
    elements.timelineView.innerHTML = "";
    if (data.heuristics.history.length === 0) {
        elements.timelineView.innerHTML = `<div class="fact-content">No historical timeline milestones detected in sources.</div>`;
    } else {
        // Group timeline records
        data.heuristics.history.forEach(hist => {
            const yearMatch = hist.match(/\b(19\d{2}|20\d{2})\b/);
            const year = yearMatch ? yearMatch[1] : "Timeline";
            const text = yearMatch ? hist.replace(year, "").trim().replace(/^[,\s;.:]*/, "").replace(/^./, c => c.toUpperCase()) : hist;
            
            const node = document.createElement("div");
            node.className = "timeline-node";
            node.innerHTML = `
                <div class="timeline-dot"></div>
                <div class="timeline-node-card">
                    <div class="timeline-year">${year}</div>
                    <div class="timeline-text">${text}</div>
                </div>
            `;
            elements.timelineView.appendChild(node);
        });
    }
    
    // 6. Render Sources Sidebar list
    elements.sourcesListContainer.innerHTML = "";
    data.sources.forEach(src => {
        const linkCard = document.createElement("a");
        linkCard.className = "source-card-item";
        linkCard.href = src.url;
        linkCard.target = "_blank";
        linkCard.rel = "noopener noreferrer";
        linkCard.innerHTML = `
            <div class="source-item-title">${src.title || "Untitled Web Source"}</div>
            <div class="source-item-meta">
                <span class="source-domain"><i class="fa-solid fa-globe"></i> ${src.domain || "web"}</span>
                <span>Open Source <i class="fa-solid fa-up-right-from-square"></i></span>
            </div>
        `;
        elements.sourcesListContainer.appendChild(linkCard);
    });
}

// ==========================================================================
// Event Listeners & UI Controls
// ==========================================================================
async function performResearch(topicText) {
    if (!topicText) return;
    
    state.currentTopic = topicText;
    elements.searchSection.classList.add("hidden");
    elements.terminalSection.classList.remove("hidden");
    elements.workspaceSection.classList.add("hidden");
    elements.terminalTopicVal.textContent = topicText;
    
    // Save to history
    saveSearchToHistory(topicText);
    
    // Save/Persist API keys and narrator configs if modified
    const apiKey = elements.apiKeyInput ? elements.apiKeyInput.value.trim() : "";
    if (apiKey) {
        state.nvidiaApiKey = apiKey;
        localStorage.setItem("nvidia_api_key", apiKey);
    } else {
        state.nvidiaApiKey = "";
        localStorage.removeItem("nvidia_api_key");
    }
    
    const elevenKey = elements.elevenKeyInput ? elements.elevenKeyInput.value.trim() : "";
    if (elevenKey) {
        state.elevenLabsApiKey = elevenKey;
        localStorage.setItem("elevenlabs_api_key", elevenKey);
    } else {
        state.elevenLabsApiKey = "";
        localStorage.removeItem("elevenlabs_api_key");
    }
    
    const voiceId = elements.voiceSelector ? elements.voiceSelector.value : "21m00Tcm4TlvDq8ikWAM";
    state.narratorVoiceId = voiceId;
    localStorage.setItem("narrator_voice_id", voiceId);
    
    try {
        // Trigger research backend API call
        const response = await fetch("/api/research", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ 
                topic: topicText,
                apiKey: state.nvidiaApiKey
            })
        });
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        const result = await response.json();
        
        // Animate the simulated logs combined with real backend progress, then unlock workspace
        animateTerminalLogs(result.logs, () => {
            elements.terminalSection.classList.add("hidden");
            elements.workspaceSection.classList.remove("hidden");
            renderWorkspace(result);
        });
        
    } catch (err) {
        console.error(err);
        animateTerminalLogs(["Agent execution faulted.", `Error message: ${err.message}`], () => {
            elements.terminalSection.classList.add("hidden");
            elements.searchSection.classList.remove("hidden");
            alert(`Research failed: ${err.message}. Please double check if FastAPI is running.`);
        });
    }
}

// History Tracker
function saveSearchToHistory(topic) {
    if (!state.historyList.includes(topic)) {
        state.historyList.unshift(topic); // Add to beginning
        if (state.historyList.length > 5) state.historyList.pop(); // Cap at 5
        localStorage.setItem("research_history", JSON.stringify(state.historyList));
        renderHistoryChips();
    }
}

function renderHistoryChips() {
    elements.historyChips.innerHTML = "";
    if (state.historyList.length === 0) {
        elements.historyBar.classList.add("hidden");
        return;
    }
    
    elements.historyBar.classList.remove("hidden");
    state.historyList.forEach(topic => {
        const chip = document.createElement("div");
        chip.className = "history-chip";
        chip.textContent = topic;
        chip.addEventListener("click", () => {
            elements.topicInput.value = topic;
            performResearch(topic);
        });
        elements.historyChips.appendChild(chip);
    });
}

// Clear Search History Event Listener
if (elements.clearHistoryBtn) {
    elements.clearHistoryBtn.addEventListener("click", (e) => {
        e.stopPropagation(); // Avoid triggering any container event
        state.historyList = [];
        localStorage.removeItem("research_history");
        renderHistoryChips();
    });
}

// Setup tab navigation clicks
document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        // Remove active from all tabs
        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
        
        // Activate current tab
        btn.classList.add("active");
        const targetTab = btn.getAttribute("data-tab");
        document.getElementById(`tab-${targetTab}`).classList.add("active");
    });
});

// Setup actions
elements.btnCopy.addEventListener("click", () => {
    navigator.clipboard.writeText(state.reportMarkdown).then(() => {
        const originalText = elements.btnCopy.innerHTML;
        elements.btnCopy.innerHTML = `<i class="fa-solid fa-check"></i> Copied!`;
        setTimeout(() => {
            elements.btnCopy.innerHTML = originalText;
        }, 2000);
    });
});

elements.btnPdf.addEventListener("click", () => {
    window.print();
});

elements.btnNewResearch.addEventListener("click", () => {
    stopNarration(); // Stop any active narration
    elements.topicInput.value = "";
    elements.workspaceSection.classList.add("hidden");
    elements.searchSection.classList.remove("hidden");
});

elements.searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const query = elements.topicInput.value.trim();
    stopNarration(); // Stop active narration on new search submission
    performResearch(query);
});

// ==========================================================================
// ElevenLabs Audio Player Narration Setup
// ==========================================================================
function getNarrationText() {
    const reportElem = elements.reportRendered;
    if (reportElem) {
        const paragraphs = reportElem.querySelectorAll("p");
        if (paragraphs && paragraphs.length > 0) {
            return paragraphs[0].textContent;
        }
    }
    if (state.heuristics.definitions && state.heuristics.definitions.length > 0) {
        return state.heuristics.definitions[0];
    }
    return `Executive summary for topic: ${state.currentTopic}. Detailed report compiled successfully.`;
}

async function toggleNarration() {
    if (state.isNarrating) {
        pauseNarration();
        return;
    }

    if (state.audioNarration) {
        resumeNarration();
        return;
    }

    // Start fresh narration
    const textToNarrate = getNarrationText();
    const apiKey = elements.elevenKeyInput ? elements.elevenKeyInput.value.trim() : state.elevenLabsApiKey;
    const voiceId = elements.voiceSelector ? elements.voiceSelector.value : state.narratorVoiceId;

    if (!apiKey) {
        alert("Please enter an ElevenLabs API Key in Advanced Settings to narrate the report.");
        if (elements.settingsToggleBtn && elements.settingsContent.classList.contains("hidden")) {
            elements.settingsToggleBtn.click();
        }
        return;
    }

    setNarrationLoadingState(true);

    try {
        const response = await fetch("/api/tts", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                text: textToNarrate,
                apiKey: apiKey,
                voiceId: voiceId
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || `HTTP error ${response.status}`);
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        
        state.audioNarration = new Audio(audioUrl);
        
        state.audioNarration.onended = () => {
            resetNarrationState();
        };

        state.audioNarration.onerror = (e) => {
            console.error("Audio Playback Error:", e);
            resetNarrationState();
            alert("Error during voice playback narration.");
        };

        state.audioNarration.play();
        state.isNarrating = true;
        updatePlayerUI();

    } catch (err) {
        console.error(err);
        alert(`Narration failed: ${err.message}`);
        resetNarrationState();
    } finally {
        setNarrationLoadingState(false);
    }
}

function pauseNarration() {
    if (state.audioNarration) {
        state.audioNarration.pause();
        state.isNarrating = false;
        updatePlayerUI();
    }
}

function resumeNarration() {
    if (state.audioNarration) {
        state.audioNarration.play();
        state.isNarrating = true;
        updatePlayerUI();
    }
}

function stopNarration() {
    if (state.audioNarration) {
        state.audioNarration.pause();
        state.audioNarration.currentTime = 0;
    }
    resetNarrationState();
}

function resetNarrationState() {
    state.isNarrating = false;
    state.audioNarration = null;
    updatePlayerUI();
}

function setNarrationLoadingState(isLoading) {
    if (elements.btnSpeak) {
        if (isLoading) {
            elements.btnSpeak.classList.add("loading");
            if (elements.speakIcon) elements.speakIcon.className = "fa-solid fa-spinner fa-spin";
            if (elements.speakText) elements.speakText.textContent = "Loading...";
        } else {
            elements.btnSpeak.classList.remove("loading");
        }
    }
}

function updatePlayerUI() {
    if (!elements.btnSpeak) return;

    if (state.isNarrating) {
        elements.btnSpeak.classList.add("narrating");
        if (elements.speakIcon) elements.speakIcon.className = "fa-solid fa-pause";
        if (elements.speakText) elements.speakText.textContent = "Pause Voice";
    } else {
        elements.btnSpeak.classList.remove("narrating");
        if (elements.speakIcon) elements.speakIcon.className = "fa-solid fa-play";
        if (elements.speakText) elements.speakText.textContent = state.audioNarration ? "Resume" : "Listen";
    }
}

// Bind speak button click
if (elements.btnSpeak) {
    elements.btnSpeak.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleNarration();
    });
}

// Setup Advanced Settings drawer and visibility toggles
if (elements.settingsToggleBtn) {
    elements.settingsToggleBtn.addEventListener("click", () => {
        elements.settingsToggleBtn.classList.toggle("active");
        elements.settingsContent.classList.toggle("hidden");
    });
}

if (elements.toggleKeyVisibility && elements.apiKeyInput) {
    elements.toggleKeyVisibility.addEventListener("click", () => {
        const type = elements.apiKeyInput.type === "password" ? "text" : "password";
        elements.apiKeyInput.type = type;
        const icon = elements.toggleKeyVisibility.querySelector("i");
        if (icon) {
            icon.className = type === "password" ? "fa-regular fa-eye" : "fa-regular fa-eye-slash";
        }
    });
}

if (elements.toggleElevenVisibility && elements.elevenKeyInput) {
    elements.toggleElevenVisibility.addEventListener("click", () => {
        const type = elements.elevenKeyInput.type === "password" ? "text" : "password";
        elements.elevenKeyInput.type = type;
        const icon = elements.toggleElevenVisibility.querySelector("i");
        if (icon) {
            icon.className = type === "password" ? "fa-regular fa-eye" : "fa-regular fa-eye-slash";
        }
    });
}

// ==========================================================================
// Speech Recognition (Speech Input) Setup
// ==========================================================================
let recognition = null;
let isRecording = false;

function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        if (elements.micBtn) {
            elements.micBtn.style.display = "none";
        }
        console.warn("Speech Recognition not supported in this browser.");
        return;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => {
        isRecording = true;
        if (elements.micBtn) {
            elements.micBtn.classList.add("recording");
            elements.micBtn.title = "Listening...";
        }
        if (elements.topicInput) {
            elements.topicInput.placeholder = "Listening... Speak your topic now.";
            elements.topicInput.value = "";
        }
    };

    recognition.onend = () => {
        isRecording = false;
        if (elements.micBtn) {
            elements.micBtn.classList.remove("recording");
            elements.micBtn.title = "Speak Topic";
        }
        if (elements.topicInput && !elements.topicInput.value) {
            elements.topicInput.placeholder = "Enter a topic (e.g. Generative AI in Healthcare, Fusion Energy, Bitcoin Halving)";
        }
    };

    recognition.onerror = (event) => {
        console.error("Speech Recognition Error:", event.error);
        isRecording = false;
        if (elements.micBtn) {
            elements.micBtn.classList.remove("recording");
        }
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (elements.topicInput && transcript) {
            // Strip trailing periods that recognition sometimes appends
            elements.topicInput.value = transcript.trim().replace(/\.$/, "");
            elements.topicInput.focus();
        }
    };
}

if (elements.micBtn) {
    elements.micBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (!recognition) {
            initSpeechRecognition();
        }
        
        if (recognition) {
            if (isRecording) {
                recognition.stop();
            } else {
                recognition.start();
            }
        }
    });
}

// CodeNest HLS Video Streaming Player
function initBackgroundVideo() {
    const video = document.getElementById("codenest-bg-video");
    const videoSrc = "https://stream.mux.com/tLkHO1qZoaaQOUeVWo8hEBeGQfySP02EPS02BmnNFyXys.m3u8";

    if (!video) return;

    if (window.Hls && Hls.isSupported()) {
        const hls = new Hls({
            enableWorker: false
        });
        hls.loadSource(videoSrc);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
            video.play().catch(e => console.log("HLS playback autoplay prevented:", e));
        });
        hls.on(Hls.Events.ERROR, function (event, data) {
            if (data.fatal) {
                switch (data.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                        hls.startLoad();
                        break;
                    case Hls.ErrorTypes.MEDIA_ERROR:
                        hls.recoverMediaError();
                        break;
                    default:
                        hls.destroy();
                        break;
                }
            }
        });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = videoSrc;
        video.addEventListener("loadedmetadata", () => {
            video.play().catch(e => console.log("Native manifest autoplay prevented:", e));
        });
    }
}

// Mobile Hamburger Navigation Drawer
function initMobileMenu() {
    const hamburgerBtn = document.getElementById("hamburger-btn");
    const closeMenuBtn = document.getElementById("close-menu-btn");
    const mobileOverlay = document.getElementById("mobile-menu-overlay");
    const links = document.querySelectorAll(".mobile-menu-link");

    if (!hamburgerBtn || !mobileOverlay) return;

    hamburgerBtn.addEventListener("click", () => {
        mobileOverlay.classList.add("active");
        document.body.style.overflow = "hidden";
    });

    const closeMenu = () => {
        mobileOverlay.classList.remove("active");
        document.body.style.overflow = "";
    };

    if (closeMenuBtn) closeMenuBtn.addEventListener("click", closeMenu);
    mobileOverlay.addEventListener("click", (e) => {
        if (e.target === mobileOverlay) closeMenu();
    });

    links.forEach(link => {
        link.addEventListener("click", closeMenu);
    });
}

// Scroll & Focus Research Search Box
function initCtaScroll() {
    const getStartedBtn = document.getElementById("cta-get-started");
    if (getStartedBtn) {
        getStartedBtn.addEventListener("click", () => {
            const input = document.getElementById("topic-input");
            if (input) {
                input.scrollIntoView({ behavior: "smooth", block: "center" });
                setTimeout(() => {
                    input.focus();
                }, 800);
            }
        });
    }
}

// Premium Navigation Scroll Transitions
function initNavScrolls() {
    const navItems = [
        { selector: "#nav-link-research, a[href='#search-section']", target: "topic-input", focus: true },
        { selector: "#nav-link-workspace, a[href='#workspace-section']", target: "workspace-section", focus: false },
        { selector: "#nav-link-settings, a[href='#settings-toggle-btn']", target: "settings-toggle-btn", click: true },
        { selector: "#nav-link-history, a[href='#history-bar']", target: "history-bar", focus: false }
    ];

    navItems.forEach(item => {
        const elems = document.querySelectorAll(item.selector);
        elems.forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.preventDefault();
                const targetElem = document.getElementById(item.target);
                if (targetElem) {
                    if (item.click) {
                        // Open Settings Drawer if closed
                        if (targetElem.id === "settings-toggle-btn" && !targetElem.classList.contains("active")) {
                            targetElem.click();
                        }
                        targetElem.scrollIntoView({ behavior: "smooth", block: "center" });
                    } else {
                        if (item.target === "workspace-section" && targetElem.classList.contains("hidden")) {
                            alert("Please search a topic to activate the research workspace dossier first!");
                            return;
                        }
                        targetElem.scrollIntoView({ behavior: "smooth", block: "center" });
                        if (item.focus) {
                            setTimeout(() => targetElem.focus(), 850);
                        }
                    }
                }
            });
        });
    });
}

// Initial boot configurations
window.addEventListener("DOMContentLoaded", () => {
    renderHistoryChips();
    initBackgroundVideo();
    initMobileMenu();
    initCtaScroll();
    initNavScrolls();
    
    // Load persisted API keys and narrator voices if present
    if (state.nvidiaApiKey && elements.apiKeyInput) {
        elements.apiKeyInput.value = state.nvidiaApiKey;
    }
    if (state.elevenLabsApiKey && elements.elevenKeyInput) {
        elements.elevenKeyInput.value = state.elevenLabsApiKey;
    }
    if (state.narratorVoiceId && elements.voiceSelector) {
        elements.voiceSelector.value = state.narratorVoiceId;
    }
});
