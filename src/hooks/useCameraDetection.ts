import { useState, useRef, useCallback, useEffect } from 'react';
import * as poseDetection from '@tensorflow-models/pose-detection';
import '@tensorflow/tfjs-backend-webgl';
import * as tf from '@tensorflow/tfjs';

export interface DetectionState {
  isActive: boolean;
  isLoading: boolean;
  isDetecting: boolean;
  confidence: number;
  poseDetected: boolean;
  error: string | null;
}

export const useCameraDetection = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const detectorRef = useRef<poseDetection.PoseDetector | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  
  const [state, setState] = useState<DetectionState>({
    isActive: false,
    isLoading: false,
    isDetecting: false,
    confidence: 0,
    poseDetected: false,
    error: null,
  });

  const [motionHistory, setMotionHistory] = useState<number[]>([]);
  const lastPoseRef = useRef<poseDetection.Pose | null>(null);

  const initializeDetector = useCallback(async () => {
    try {
      // Set up TensorFlow backend
      await tf.setBackend('webgl');
      await tf.ready();

      const detector = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        {
          modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
        }
      );
      
      detectorRef.current = detector;
      return detector;
    } catch (error) {
      console.error('Failed to initialize pose detector:', error);
      throw error;
    }
  }, []);

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

      await initializeDetector();

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
  }, [initializeDetector]);

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

    setState({
      isActive: false,
      isLoading: false,
      isDetecting: false,
      confidence: 0,
      poseDetected: false,
      error: null,
    });
  }, []);

  const calculateMotion = useCallback((currentPose: poseDetection.Pose) => {
    if (!lastPoseRef.current) {
      lastPoseRef.current = currentPose;
      return 0;
    }

    let totalMotion = 0;
    const lastKeypoints = lastPoseRef.current.keypoints;
    const currentKeypoints = currentPose.keypoints;

    // Compare keypoint positions
    for (let i = 0; i < Math.min(lastKeypoints.length, currentKeypoints.length); i++) {
      const last = lastKeypoints[i];
      const current = currentKeypoints[i];
      
      if (last.score && current.score && last.score > 0.3 && current.score > 0.3) {
        const dx = current.x - last.x;
        const dy = current.y - last.y;
        totalMotion += Math.sqrt(dx * dx + dy * dy);
      }
    }

    lastPoseRef.current = currentPose;
    return totalMotion;
  }, []);

  const detectPose = useCallback(async () => {
    if (!detectorRef.current || !videoRef.current || !videoRef.current.readyState) {
      return;
    }

    try {
      const poses = await detectorRef.current.estimatePoses(videoRef.current, {
        flipHorizontal: false,
      });

      if (poses.length > 0) {
        const pose = poses[0];
        const avgConfidence = pose.keypoints.reduce((sum, kp) => sum + (kp.score || 0), 0) / pose.keypoints.length;
        
        const motion = calculateMotion(pose);
        
        setMotionHistory(prev => {
          const newHistory = [...prev, motion].slice(-30); // Keep last 30 frames
          return newHistory;
        });

        // Significant motion detected
        const isMoving = motion > 15;

        setState(prev => ({
          ...prev,
          isDetecting: true,
          confidence: avgConfidence,
          poseDetected: avgConfidence > 0.3,
        }));

        // Draw skeleton on canvas
        if (canvasRef.current && videoRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
            
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            
            // Draw keypoints
            pose.keypoints.forEach(keypoint => {
              if (keypoint.score && keypoint.score > 0.3) {
                ctx.beginPath();
                ctx.arc(keypoint.x, keypoint.y, 5, 0, 2 * Math.PI);
                ctx.fillStyle = isMoving ? '#00d4aa' : '#a855f7';
                ctx.fill();
              }
            });

            // Draw connections
            const connections = [
              [0, 1], [0, 2], [1, 3], [2, 4], // Head
              [5, 6], [5, 7], [7, 9], [6, 8], [8, 10], // Arms
              [5, 11], [6, 12], [11, 12], // Torso
              [11, 13], [13, 15], [12, 14], [14, 16], // Legs
            ];

            ctx.strokeStyle = isMoving ? '#00d4aa' : '#a855f7';
            ctx.lineWidth = 2;

            connections.forEach(([i, j]) => {
              const kp1 = pose.keypoints[i];
              const kp2 = pose.keypoints[j];
              
              if (kp1.score && kp2.score && kp1.score > 0.3 && kp2.score > 0.3) {
                ctx.beginPath();
                ctx.moveTo(kp1.x, kp1.y);
                ctx.lineTo(kp2.x, kp2.y);
                ctx.stroke();
              }
            });
          }
        }

        return { pose, motion, avgConfidence };
      }
    } catch (error) {
      console.error('Pose detection error:', error);
    }

    return null;
  }, [calculateMotion]);

  const startDetection = useCallback(() => {
    const detect = async () => {
      await detectPose();
      animationRef.current = requestAnimationFrame(detect);
    };
    detect();
  }, [detectPose]);

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
    detectPose,
  };
};
