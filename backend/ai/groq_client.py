# backend/ai/groq_client.py
# Core module for all Groq LLM calls in MindProtocol

import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

# Initialize the Groq client once — reused across all calls
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

MODEL = "llama-3.3-70b-versatile"


def call_groq(system_prompt: str, user_message: str, temperature: float = 0.7) -> str:
    """
    Send a message to Groq and return the text response.
    
    Args:
        system_prompt: Instructions that control how the LLM behaves
        user_message: The actual content/data to process
        temperature: 0.0 = focused/consistent, 1.0 = creative/varied
    
    Returns:
        The LLM's response as a plain string
    """
    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            temperature=temperature,
            max_tokens=1000
        )
        return response.choices[0].message.content
    
    except Exception as e:
        raise Exception(f"Groq API call failed: {str(e)}")