import { useState, useRef, useCallback, useEffect } from 'react';

export interface DetectionState {
  isActive: boolean;
  isLoading: boolean;
  isDetecting: boolean;
  motionLevel: number;
  matchScore: number;
  error: string | null;
}

export interface CalibrationData {
  frames: string[];
  avgColor: { r: number; g: number; b: number };
  motionSignature: number[];
}

export const useCameraDetection = (referenceFrames?: string[]) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const prevFrameRef = useRef<ImageData | null>(null);
  const referenceDataRef = useRef<CalibrationData | null>(null);
  
  const [state, setState] = useState<DetectionState>({
    isActive: false,
    isLoading: false,
    isDetecting: false,
    motionLevel: 0,
    matchScore: 0,
    error: null,
  });

  const [motionHistory, setMotionHistory] = useState<number[]>([]);

  // Process reference frames on mount
  useEffect(() => {
    if (referenceFrames && referenceFrames.length > 0) {
      processReferenceFrames(referenceFrames);
    }
  }, [referenceFrames]);

  const processReferenceFrames = async (frames: string[]) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let totalR = 0, totalG = 0, totalB = 0;
    let pixelCount = 0;
    const motionSig: number[] = [];

    for (const frame of frames) {
      const img = new Image();
      await new Promise<void>((resolve) => {
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          // Calculate average color
          for (let i = 0; i < data.length; i += 4) {
            totalR += data[i];
            totalG += data[i + 1];
            totalB += data[i + 2];
            pixelCount++;
          }
          
          // Calculate motion signature (histogram of pixel intensities)
          const histogram = new Array(16).fill(0);
          for (let i = 0; i < data.length; i += 4) {
            const intensity = (data[i] + data[i + 1] + data[i + 2]) / 3;
            const bin = Math.floor(intensity / 16);
            histogram[Math.min(bin, 15)]++;
          }
          motionSig.push(...histogram);
          
          resolve();
        };
        img.src = frame;
      });
    }

    referenceDataRef.current = {
      frames,
      avgColor: {
        r: totalR / pixelCount,
        g: totalG / pixelCount,
        b: totalB / pixelCount,
      },
      motionSignature: motionSig,
    };
  };

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
      matchScore: 0,
      error: null,
    });
  }, []);

  const captureFrame = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx || video.readyState !== 4) return null;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    return canvas.toDataURL('image/jpeg', 0.5);
  }, []);

  const calculateMatchScore = useCallback((currentFrame: ImageData): number => {
    if (!referenceDataRef.current) return 0;

    const ref = referenceDataRef.current;
    const data = currentFrame.data;

    // Calculate current frame's average color
    let totalR = 0, totalG = 0, totalB = 0;
    for (let i = 0; i < data.length; i += 16) {
      totalR += data[i];
      totalG += data[i + 1];
      totalB += data[i + 2];
    }
    const pixelCount = data.length / 16;
    const avgR = totalR / pixelCount;
    const avgG = totalG / pixelCount;
    const avgB = totalB / pixelCount;

    // Color similarity (0-100)
    const colorDist = Math.sqrt(
      Math.pow(avgR - ref.avgColor.r, 2) +
      Math.pow(avgG - ref.avgColor.g, 2) +
      Math.pow(avgB - ref.avgColor.b, 2)
    );
    const colorScore = Math.max(0, 100 - colorDist / 4.4);

    // Calculate current histogram
    const histogram = new Array(16).fill(0);
    for (let i = 0; i < data.length; i += 4) {
      const intensity = (data[i] + data[i + 1] + data[i + 2]) / 3;
      const bin = Math.floor(intensity / 16);
      histogram[Math.min(bin, 15)]++;
    }

    // Histogram similarity
    const refHistogram = ref.motionSignature.slice(0, 16);
    let histSim = 0;
    const maxHist = Math.max(...histogram, ...refHistogram);
    if (maxHist > 0) {
      for (let i = 0; i < 16; i++) {
        histSim += Math.min(histogram[i], refHistogram[i] || 0);
      }
      histSim = (histSim / (data.length / 4)) * 100;
    }

    // Combined score
    return (colorScore * 0.4 + histSim * 0.6);
  }, []);

  const detectMotion = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return { motion: 0, match: 0 };
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    if (!ctx || video.readyState !== 4) return { motion: 0, match: 0 };

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const currentFrame = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    let motionScore = 0;
    let matchScore = 0;

    // Calculate match score against reference
    if (referenceDataRef.current) {
      matchScore = calculateMatchScore(currentFrame);
    }

    if (prevFrameRef.current) {
      const prev = prevFrameRef.current.data;
      const curr = currentFrame.data;
      let diffPixels = 0;
      
      for (let i = 0; i < curr.length; i += 16) {
        const rDiff = Math.abs(curr[i] - prev[i]);
        const gDiff = Math.abs(curr[i + 1] - prev[i + 1]);
        const bDiff = Math.abs(curr[i + 2] - prev[i + 2]);
        
        if (rDiff > 30 || gDiff > 30 || bDiff > 30) {
          diffPixels++;
        }
      }
      
      const totalSamples = curr.length / 16;
      motionScore = (diffPixels / totalSamples) * 100;

      // Draw motion visualization
      if (motionScore > 5) {
        const alpha = Math.min(motionScore / 50, 0.3);
        const hue = matchScore > 50 ? '150' : '280'; // Green if matching, purple otherwise
        ctx.fillStyle = `hsla(${hue}, 70%, 50%, ${alpha})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.strokeStyle = `hsla(${hue}, 80%, 60%, ${Math.min(motionScore / 30, 0.8)})`;
        ctx.lineWidth = 4;
        ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
      }
    }

    prevFrameRef.current = currentFrame;
    return { motion: motionScore, match: matchScore };
  }, [calculateMatchScore]);

  const startDetection = useCallback(() => {
    const detect = () => {
      const { motion, match } = detectMotion();
      
      setState(prev => ({
        ...prev,
        isDetecting: true,
        motionLevel: motion,
        matchScore: match,
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
    captureFrame,
  };
};
