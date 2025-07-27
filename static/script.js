let audioData = null;
let wavesurfer = null;
let currentSettings = {
    block_size: 0.04,
    hop_size: 0.01,
    creak_threshold: 0.75,
    gender_model: 'all',
    zcr_threshold: 0.08,
    ste_threshold: 0.00001,
    audio_start: 0,
    audio_end: -1
};

const fileInput = document.getElementById('fileInput');
const analyzeBtn = document.getElementById('analyzeBtn');
const loadingSpinner = document.getElementById('loadingSpinner');
const resultsSection = document.getElementById('results');
const errorMessage = document.getElementById('errorMessage');
const playPauseBtn = document.getElementById('playPauseBtn');
const currentTimeDisplay = document.getElementById('currentTime');
const totalTimeDisplay = document.getElementById('totalTime');

// Settings panel elements
const settingsBtn = document.getElementById('settingsBtn');
const settingsPanel = document.getElementById('settingsPanel');
const closeSettingsBtn = document.getElementById('closeSettings');
const applySettingsBtn = document.getElementById('applySettings');
const resetSettingsBtn = document.getElementById('resetSettings');

fileInput.addEventListener('change', (e) => {
    analyzeBtn.disabled = !e.target.files.length;
});

// Settings panel event listeners
settingsBtn.addEventListener('click', () => {
    loadSettingsToUI();
    settingsPanel.style.display = 'flex';
});

closeSettingsBtn.addEventListener('click', () => {
    settingsPanel.style.display = 'none';
});

settingsPanel.addEventListener('click', (e) => {
    if (e.target === settingsPanel) {
        settingsPanel.style.display = 'none';
    }
});

applySettingsBtn.addEventListener('click', () => {
    saveSettingsFromUI();
    settingsPanel.style.display = 'none';
    
    // If results are currently displayed, update the visualization with new settings
    if (audioData && resultsSection.style.display !== 'none') {
        updateVisualizationWithNewSettings();
    }
});

resetSettingsBtn.addEventListener('click', () => {
    resetToDefaults();
    loadSettingsToUI();
});

// Settings management functions
function loadSettingsToUI() {
    document.getElementById('blockSize').value = currentSettings.block_size;
    document.getElementById('hopSize').value = currentSettings.hop_size;
    document.getElementById('creakThreshold').value = currentSettings.creak_threshold;
    document.getElementById('genderModel').value = currentSettings.gender_model;
    document.getElementById('zcrThreshold').value = currentSettings.zcr_threshold;
    document.getElementById('steThreshold').value = currentSettings.ste_threshold;
    document.getElementById('audioStart').value = currentSettings.audio_start;
    document.getElementById('audioEnd').value = currentSettings.audio_end;
}

function saveSettingsFromUI() {
    currentSettings.block_size = parseFloat(document.getElementById('blockSize').value);
    currentSettings.hop_size = parseFloat(document.getElementById('hopSize').value);
    currentSettings.creak_threshold = parseFloat(document.getElementById('creakThreshold').value);
    currentSettings.gender_model = document.getElementById('genderModel').value;
    currentSettings.zcr_threshold = parseFloat(document.getElementById('zcrThreshold').value);
    currentSettings.ste_threshold = parseFloat(document.getElementById('steThreshold').value);
    currentSettings.audio_start = parseFloat(document.getElementById('audioStart').value);
    currentSettings.audio_end = parseFloat(document.getElementById('audioEnd').value);
    
    // Save to localStorage for persistence
    localStorage.setItem('creapySettings', JSON.stringify(currentSettings));
}

function resetToDefaults() {
    currentSettings = {
        block_size: 0.04,
        hop_size: 0.01,
        creak_threshold: 0.75,
        gender_model: 'all',
        zcr_threshold: 0.08,
        ste_threshold: 0.00001,
        audio_start: 0,
        audio_end: -1
    };
    localStorage.removeItem('creapySettings');
}

function loadSettingsFromStorage() {
    const saved = localStorage.getItem('creapySettings');
    if (saved) {
        currentSettings = { ...currentSettings, ...JSON.parse(saved) };
    }
}

// Load settings on page load
loadSettingsFromStorage();

analyzeBtn.addEventListener('click', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    // Add settings to form data
    Object.keys(currentSettings).forEach(key => {
        formData.append(key, currentSettings[key]);
    });
    
    loadingSpinner.style.display = 'block';
    resultsSection.style.display = 'none';
    errorMessage.style.display = 'none';
    
    try {
        const response = await fetch('/analyze', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        audioData = await response.json();
        displayResults();
        
    } catch (error) {
        console.error('Error:', error);
        errorMessage.textContent = 'Error analyzing audio: ' + error.message;
        errorMessage.style.display = 'block';
    } finally {
        loadingSpinner.style.display = 'none';
    }
});

function displayResults() {
    resultsSection.style.display = 'block';
    
    // Create audio blob from base64
    const audioBlob = base64ToBlob(audioData.audio_base64, 'audio/wav');
    const audioUrl = URL.createObjectURL(audioBlob);
    
    // Initialize WaveSurfer
    initializeWaveSurfer(audioUrl);
    
    // Plot creaky voice probability
    plotCreakProbability();
    
    // Set total time
    totalTimeDisplay.textContent = audioData.duration.toFixed(2) + 's';
}

function initializeWaveSurfer(audioUrl) {
    // Destroy existing instance if any
    if (wavesurfer) {
        wavesurfer.destroy();
    }
    
    // Create new WaveSurfer instance
    wavesurfer = window.WaveSurfer.create({
        container: '#waveform',
        waveColor: '#3498db',
        progressColor: '#2ecc71',
        cursorColor: '#e74c3c',
        barWidth: 2,
        barRadius: 3,
        responsive: true,
        height: 100,
        normalize: true,
        backend: 'WebAudio',
        mediaControls: false
    });
    
    // Load audio
    wavesurfer.load(audioUrl);
    
    // Set up event listeners
    wavesurfer.on('ready', () => {
        totalTimeDisplay.textContent = wavesurfer.getDuration().toFixed(2) + 's';
        playPauseBtn.disabled = false;
        
        // Add creaky voice overlay
        addCreakOverlay();
    });
    
    wavesurfer.on('audioprocess', updateTimeDisplay);
    wavesurfer.on('seek', updateTimeDisplay);
    
    wavesurfer.on('play', () => {
        playPauseBtn.textContent = '⏸️ Pause';
        startCreakVisualization();
    });
    
    wavesurfer.on('pause', () => {
        playPauseBtn.textContent = '▶️ Play';
        stopCreakVisualization();
    });
    
    wavesurfer.on('finish', () => {
        playPauseBtn.textContent = '▶️ Play';
        stopCreakVisualization();
    });
}

function addCreakOverlay() {
    // Add regions for high creaky voice probability
    const creakThreshold = currentSettings.creak_threshold;
    const hopSize = currentSettings.hop_size;
    
    let regionStart = null;
    
    for (let i = 0; i < audioData.creak_probability.probability.length; i++) {
        const prob = audioData.creak_probability.probability[i];
        const time = i * hopSize;
        
        if (prob > creakThreshold) {
            if (regionStart === null) {
                regionStart = time;
            }
        } else {
            if (regionStart !== null) {
                // End of creaky region
                addCreakRegion(regionStart, time, audioData.creak_probability.probability.slice(
                    Math.floor(regionStart / hopSize), i
                ).reduce((a, b) => a + b, 0) / (i - Math.floor(regionStart / hopSize)));
                regionStart = null;
            }
        }
    }
    
    // Handle case where file ends with creaky voice
    if (regionStart !== null) {
        const endTime = audioData.duration;
        addCreakRegion(regionStart, endTime, audioData.creak_probability.probability.slice(
            Math.floor(regionStart / hopSize)
        ).reduce((a, b) => a + b, 0) / (audioData.creak_probability.probability.length - Math.floor(regionStart / hopSize)));
    }
}

function addCreakRegion(start, end, avgProb) {
    // Create a visual indicator for creaky regions
    const waveformElement = document.getElementById('waveform');
    const duration = wavesurfer.getDuration();
    
    const regionDiv = document.createElement('div');
    regionDiv.style.position = 'absolute';
    regionDiv.style.top = '0';
    regionDiv.style.height = '100%';
    regionDiv.style.left = (start / duration * 100) + '%';
    regionDiv.style.width = ((end - start) / duration * 100) + '%';
    regionDiv.style.backgroundColor = `rgba(231, 76, 60, ${Math.min(avgProb, 1) * 0.3})`;
    regionDiv.style.pointerEvents = 'none';
    regionDiv.style.zIndex = '1';
    regionDiv.title = `Creaky voice probability: ${(avgProb * 100).toFixed(1)}%`;
    
    waveformElement.style.position = 'relative';
    waveformElement.appendChild(regionDiv);
}

function updateTimeDisplay() {
    if (wavesurfer) {
        currentTimeDisplay.textContent = wavesurfer.getCurrentTime().toFixed(2) + 's';
        
        // Update Plotly cursor
        updatePlotlyCursor(wavesurfer.getCurrentTime());
    }
}

function updatePlotlyCursor(currentTime) {
    const shapes = [{
        type: 'line',
        x0: currentTime,
        x1: currentTime,
        y0: 0,
        y1: 1,
        line: {
            color: '#2ecc71',
            width: 2,
            dash: 'solid'
        }
    }];
    
    Plotly.relayout('creakPlot', { shapes: shapes });
}


let animationId = null;

function startCreakVisualization() {
    function animate() {
        if (wavesurfer && wavesurfer.isPlaying()) {
            updateTimeDisplay();
            animationId = requestAnimationFrame(animate);
        }
    }
    animate();
}

function stopCreakVisualization() {
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
}

// Play/Pause button handler
playPauseBtn.addEventListener('click', () => {
    if (wavesurfer) {
        wavesurfer.playPause();
    }
});

function base64ToBlob(base64, mimeType) {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
}

function plotCreakProbability() {
    const creakThreshold = currentSettings.creak_threshold;
    
    const probabilityTrace = {
        x: audioData.creak_probability.time,
        y: audioData.creak_probability.probability,
        type: 'scatter',
        mode: 'lines',
        line: { color: '#e74c3c', width: 2 },
        name: 'Creak Probability',
        fill: 'tozeroy',
        fillcolor: 'rgba(231, 76, 60, 0.2)'
    };
    
    const thresholdTrace = {
        x: audioData.creak_probability.time,
        y: new Array(audioData.creak_probability.time.length).fill(creakThreshold),
        type: 'scatter',
        mode: 'lines',
        line: { color: '#95a5a6', width: 1, dash: 'dash' },
        name: `Threshold (${creakThreshold})`
    };
    
    const layout = {
        title: 'Creaky Voice Probability Over Time',
        xaxis: { 
            title: 'Time (seconds)',
            showgrid: true
        },
        yaxis: { 
            title: 'Probability',
            range: [0, 1],
            showgrid: true
        },
        height: 300,
        margin: { t: 50, r: 20, b: 50, l: 60 },
        shapes: [],
        showlegend: true
    };
    
    const config = {
        responsive: true,
        displayModeBar: false
    };
    
    Plotly.newPlot('creakPlot', [probabilityTrace, thresholdTrace], layout, config);
    
    // Add click handler to seek audio
    document.getElementById('creakPlot').addEventListener('click', (event) => {
        const plotElement = event.target.closest('.plotly');
        if (plotElement && wavesurfer) {
            const rect = plotElement.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const plotWidth = rect.width;
            const seekTime = (x / plotWidth) * audioData.duration;
            wavesurfer.seekTo(seekTime / audioData.duration);
        }
    });
}