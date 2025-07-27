# Creaky Voice Detector Web App

A web application for analyzing and visualizing creaky voice patterns in audio files using the creapy library.

## Features

- Upload WAV audio files for analysis
- Real-time visualization of audio waveform
- Time-synchronized creaky voice probability display
- Interactive audio playback with visual feedback
- Highlights regions with high creaky voice probability

## Setup

### Prerequisites

- Python 3.10 or higher
- Git

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd creapy-web
```

2. Install dependencies:
```bash
# Option 1: Use the install script
./install.sh

# Option 2: Manual installation
pip install -r requirements.txt
pip install git+https://gitlab.tugraz.at/speech/creapy.git
```

3. Run the application:
```bash
python app.py
```

4. Open your browser and navigate to `http://localhost:8000`

## Usage

1. Click "Choose File" and select a WAV audio file
2. Click "Analyze Audio" to process the file
3. The app will display:
   - Audio player with playback controls
   - Waveform visualization
   - Creaky voice probability graph
4. During playback:
   - A green line shows current playback position
   - Background color changes when creaky voice is detected
   - Current time is displayed below the audio player

## Deployment Options

### Render.com (Recommended - Free tier available)

1. Fork this repository to your GitHub account
2. Sign up for [Render.com](https://render.com)
3. Create a new Web Service
4. Connect your GitHub repository
5. Render will automatically detect the configuration

### Fly.io (Alternative - Free tier with credit card)

1. Install Fly CLI: https://fly.io/docs/hands-on/install-flyctl/
2. Run:
```bash
fly launch
fly deploy
```

### Railway (Alternative)

Create a `railway.json`:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "numReplicas": 1,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

## Technical Details

- **Backend**: FastAPI (Python)
- **Frontend**: Vanilla JavaScript with Plotly.js for visualizations
- **Audio Processing**: creapy library
- **Audio Loading**: librosa
- **Deployment**: Docker-based for portability

## API Endpoints

- `GET /` - Serve the web interface
- `POST /analyze` - Upload and analyze audio file
  - Input: WAV file (multipart/form-data)
  - Output: JSON with waveform data, creak probability, and audio base64

## Configuration

The creapy analysis uses the following default parameters:
- Model: `all` (suitable for all genders)
- Block size: 0.04 seconds
- Hop size: 0.01 seconds
- Creak threshold: 0.75

These can be modified in `app.py` if needed.