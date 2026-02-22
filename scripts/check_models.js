const apiKey = "AIzaSyAQtxZfdNlVSc3ls3ea5ZOa0lA1bxYG1aI";
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

async function listModels() {
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) {
        console.error("API Error:", data.error);
        return;
    }

    console.log("=== AVAILABLE MODELS ===");
    data.models.forEach(m => {
        if (m.supportedGenerationMethods.includes("generateContent")) {
            console.log(`ID: ${m.name.replace("models/", "")}`);
        }
    });
  } catch (error) {
    console.error("Network Error:", error);
  }
}

listModels();