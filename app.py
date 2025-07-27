from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import librosa
import creapy
import tempfile
import os
from typing import List, Dict
import base64

# Initialize creapy configuration
try:
    creapy.set_config()
except:
    pass

app = FastAPI(title="Creaky Voice Detector")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/analyze")
async def analyze_audio(file: UploadFile = File(...)):
    if not file.filename.lower().endswith('.wav'):
        raise HTTPException(status_code=400, detail="Only WAV files are supported")
    
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as tmp_audio:
            content = await file.read()
            tmp_audio.write(content)
            tmp_audio_path = tmp_audio.name
        
        audio_data, sr = librosa.load(tmp_audio_path, sr=None)
        
        duration = len(audio_data) / sr
        with tempfile.NamedTemporaryFile(delete=False, suffix='.TextGrid') as tmp_textgrid:
            tmp_textgrid_path = tmp_textgrid.name
            with open(tmp_textgrid_path, 'w') as f:
                f.write('File type = "ooTextFile"\n')
                f.write('Object class = "TextGrid"\n\n')
                f.write(f'xmin = 0\n')
                f.write(f'xmax = {duration}\n')
                f.write('tiers? <exists>\n')
                f.write('size = 1\n')
                f.write('item []:\n')
                f.write('    item [1]:\n')
                f.write('        class = "IntervalTier"\n')
                f.write('        name = "default"\n')
                f.write(f'        xmin = 0\n')
                f.write(f'        xmax = {duration}\n')
                f.write('        intervals: size = 1\n')
                f.write('        intervals [1]:\n')
                f.write('            xmin = 0\n')
                f.write(f'            xmax = {duration}\n')
                f.write('            text = ""\n')
        
        X_test, y_pred, sr_creapy = creapy.process_file(
            audio_path=tmp_audio_path,
            textgrid_path=tmp_textgrid_path,
            gender_model='all'
        )
        
        time_vector = np.arange(len(y_pred)) * 0.01
        
        audio_data_normalized = audio_data / np.max(np.abs(audio_data))
        
        duration = len(audio_data) / sr
        waveform_samples = min(1000, len(audio_data))
        step = len(audio_data) // waveform_samples
        waveform_data = audio_data_normalized[::step].tolist()
        waveform_time = np.arange(0, len(audio_data), step) / sr
        
        result = {
            "duration": duration,
            "sample_rate": int(sr),
            "creak_probability": {
                "time": time_vector.tolist(),
                "probability": y_pred.tolist()
            },
            "waveform": {
                "time": waveform_time.tolist(),
                "amplitude": waveform_data
            },
            "audio_base64": base64.b64encode(content).decode('utf-8')
        }
        
        os.unlink(tmp_audio_path)
        os.unlink(tmp_textgrid_path)
        
        return JSONResponse(content=result)
        
    except Exception as e:
        import traceback
        error_detail = f"Error: {str(e)}\n\nTraceback:\n{traceback.format_exc()}"
        print(error_detail)
        
        if 'tmp_audio_path' in locals() and os.path.exists(tmp_audio_path):
            os.unlink(tmp_audio_path)
        if 'tmp_textgrid_path' in locals() and os.path.exists(tmp_textgrid_path):
            os.unlink(tmp_textgrid_path)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/", response_class=HTMLResponse)
async def read_root():
    with open("static/index.html", "r") as f:
        return f.read()

app.mount("/static", StaticFiles(directory="static"), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)