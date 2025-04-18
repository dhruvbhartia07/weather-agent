const { AzureOpenAI } = require("openai");
const dotenv = require("dotenv");

dotenv.config();

async function getWeather(city) {
  const url = `https://wttr.in/${city}?format=%C+%t`
  console.log(`⛏️: Weather tool called for ${city}, ${url}`)
  return fetch(url)
    .then(response => {
      // console.log(response)
      return response.text(); // parse the JSON from the response
    })

  return "35 Degree Celcius"
}

async function main() {
  // You will need to set these environment variables or edit the following values
  const endpoint = process.env["AZURE_OPENAI_ENDPOINT"];
  const apiKey = process.env["AZURE_OPENAI_API_KEY"]; // Use the API key directly
  const apiVersion = "2025-01-01-preview";
  const deployment = "gpt-4o"; // This must match your deployment name

  // Initialize the AzureOpenAI client with API key authentication
  const client = new AzureOpenAI({ endpoint, apiKey, apiVersion, deployment });

  const AVAILABLE_TOOLS = {
    "getWeather": {
      "fn": getWeather,
      "description": "Takes a city name as input and returns current weather of the city"
    }
  }

  const SYSTEM_PROMPT = `
  You are a helpful AI assistant that helps people find information.
  You work on start, plan, action, observe mode.
  For the given user query and available tools, plan the step by step execution.
  Based on the planning, select the relavent tool from the available tools.
  Based on the tool selection, you perform an action to call the tool.
  Wait for the observation and based on the observation from tool call, you will decide the next step or resolve the user query.

  Rules:
  - Follow the Output JSON format
  - Always perform one step at a time and wait for next input
  - Carefully analyse the user query

  Output JSON formet:
  {{
    "step": "string",
    "content": "string",
    "function": "name of the function if the step is action",
    "input": "the input parameter for the funtion",
  }}

  Available Tools:
  - getWeather: Takes a city name as input and returns current weather of the city

  Example:
  User: What is the weather of Delhi?
  Output: {{ "step": "plan", "content": "The user is interested in weather of Delhi." }}
  Output: {{ "step": "plan", "content": "From the available tools, I should call getWeather" }}
  Output: {{ "step": "action", "function": "getWeather", "input": "Delhi" }}
  Output: {{ "step": "observe", "output": "40 degree celcius" }}
  Output: {{ "step": "output", "content": "The weather of Delhi seems to be 40 degree celcius" }}
  `;
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: "What is the current weather of Singapore in Degree F?" },
  ]

  while(true) {
    const response = await client.chat.completions.create({
      messages: messages,
      max_tokens: 800,
      temperature: 0.7,
      top_p: 0.95,
      frequency_penalty: 0,
      presence_penalty: 0,
      stop: null,
      response_format: {"type": "json_object"},
    });

    parsedResponse = JSON.parse(response.choices[0].message.content);
    messages.push({"role": "assistant", "content": JSON.stringify(parsedResponse)});

    if(parsedResponse.step == "plan") {
      console.log(`🧠: ${parsedResponse.content}`)
      continue;
    }

    if(parsedResponse.step == "action") {
      const toolName = parsedResponse.function
      const input = parsedResponse.input

      if(AVAILABLE_TOOLS[toolName]) {
        const output = await AVAILABLE_TOOLS[toolName]["fn"](input)
        messages.push({ "role": "assistant", "content": JSON.stringify({"step": "observe", "output": output})})
      }
    }

    if(parsedResponse.step == "output") {
      console.log(`🤖: ${parsedResponse.content}`)
      break;
    }



  }
  

  // console.log(JSON.stringify(result.choices[0].message.content, null, 2));
}

main().catch((err) => {
  console.error("The sample encountered an error:", err);
});

// getWeather("delhi").then(op => console.log("Op is " , op) )


module.exports = { main };
