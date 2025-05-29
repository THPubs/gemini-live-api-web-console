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

// Define a function that Gemini can call to create charts
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
 * Main display area for Gemini responses and charts
 */
function AltairComponent() {
  // State to store chart data
  const [jsonString, setJSONString] = useState<string>("");
  
  // Get Gemini API from context
  const { client, setConfig, setModel, connected } = useLiveAPIContext();

  // Configure Gemini when component loads
  useEffect(() => {
    // Set model version
    setModel("models/gemini-2.0-flash-exp");
    
    // Configure Gemini's behavior
    setConfig({
      // Enable voice responses
      responseModalities: [Modality.AUDIO],
      
      // Set voice settings
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } },
      },
      
      // Set instructions for Gemini
      systemInstruction: {
        parts: [
          {
            text: 'You are a helpful AI assistant that can see and hear the user. Respond to their questions and requests naturally using both audio and visual information. If they ask for a graph, call the "render_altair" function.',
          },
        ],
      },
      
      // Enable tools
      tools: [
        { googleSearch: {} }, // Allow web search
        { functionDeclarations: [declaration] }, // Allow chart creation
      ],
    });
  }, [setConfig, setModel]);

  // Handle function calls from Gemini
  useEffect(() => {
    // Function to process tool calls
    const onToolCall = (toolCall: LiveServerToolCall) => {
      // Skip if no function calls
      if (!toolCall.functionCalls) {
        return;
      }
      
      // Look for our render_altair function
      const fc = toolCall.functionCalls.find(
        (fc) => fc.name === declaration.name
      );
      
      // If found, get the chart data
      if (fc) {
        const str = (fc.args as any).json_graph;
        setJSONString(str);
      }
      
      // Send response back to Gemini
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
    
    // Listen for tool calls
    client.on("toolcall", onToolCall);
    
    // Cleanup when unmounting
    return () => {
      client.off("toolcall", onToolCall);
    };
  }, [client]);

  // Reference to the div where charts will be displayed
  const embedRef = useRef<HTMLDivElement>(null);

  // Render the chart when data changes
  useEffect(() => {
    if (embedRef.current && jsonString) {
      console.log("jsonString", jsonString);
      vegaEmbed(embedRef.current, JSON.parse(jsonString));
    }
  }, [embedRef, jsonString]);

  return (
    <div className="altair-container">
      {/* Area for displaying charts */}
      <div className="vega-embed" ref={embedRef} />
      
      {/* Welcome message (shown when no chart is displayed) */}
      {!jsonString && (
        <div className="welcome-message">
          <h1>Gemini AI Assistant</h1>
          <p>
            {connected 
              ? "I can see and hear you now. Ask me anything!" 
              : "Click the button below to start talking with me."}
          </p>
          
          {/* Listening indicator */}
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

// Use memo to prevent unnecessary re-renders
export const Altair = memo(AltairComponent);
