import { useState, useRef, useCallback, useEffect } from 'react';

export interface DetectionState {
  isActive: boolean;
  isLoading: boolean;
  isDetecting: boolean;
  motionLevel: number;
  matchScore: number;
  patternMatch: boolean;
  error: string | null;
}

export interface MotionPattern {
  motionSequence: number[];
  avgIntensity: number;
  peakMotion: number;
  duration: number;
}

export const useCameraDetection = (referenceFrames?: string[]) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const prevFrameRef = useRef<ImageData | null>(null);
  const learnedPatternRef = useRef<MotionPattern | null>(null);
  const mountedRef = useRef(true);
  
  const [state, setState] = useState<DetectionState>({
    isActive: false,
    isLoading: false,
    isDetecting: false,
    motionLevel: 0,
    matchScore: 0,
    patternMatch: false,
    error: null,
  });

  const [motionHistory, setMotionHistory] = useState<number[]>([]);

  // Learn motion pattern from reference frames
  useEffect(() => {
    if (referenceFrames && referenceFrames.length > 0) {
      learnPatternFromFrames(referenceFrames);
    }
  }, [referenceFrames]);

  const learnPatternFromFrames = async (frames: string[]) => {
    if (frames.length < 5) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const motionSequence: number[] = [];
    let prevImageData: ImageData | null = null;
    let totalIntensity = 0;

    for (const frame of frames) {
      const img = new Image();
      await new Promise<void>((resolve) => {
        img.onload = () => {
          canvas.width = 160;
          canvas.height = 120;
          ctx.drawImage(img, 0, 0, 160, 120);
          
          const imageData = ctx.getImageData(0, 0, 160, 120);
          
          if (prevImageData) {
            // Calculate motion between frames
            let diffSum = 0;
            const data = imageData.data;
            const prevData = prevImageData.data;
            
            for (let i = 0; i < data.length; i += 16) {
              const rDiff = Math.abs(data[i] - prevData[i]);
              const gDiff = Math.abs(data[i + 1] - prevData[i + 1]);
              const bDiff = Math.abs(data[i + 2] - prevData[i + 2]);
              diffSum += (rDiff + gDiff + bDiff) / 3;
            }
            
            const motion = diffSum / (data.length / 16);
            motionSequence.push(motion);
            totalIntensity += motion;
          }
          
          prevImageData = imageData;
          resolve();
        };
        img.src = frame;
      });
    }

    if (motionSequence.length > 0) {
      learnedPatternRef.current = {
        motionSequence,
        avgIntensity: totalIntensity / motionSequence.length,
        peakMotion: Math.max(...motionSequence),
        duration: motionSequence.length,
      };
      console.log('Learned motion pattern:', learnedPatternRef.current);
    }
  };

  const startCamera = useCallback(async () => {
    console.log('[Camera] startCamera called, mounted:', mountedRef.current);
    if (!mountedRef.current) return false;
    
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      console.log('[Camera] Requesting getUserMedia...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });

      console.log('[Camera] Got stream, mounted:', mountedRef.current);
      
      // Check if unmounted while waiting for camera
      if (!mountedRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return false;
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Wait for video to be ready to play
        await new Promise<void>((resolve, reject) => {
          const video = videoRef.current!;
          const timeout = setTimeout(() => reject(new Error('Video load timeout')), 5000);
          
          if (video.readyState >= 2) {
            clearTimeout(timeout);
            resolve();
          } else {
            video.onloadeddata = () => {
              clearTimeout(timeout);
              resolve();
            };
            video.onerror = () => {
              clearTimeout(timeout);
              reject(new Error('Video load error'));
            };
          }
        });
        
        await videoRef.current.play();
        console.log('[Camera] Video playing, readyState:', videoRef.current.readyState);
      } else {
        console.error('[Camera] Video element not found');
        throw new Error('Video element not available');
      }

      // Check again after play
      if (!mountedRef.current) {
        stream.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        return false;
      }

      setState(prev => ({
        ...prev,
        isActive: true,
        isLoading: false,
      }));

      console.log('[Camera] Camera started successfully');
      return true;
    } catch (error: any) {
      console.error('[Camera] Failed to start camera:', error);
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error.message || 'Failed to access camera',
        }));
      }
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
      patternMatch: false,
      error: null,
    });
  }, []);

  const calculatePatternMatch = useCallback((recentMotion: number[]): number => {
    // If no pattern learned, just check for any significant motion
    if (!learnedPatternRef.current || recentMotion.length < 3) {
      const avgMotion = recentMotion.reduce((a, b) => a + b, 0) / Math.max(recentMotion.length, 1);
      // Any motion above threshold counts as a match
      return avgMotion > 3 ? Math.min(avgMotion * 15, 100) : 0;
    }

    const pattern = learnedPatternRef.current;
    
    // Compare motion characteristics - MORE LENIENT
    const avgMotion = recentMotion.reduce((a, b) => a + b, 0) / recentMotion.length;
    const peakMotion = Math.max(...recentMotion);
    
    // Much more lenient intensity comparison
    // Just check if there's roughly similar activity level (within 3x range)
    const intensityRatio = Math.min(avgMotion * 3, pattern.avgIntensity * 3) / 
                          Math.max(avgMotion, pattern.avgIntensity, 0.1);
    const intensityScore = Math.min(intensityRatio, 1);
    
    // Lenient peak comparison (within 4x range is acceptable)
    const peakRatio = Math.min(peakMotion * 4, pattern.peakMotion * 4) / 
                     Math.max(peakMotion, pattern.peakMotion, 0.1);
    const peakScore = Math.min(peakRatio, 1);
    
    // Activity bonus - just need 20% of learned intensity to get full bonus
    const activityBonus = avgMotion > pattern.avgIntensity * 0.2 ? 1 : 
                         avgMotion > pattern.avgIntensity * 0.1 ? 0.7 : 0.4;
    
    // Combined score - weighted more towards just having motion
    const matchScore = ((intensityScore * 0.25) + (peakScore * 0.25) + (activityBonus * 0.5)) * 100;
    
    return Math.min(matchScore, 100);
  }, []);

  const motionHistoryRef = useRef<number[]>([]);

  const detectMotion = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return { motion: 0, match: 0, patternMatch: false };
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    if (!ctx || video.readyState !== 4) return { motion: 0, match: 0, patternMatch: false };

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const currentFrame = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    let motionScore = 0;

    if (prevFrameRef.current) {
      const prev = prevFrameRef.current.data;
      const curr = currentFrame.data;
      let diffPixels = 0;
      
      for (let i = 0; i < curr.length; i += 16) {
        const rDiff = Math.abs(curr[i] - prev[i]);
        const gDiff = Math.abs(curr[i + 1] - prev[i + 1]);
        const bDiff = Math.abs(curr[i + 2] - prev[i + 2]);
        
        if (rDiff > 25 || gDiff > 25 || bDiff > 25) {
          diffPixels++;
        }
      }
      
      const totalSamples = curr.length / 16;
      motionScore = (diffPixels / totalSamples) * 100;

      // Visual feedback based on motion
      if (motionScore > 3) {
        const recentMotion = [...motionHistoryRef.current.slice(-20), motionScore];
        const patternMatchScore = calculatePatternMatch(recentMotion);
        const isPatternMatch = patternMatchScore > 60 && motionScore > 5;
        
        // Draw overlay
        const hue = isPatternMatch ? 150 : (patternMatchScore > 30 ? 280 : 200);
        const alpha = Math.min(motionScore / 40, 0.35);
        ctx.fillStyle = `hsla(${hue}, 70%, 50%, ${alpha})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw matching indicator ring
        if (isPatternMatch) {
          ctx.strokeStyle = `hsla(150, 80%, 50%, 0.8)`;
          ctx.lineWidth = 8;
          ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
        }
      }
    }

    prevFrameRef.current = currentFrame;
    
    return { motion: motionScore, match: 0, patternMatch: false };
  }, [calculatePatternMatch]);

  const stopDetection = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  const startDetection = useCallback(() => {
    // Prevent multiple detection loops
    if (animationRef.current) return;
    
    const detect = () => {
      const { motion } = detectMotion();
      
      // Update motion history ref
      motionHistoryRef.current = [...motionHistoryRef.current, motion].slice(-30);
      const newHistory = motionHistoryRef.current;
      
      // Calculate pattern match with updated history
      const patternMatchScore = calculatePatternMatch(newHistory);
      const isPatternMatch = patternMatchScore > 40 && motion > 2;
      
      setState(prevState => ({
        ...prevState,
        isDetecting: true,
        motionLevel: motion,
        matchScore: patternMatchScore,
        patternMatch: isPatternMatch,
      }));
      
      setMotionHistory(newHistory);

      animationRef.current = requestAnimationFrame(detect);
    };
    
    detect();
  }, [detectMotion, calculatePatternMatch]);

  // Cleanup on unmount only - no dependencies to prevent re-running
  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  return {
    videoRef,
    canvasRef,
    state,
    motionHistory,
    startCamera,
    stopCamera,
    startDetection,
    hasLearnedPattern: !!learnedPatternRef.current,
  };
};
