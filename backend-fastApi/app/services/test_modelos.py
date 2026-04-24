import os
import google.generativeai as genai

# Pon tu API KEY real aquí
GEMINI_API_KEY ="HYI"
genai.configure(api_key=GEMINI_API_KEY)

print("🔍 Buscando modelos disponibles para tu API Key...\n")

for m in genai.list_models():
    if 'generateContent' in m.supported_generation_methods:
        print(f"✅ Modelo válido: {m.name}")