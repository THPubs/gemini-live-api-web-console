/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { useEffect, useRef, useState, memo } from "react";
import vegaEmbed from "vega-embed";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import {
  FunctionDeclaration,
  LiveServerToolCall,
  Modality,
  Type,
} from "@google/genai";
import "./altair.scss";

/**
 * Function declaration for Gemini AI to render charts/graphs
 * This defines the structure of the function that Gemini can call
 * to display visual data in the application
 */
const declaration: FunctionDeclaration = {
  name: "render_altair",
  description: "Displays an altair graph in json format.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      json_graph: {
        type: Type.STRING,
        description:
          "JSON STRING representation of the graph to render. Must be a string, not a json object",
      },
    },
    required: ["json_graph"],
  },
};

/**
 * Altair component is responsible for:
 * 1. Configuring the Gemini AI model with appropriate settings
 * 2. Handling function calls from Gemini to render charts
 * 3. Displaying the welcome UI and the visualization area
 * 4. Providing visual feedback about the connection state
 */
function AltairComponent() {
  // State to store the JSON string for the chart to render
  const [jsonString, setJSONString] = useState<string>("");
  
  // Get Gemini API client and configuration functions from context
  const { client, setConfig, setModel, connected } = useLiveAPIContext();

  // Configure the Gemini AI model and behavior on component mount
  useEffect(() => {
    // Set the model to use (Gemini 2.0 Flash Experimental)
    setModel("models/gemini-2.0-flash-exp");
    
    // Configure model settings
    setConfig({
      // Enable audio response from Gemini
      responseModalities: [Modality.AUDIO],
      
      // Configure the voice settings
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } },
      },
      
      // Set the system instruction (prompt) to define Gemini's behavior
      systemInstruction: {
        parts: [
          {
            text: 'You are a helpful AI assistant that can see and hear the user. Respond to their questions and requests naturally using both audio and visual information. If they ask for a graph, call the "render_altair" function.',
          },
        ],
      },
      
      // Enable tools for Gemini to use
      tools: [
        // Google Search provides up-to-date information
        { googleSearch: {} },
        
        // Function declarations allow Gemini to call our render_altair function
        { functionDeclarations: [declaration] },
      ],
    });
  }, [setConfig, setModel]);

  // Handle function calls from Gemini
  useEffect(() => {
    /**
     * Handler for tool calls from Gemini
     * Specifically handles when Gemini wants to render a chart
     * @param {LiveServerToolCall} toolCall - The tool call from Gemini
     */
    const onToolCall = (toolCall: LiveServerToolCall) => {
      // Skip if no function calls in the tool call
      if (!toolCall.functionCalls) {
        return;
      }
      
      // Find the render_altair function call if it exists
      const fc = toolCall.functionCalls.find(
        (fc) => fc.name === declaration.name
      );
      
      // If the render_altair function was called, extract the JSON data
      if (fc) {
        const str = (fc.args as any).json_graph;
        setJSONString(str);
      }
      
      // Send a response back to Gemini for each function call
      if (toolCall.functionCalls.length) {
        setTimeout(
          () =>
            client.sendToolResponse({
              functionResponses: toolCall.functionCalls?.map((fc) => ({
                response: { output: { success: true } },
                id: fc.id,
                name: fc.name,
              })),
            }),
          200
        );
      }
    };
    
    // Register the tool call handler
    client.on("toolcall", onToolCall);
    
    // Clean up event handler when component unmounts
    return () => {
      client.off("toolcall", onToolCall);
    };
  }, [client]);

  // Reference to the div where the chart will be rendered
  const embedRef = useRef<HTMLDivElement>(null);

  // Render the chart when jsonString changes
  useEffect(() => {
    if (embedRef.current && jsonString) {
      console.log("jsonString", jsonString);
      // Use vega-embed to render the chart
      vegaEmbed(embedRef.current, JSON.parse(jsonString));
    }
  }, [embedRef, jsonString]);

  return (
    <div className="altair-container">
      {/* Area where charts will be rendered */}
      <div className="vega-embed" ref={embedRef} />
      
      {/* Welcome message when no chart is displayed */}
      {!jsonString && (
        <div className="welcome-message">
          <h1>Gemini AI Assistant</h1>
          <p>
            {connected 
              ? "I can see and hear you now. Ask me anything!" 
              : "Click the button below to start talking with me."}
          </p>
          
          {/* Visual indicator that Gemini is listening */}
          {connected && (
            <div className="listening-indicator">
              <div className="pulse"></div>
              <p>Listening...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Memoize the component to prevent unnecessary re-renders
export const Altair = memo(AltairComponent);
