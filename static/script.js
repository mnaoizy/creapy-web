let audioData = null;
let currentTimeMarker = null;

const fileInput = document.getElementById('fileInput');
const analyzeBtn = document.getElementById('analyzeBtn');
const loadingSpinner = document.getElementById('loadingSpinner');
const resultsSection = document.getElementById('results');
const errorMessage = document.getElementById('errorMessage');
const audioPlayer = document.getElementById('audioPlayer');
const currentTimeDisplay = document.getElementById('currentTime');

fileInput.addEventListener('change', (e) => {
    analyzeBtn.disabled = !e.target.files.length;
});

analyzeBtn.addEventListener('click', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
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
    
    const audioBlob = base64ToBlob(audioData.audio_base64, 'audio/wav');
    const audioUrl = URL.createObjectURL(audioBlob);
    audioPlayer.src = audioUrl;
    
    plotWaveform();
    plotCreakProbability();
    
    // Add smooth animation event listeners
    audioPlayer.addEventListener('play', startSmoothUpdates);
    audioPlayer.addEventListener('pause', stopSmoothUpdates);
    audioPlayer.addEventListener('ended', stopSmoothUpdates);
    audioPlayer.addEventListener('seeking', updateVisualization);
    audioPlayer.addEventListener('seeked', () => {
        updateVisualization();
        if (!audioPlayer.paused) {
            startSmoothUpdates();
        }
    });
}

function base64ToBlob(base64, mimeType) {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
}

function plotWaveform() {
    const trace = {
        x: audioData.waveform.time,
        y: audioData.waveform.amplitude,
        type: 'scatter',
        mode: 'lines',
        line: { color: '#3498db', width: 1 },
        name: 'Audio Waveform'
    };
    
    const layout = {
        title: 'Audio Waveform',
        xaxis: { title: 'Time (seconds)' },
        yaxis: { title: 'Amplitude' },
        showlegend: false,
        height: 300,
        margin: { t: 40, r: 20, b: 40, l: 60 }
    };
    
    Plotly.newPlot('waveformPlot', [trace], layout);
}

function plotCreakProbability() {
    const creakThreshold = 0.75;
    
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
        name: 'Threshold'
    };
    
    const layout = {
        title: 'Creaky Voice Probability',
        xaxis: { title: 'Time (seconds)' },
        yaxis: { 
            title: 'Probability',
            range: [0, 1]
        },
        height: 300,
        margin: { t: 40, r: 20, b: 40, l: 60 },
        shapes: []
    };
    
    Plotly.newPlot('creakPlot', [probabilityTrace, thresholdTrace], layout);
}

let animationId = null;
let isPlaying = false;

function updateVisualization() {
    const currentTime = audioPlayer.currentTime;
    currentTimeDisplay.textContent = currentTime.toFixed(2) + 's';
    
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
    
    Plotly.relayout('waveformPlot', {
        shapes: shapes.map(shape => ({
            ...shape,
            yref: 'paper'
        }))
    });
    
    Plotly.relayout('creakPlot', {
        shapes: shapes
    });
    
    const creakIndex = Math.floor(currentTime / 0.01);
    if (creakIndex < audioData.creak_probability.probability.length) {
        const creakProb = audioData.creak_probability.probability[creakIndex];
        if (creakProb > 0.75) {
            document.body.style.backgroundColor = `rgba(231, 76, 60, ${creakProb * 0.2})`;
        } else {
            document.body.style.backgroundColor = '#f5f5f5';
        }
    }
}

function smoothUpdateLoop() {
    if (isPlaying && !audioPlayer.paused) {
        updateVisualization();
        animationId = requestAnimationFrame(smoothUpdateLoop);
    }
}

function startSmoothUpdates() {
    isPlaying = true;
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    smoothUpdateLoop();
}

function stopSmoothUpdates() {
    isPlaying = false;
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
}