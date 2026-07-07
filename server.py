import os
import io
import requests
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from agent import ResearchAgent

app = FastAPI(title="Personal Researcher API", version="1.0.0")

# Setup paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")

# Create static directory if it doesn't exist
os.makedirs(STATIC_DIR, exist_ok=True)

# Define request schemas
class ResearchRequest(BaseModel):
    topic: str
    apiKey: Optional[str] = None

# API endpoint to execute the research agent
@app.post("/api/research")
async def do_research(request: ResearchRequest):
    topic = request.topic.strip()
    if not topic:
        raise HTTPException(status_code=400, detail="Research topic cannot be empty.")
        
    try:
        agent = ResearchAgent()
        result = agent.run_research(topic, api_key=request.apiKey)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred during research execution: {str(e)}")

# Define TTS request schema
class TTSRequest(BaseModel):
    text: str
    apiKey: str
    voiceId: str = "21m00Tcm4TlvDq8ikWAM"

# API endpoint to proxy ElevenLabs Text-to-Speech
@app.post("/api/tts")
async def do_tts(request: TTSRequest):
    text = request.text.strip()
    api_key = request.apiKey.strip()
    voice_id = request.voiceId.strip()
    
    if not text:
        raise HTTPException(status_code=400, detail="Text cannot be empty.")
    if not api_key:
        raise HTTPException(status_code=400, detail="ElevenLabs API Key is required.")
        
    # Cap reading at 1200 characters for optimal speed/credits
    text_capped = text[:1200]
    
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    headers = {
        "xi-api-key": api_key,
        "Content-Type": "application/json"
    }
    payload = {
        "text": text_capped,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.75
        }
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=25)
        if response.status_code == 200:
            return StreamingResponse(io.BytesIO(response.content), media_type="audio/mpeg")
        else:
            try:
                err_msg = response.json().get("detail", {}).get("message", response.text)
            except Exception:
                err_msg = response.text
            raise HTTPException(status_code=response.status_code, detail=f"ElevenLabs API Error: {err_msg}")
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Failed to communicate with ElevenLabs: {str(e)}")

# Mount static files middleware (for CSS/JS/images)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# Serve the main index.html for root path
@app.get("/")
async def get_index():
    index_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "Welcome to Personal Researcher API. Frontend static files not found yet."}
