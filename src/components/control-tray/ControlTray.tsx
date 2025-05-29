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

import cn from "classnames";
import { memo, RefObject, useEffect, useRef, useState } from "react";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { useWebcam } from "../../hooks/use-webcam";
import { AudioRecorder } from "../../lib/audio-recorder";
import AudioPulse from "../audio-pulse/AudioPulse";
import "./control-tray.scss";

/**
 * Props for the ControlTray component
 * @property {RefObject<HTMLVideoElement>} videoRef - Reference to the video element for displaying webcam feed
 * @property {Function} onVideoStreamChange - Callback for when the video stream changes
 */
export type ControlTrayProps = {
  videoRef: RefObject<HTMLVideoElement>;
  onVideoStreamChange?: (stream: MediaStream | null) => void;
};

/**
 * ControlTray component is responsible for controlling the interaction with Gemini AI.
 * It handles starting/stopping the webcam and microphone, and connects/disconnects from the Gemini API.
 * 
 * Key functionalities:
 * 1. Starting/stopping the webcam
 * 2. Recording and sending audio to Gemini
 * 3. Capturing and sending video frames to Gemini
 * 4. Providing the main user interaction button
 */
function ControlTray({
  videoRef,
  onVideoStreamChange = () => {},
}: ControlTrayProps) {
  // Custom hook to control webcam
  const webcam = useWebcam();
  
  // State to track the active video stream
  const [activeVideoStream, setActiveVideoStream] = useState<MediaStream | null>(null);
  
  // Track the volume level of the microphone input
  const [inVolume, setInVolume] = useState(0);
  
  // Create an audio recorder instance to handle microphone input
  const [audioRecorder] = useState(() => new AudioRecorder());
  
  // Reference to the canvas used for processing video frames
  const renderCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // Reference to the main button for accessibility focus
  const talkButtonRef = useRef<HTMLButtonElement>(null);

  // Get the Gemini API client and state from context
  const { client, connected, connect, disconnect, volume } = useLiveAPIContext();

  // Focus the talk button when not connected for better accessibility
  useEffect(() => {
    if (!connected && talkButtonRef.current) {
      talkButtonRef.current.focus();
    }
  }, [connected]);

  // Update the visual volume indicator based on microphone input
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--volume",
      `${Math.max(5, Math.min(inVolume * 200, 8))}px`
    );
  }, [inVolume]);

  // Handle audio recording and sending to Gemini
  useEffect(() => {
    /**
     * Callback for when audio data is available from the microphone
     * Converts the audio data to base64 and sends it to Gemini
     */
    const onData = (base64: string) => {
      client.sendRealtimeInput([
        {
          mimeType: "audio/pcm;rate=16000",
          data: base64,
        },
      ]);
    };
    
    // Start or stop the audio recorder based on connection state
    if (connected && audioRecorder) {
      // When connected, start recording and register event handlers
      audioRecorder.on("data", onData).on("volume", setInVolume).start();
    } else {
      // When disconnected, stop recording
      audioRecorder.stop();
    }
    
    // Clean up event handlers when component unmounts
    return () => {
      audioRecorder.off("data", onData).off("volume", setInVolume);
    };
  }, [connected, client, audioRecorder]);

  // Handle video streaming and sending to Gemini
  useEffect(() => {
    // Set the video element's source to the active stream
    if (videoRef.current) {
      videoRef.current.srcObject = activeVideoStream;
    }

    let timeoutId = -1;

    /**
     * Captures video frames from the webcam, processes them, and sends them to Gemini
     * This function uses a canvas to resize the image before sending
     */
    function sendVideoFrame() {
      const video = videoRef.current;
      const canvas = renderCanvasRef.current;

      if (!video || !canvas) {
        return;
      }

      // Resize the canvas to match video dimensions (at 25% scale to reduce data size)
      const ctx = canvas.getContext("2d")!;
      canvas.width = video.videoWidth * 0.25;
      canvas.height = video.videoHeight * 0.25;
      
      if (canvas.width + canvas.height > 0) {
        // Draw the video frame onto the canvas at the reduced size
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        
        // Convert the canvas to a JPEG data URL and extract the base64 data
        const base64 = canvas.toDataURL("image/jpeg", 1.0);
        const data = base64.slice(base64.indexOf(",") + 1, Infinity);
        
        // Send the frame to Gemini
        client.sendRealtimeInput([{ mimeType: "image/jpeg", data }]);
      }
      
      // Schedule the next frame capture if still connected (2 frames per second)
      if (connected) {
        timeoutId = window.setTimeout(sendVideoFrame, 1000 / 0.5);
      }
    }
    
    // Start capturing frames when connected and a stream is available
    if (connected && activeVideoStream !== null) {
      requestAnimationFrame(sendVideoFrame);
    }
    
    // Clean up timeout when component unmounts or dependencies change
    return () => {
      clearTimeout(timeoutId);
    };
  }, [connected, activeVideoStream, client, videoRef]);

  /**
   * Handles starting or stopping the Gemini conversation
   * When starting: 
   * 1. Activates the webcam
   * 2. Connects to Gemini API
   * When stopping:
   * 1. Disconnects from Gemini API
   * 2. Stops the webcam
   */
  const toggleGemini = async () => {
    if (connected) {
      // Stop talking to Gemini
      disconnect();
      webcam.stop();
      setActiveVideoStream(null);
      onVideoStreamChange(null);
    } else {
      // Start talking to Gemini
      try {
        // First start webcam
        const mediaStream = await webcam.start();
        setActiveVideoStream(mediaStream);
        onVideoStreamChange(mediaStream);
        
        // Then connect to Gemini
        await connect();
      } catch (error) {
        console.error("Failed to start webcam or connect to Gemini", error);
      }
    }
  };

  return (
    <section className="control-tray">
      {/* Hidden canvas used for processing video frames */}
      <canvas style={{ display: "none" }} ref={renderCanvasRef} />
      
      <div className="talk-button-container">
        {/* Main button for starting/stopping interaction with Gemini */}
        <button
          ref={talkButtonRef}
          className={cn("talk-button", { connected })}
          onClick={toggleGemini}
          aria-label={connected ? "Stop talking to Gemini" : "Start talking to Gemini"}
        >
          <span className="material-symbols-outlined filled">
            {connected ? "stop_circle" : "smart_toy"}
          </span>
          <span className="button-text">
            {connected ? "Stop" : "Talk to Gemini"}
          </span>
        </button>
        
        {/* Audio indicator that shows when Gemini is responding */}
        {connected && (
          <div className="audio-indicator">
            <AudioPulse volume={volume} active={connected} hover={false} />
          </div>
        )}
      </div>
    </section>
  );
}

export default memo(ControlTray);
