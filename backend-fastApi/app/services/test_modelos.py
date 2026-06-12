import os
from dotenv import load_dotenv
from google import genai

load_dotenv(".env")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise ValueError("Falta GEMINI_API_KEY en el archivo .env_docker")

client = genai.Client(api_key=GEMINI_API_KEY)

print("🔍 Buscando modelos disponibles para tu API Key...\n")

for model in client.models.list():
    print(f"✅ Modelo disponible: {model.name}")