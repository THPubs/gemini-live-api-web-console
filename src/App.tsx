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

/**
 * Main App component
 */
import { useRef, useState } from "react";
import "./App.scss";
import { LiveAPIProvider } from "./contexts/LiveAPIContext";
import { Altair } from "./components/altair/Altair";
import ControlTray from "./components/control-tray/ControlTray";
import { LiveClientOptions } from "./types";

// Get API key from environment variables
const API_KEY = process.env.REACT_APP_GEMINI_API_KEY as string;
if (!API_KEY) {
  throw new Error("Missing REACT_APP_GEMINI_API_KEY in .env file");
}

// Configuration for Gemini API
const apiOptions = {
  apiKey: API_KEY,
};

function App() {
  // Reference to video element (hidden but functional)
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // State to track webcam stream
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);

  return (
    <div className="App">
      {/* Provide Gemini API to all child components */}
      <LiveAPIProvider options={apiOptions}>
        <div className="streaming-console">
          <main>
            <div className="main-app-area">
              {/* Display area for Gemini responses and charts */}
              <Altair />
              
              {/* Hidden video element that captures webcam */}
              <video
                style={{ display: "none" }}
                ref={videoRef}
                autoPlay
                playsInline
              />
            </div>

            {/* Button to start/stop talking to Gemini */}
            <ControlTray
              videoRef={videoRef}
              onVideoStreamChange={setVideoStream}
            />
          </main>
        </div>
      </LiveAPIProvider>
    </div>
  );
}

export default App;
