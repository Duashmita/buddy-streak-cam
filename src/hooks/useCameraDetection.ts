import { useState, useRef, useCallback, useEffect } from 'react';

export interface DetectionState {
  isActive: boolean;
  isLoading: boolean;
  isDetecting: boolean;
  motionLevel: number;
  error: string | null;
}

export const useCameraDetection = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const prevFrameRef = useRef<ImageData | null>(null);
  
  const [state, setState] = useState<DetectionState>({
    isActive: false,
    isLoading: false,
    isDetecting: false,
    motionLevel: 0,
    error: null,
  });

  const [motionHistory, setMotionHistory] = useState<number[]>([]);

  const startCamera = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setState(prev => ({
        ...prev,
        isActive: true,
        isLoading: false,
      }));

      return true;
    } catch (error: any) {
      console.error('Failed to start camera:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to access camera',
      }));
      return false;
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    prevFrameRef.current = null;

    setState({
      isActive: false,
      isLoading: false,
      isDetecting: false,
      motionLevel: 0,
      error: null,
    });
  }, []);

  const detectMotion = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return 0;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    if (!ctx || video.readyState !== 4) return 0;

    // Set canvas size to match video
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    // Draw current frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Get current frame data
    const currentFrame = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    let motionScore = 0;

    if (prevFrameRef.current) {
      const prev = prevFrameRef.current.data;
      const curr = currentFrame.data;
      let diffPixels = 0;
      
      // Compare pixels (sample every 4th pixel for performance)
      for (let i = 0; i < curr.length; i += 16) {
        const rDiff = Math.abs(curr[i] - prev[i]);
        const gDiff = Math.abs(curr[i + 1] - prev[i + 1]);
        const bDiff = Math.abs(curr[i + 2] - prev[i + 2]);
        
        // If significant change in any channel
        if (rDiff > 30 || gDiff > 30 || bDiff > 30) {
          diffPixels++;
        }
      }
      
      // Calculate motion as percentage of changed pixels
      const totalSamples = curr.length / 16;
      motionScore = (diffPixels / totalSamples) * 100;

      // Draw motion visualization overlay
      if (motionScore > 5) {
        ctx.fillStyle = `rgba(0, 212, 170, ${Math.min(motionScore / 50, 0.3)})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw motion indicator border
        ctx.strokeStyle = `rgba(168, 85, 247, ${Math.min(motionScore / 30, 0.8)})`;
        ctx.lineWidth = 4;
        ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
      }
    }

    prevFrameRef.current = currentFrame;
    return motionScore;
  }, []);

  const startDetection = useCallback(() => {
    const detect = () => {
      const motion = detectMotion();
      
      setState(prev => ({
        ...prev,
        isDetecting: true,
        motionLevel: motion,
      }));

      setMotionHistory(prev => {
        const newHistory = [...prev, motion].slice(-30);
        return newHistory;
      });

      animationRef.current = requestAnimationFrame(detect);
    };
    
    detect();
  }, [detectMotion]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    videoRef,
    canvasRef,
    state,
    motionHistory,
    startCamera,
    stopCamera,
    startDetection,
  };
};
