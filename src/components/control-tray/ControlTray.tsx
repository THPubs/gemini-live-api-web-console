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
 * Button that controls interaction with Gemini
 */
type ControlTrayProps = {
  videoRef: RefObject<HTMLVideoElement>; // Reference to the video element
  onVideoStreamChange?: (stream: MediaStream | null) => void; // Callback when video stream changes
};

function ControlTray({
  videoRef,
  onVideoStreamChange = () => {},
}: ControlTrayProps) {
  // Hook to control webcam
  const webcam = useWebcam();
  
  // State for video stream
  const [activeVideoStream, setActiveVideoStream] = useState<MediaStream | null>(null);
  
  // State for audio volume
  const [inVolume, setInVolume] = useState(0);
  
  // Create audio recorder
  const [audioRecorder] = useState(() => new AudioRecorder());
  
  // Reference to canvas for processing video frames
  const renderCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // Reference to button for focus
  const talkButtonRef = useRef<HTMLButtonElement>(null);

  // Get Gemini API from context
  const { client, connected, connect, disconnect, volume } = useLiveAPIContext();

  // Focus button when not connected
  useEffect(() => {
    if (!connected && talkButtonRef.current) {
      talkButtonRef.current.focus();
    }
  }, [connected]);

  // Update volume visual effect
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--volume",
      `${Math.max(5, Math.min(inVolume * 200, 8))}px`
    );
  }, [inVolume]);

  // Handle audio recording and sending
  useEffect(() => {
    // Function to send audio to Gemini
    const sendAudio = (base64: string) => {
      client.sendRealtimeInput([
        {
          mimeType: "audio/pcm;rate=16000",
          data: base64,
        },
      ]);
    };
    
    // Start or stop recording based on connection state
    if (connected && audioRecorder) {
      audioRecorder.on("data", sendAudio).on("volume", setInVolume).start();
    } else {
      audioRecorder.stop();
    }
    
    // Clean up when component unmounts
    return () => {
      audioRecorder.off("data", sendAudio).off("volume", setInVolume);
    };
  }, [connected, client, audioRecorder]);

  // Handle video streaming
  useEffect(() => {
    // Connect video element to stream
    if (videoRef.current) {
      videoRef.current.srcObject = activeVideoStream;
    }

    let timeoutId = -1;

    // Function to capture and send video frames
    function sendVideoFrame() {
      const video = videoRef.current;
      const canvas = renderCanvasRef.current;

      if (!video || !canvas) {
        return;
      }

      // Resize video to 25% for efficiency
      const ctx = canvas.getContext("2d")!;
      canvas.width = video.videoWidth * 0.25;
      canvas.height = video.videoHeight * 0.25;
      
      if (canvas.width + canvas.height > 0) {
        // Draw frame to canvas
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        
        // Convert to JPEG and send to Gemini
        const base64 = canvas.toDataURL("image/jpeg", 1.0);
        const data = base64.slice(base64.indexOf(",") + 1, Infinity);
        client.sendRealtimeInput([{ mimeType: "image/jpeg", data }]);
      }
      
      // Schedule next frame (2 frames per second)
      if (connected) {
        timeoutId = window.setTimeout(sendVideoFrame, 1000 / 0.5);
      }
    }
    
    // Start sending frames when connected
    if (connected && activeVideoStream !== null) {
      requestAnimationFrame(sendVideoFrame);
    }
    
    // Clean up when component unmounts
    return () => {
      clearTimeout(timeoutId);
    };
  }, [connected, activeVideoStream, client, videoRef]);

  // Function to start or stop talking to Gemini
  const toggleGemini = async () => {
    if (connected) {
      // If connected, stop everything
      disconnect();
      webcam.stop();
      setActiveVideoStream(null);
      onVideoStreamChange(null);
    } else {
      // If not connected, start webcam and connect
      try {
        const mediaStream = await webcam.start();
        setActiveVideoStream(mediaStream);
        onVideoStreamChange(mediaStream);
        await connect();
      } catch (error) {
        console.error("Failed to start webcam or connect to Gemini", error);
      }
    }
  };

  return (
    <section className="control-tray">
      {/* Hidden canvas for processing video */}
      <canvas style={{ display: "none" }} ref={renderCanvasRef} />
      
      <div className="talk-button-container">
        {/* Main button */}
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
        
        {/* Audio indicator (only shown when connected) */}
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
