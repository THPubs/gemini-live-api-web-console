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

import { useRef, useState } from "react";
import "./App.scss";
import { LiveAPIProvider } from "./contexts/LiveAPIContext";
import { Altair } from "./components/altair/Altair";
import ControlTray from "./components/control-tray/ControlTray";
import { LiveClientOptions } from "./types";

// API key is loaded from environment variables
// Make sure you have a .env file with REACT_APP_GEMINI_API_KEY set
const API_KEY = process.env.REACT_APP_GEMINI_API_KEY as string;
if (typeof API_KEY !== "string") {
  throw new Error("set REACT_APP_GEMINI_API_KEY in .env");
}

// Configure the Gemini API client options
const apiOptions: LiveClientOptions = {
  apiKey: API_KEY,
};

function App() {
  // Create a reference to the video element that will capture video from the webcam
  // This element is hidden from view, but still functional for capturing video frames
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Track the media stream from the webcam
  // This state is passed to child components to maintain a single source of truth
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);

  return (
    <div className="App">
      {/* 
        LiveAPIProvider sets up the context for the Gemini API client
        All child components can access the API client through the context
      */}
      <LiveAPIProvider options={apiOptions}>
        <div className="streaming-console">
          <main>
            <div className="main-app-area">
              {/* 
                Altair component handles:
                1. Setting up the Gemini AI configuration
                2. Displaying the welcome UI and response area
                3. Rendering charts when requested
              */}
              <Altair />
              
              {/* 
                Video element is hidden but still functional
                It captures the webcam feed and sends frames to Gemini
                The style attribute hides it from view without disabling functionality
              */}
              <video
                style={{ display: "none" }}
                ref={videoRef}
                autoPlay
                playsInline
              />
            </div>

            {/* 
              ControlTray component handles:
              1. The main user interaction button
              2. Starting/stopping the webcam
              3. Connecting/disconnecting from Gemini
              4. Processing and sending audio/video to Gemini
            */}
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
