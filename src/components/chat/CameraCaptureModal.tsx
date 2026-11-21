import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, X, RefreshCw, Send, AlertCircle, Image as ImageIcon, SwitchCamera } from 'lucide-react';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (dataUrl: string, blob: Blob) => void;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
}) => {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [flashAnimation, setFlashAnimation] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fallbackFileRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;

  const stopActiveStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Start webcam / camera stream
  const startCamera = useCallback(
    async (mode: 'user' | 'environment') => {
      setCameraError(null);
      try {
        stopActiveStream();

        if (!navigator.mediaDevices?.getUserMedia) {
          setCameraError('Camera API unavailable in this browser. Upload an image file instead.');
          return;
        }

        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: mode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (!isOpenRef.current) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = mediaStream;
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err: any) {
        console.warn('Camera access error:', err);
        if (isOpenRef.current) {
          setCameraError('Unable to access device camera. Check permissions or upload an image file.');
        }
      }
    },
    [stopActiveStream]
  );

  useEffect(() => {
    if (isOpen) {
      setCapturedImage(null);
      setCapturedBlob(null);
      startCamera(facingMode);
    } else {
      stopActiveStream();
    }

    return () => {
      stopActiveStream();
      if (flashTimerRef.current) {
        clearTimeout(flashTimerRef.current);
        flashTimerRef.current = null;
      }
    };
  }, [isOpen, facingMode, startCamera, stopActiveStream]);

  // Flip camera between front and back
  const handleToggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  // Capture current frame from video stream
  const handleTakePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    setFlashAnimation(true);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => setFlashAnimation(false), 200);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Flip horizontally if front-facing user camera for mirror effect
    ctx.save();
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
          setCapturedImage(dataUrl);
          setCapturedBlob(blob);
          stopActiveStream();
        }
      },
      'image/jpeg',
      0.92
    );
  };

  // Retake photo
  const handleRetake = () => {
    setCapturedImage(null);
    setCapturedBlob(null);
    startCamera(facingMode);
  };

  // Confirm and send captured photo
  const handleConfirmSend = () => {
    if (capturedImage && capturedBlob) {
      onCapture(capturedImage, capturedBlob);
      stopActiveStream();
      onClose();
    }
  };

  // Fallback: Pick file from device storage/gallery
  const handleFallbackFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fallbackFileRef.current) {
      fallbackFileRef.current.value = '';
    }
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          onCapture(reader.result, file);
          stopActiveStream();
          onClose();
        }
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0F172A] border border-cyan-500/30 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-[#0B1120]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Camera Capture</h3>
              <p className="text-[11px] text-slate-400">Take an instant photo to send in chat</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder / Preview Screen */}
        <div className="relative bg-black flex items-center justify-center min-h-[340px] max-h-[460px] overflow-hidden">
          {flashAnimation && (
            <div className="absolute inset-0 bg-white z-30 transition-opacity duration-150 opacity-100" />
          )}

          {cameraError ? (
            <div className="p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <p className="text-xs text-rose-300 font-medium">{cameraError}</p>
              <button
                onClick={() => fallbackFileRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold transition-all shadow-lg shadow-cyan-500/20"
              >
                Choose Photo from Gallery
              </button>
            </div>
          ) : capturedImage ? (
            <img
              src={capturedImage}
              alt="Snapshot preview"
              className="w-full h-full object-contain max-h-[440px]"
            />
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover max-h-[440px] ${
                  facingMode === 'user' ? 'scale-x-[-1]' : ''
                }`}
              />

              {/* Viewfinder Target Reticle Overlay */}
              <div className="absolute inset-8 border border-white/20 rounded-2xl pointer-events-none flex flex-col justify-between p-3">
                <div className="flex justify-between">
                  <span className="w-3 h-3 border-t-2 border-l-2 border-cyan-400" />
                  <span className="w-3 h-3 border-t-2 border-r-2 border-cyan-400" />
                </div>
                <div className="flex justify-between">
                  <span className="w-3 h-3 border-b-2 border-l-2 border-cyan-400" />
                  <span className="w-3 h-3 border-b-2 border-r-2 border-cyan-400" />
                </div>
              </div>

              {/* Switch Camera Button (Front / Back) */}
              <button
                onClick={handleToggleFacingMode}
                className="absolute top-4 right-4 p-2.5 rounded-full bg-black/60 text-white hover:bg-black/80 backdrop-blur-md transition-all shadow-lg active:scale-90"
                title="Switch Camera"
              >
                <SwitchCamera className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Hidden Canvas for Frame Extraction */}
          <canvas ref={canvasRef} className="hidden" />
          <input
            ref={fallbackFileRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFallbackFile}
            className="hidden"
          />
        </div>

        {/* Modal Controls Footer */}
        <div className="p-4 bg-[#0B1120] border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={() => fallbackFileRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="Upload from device storage"
          >
            <ImageIcon className="w-4 h-4 text-cyan-400" />
            <span>Upload File</span>
          </button>

          {capturedImage ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleRetake}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retake</span>
              </button>
              <button
                onClick={handleConfirmSend}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-black bg-cyan-400 hover:bg-cyan-300 shadow-[0_0_15px_rgba(0,229,255,0.4)] transition-all active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Photo</span>
              </button>
            </div>
          ) : (
            !cameraError && (
              <button
                onClick={handleTakePhoto}
                className="relative flex items-center justify-center w-14 h-14 rounded-full bg-white hover:bg-slate-100 transition-all active:scale-90 shadow-xl border-4 border-cyan-400"
                title="Capture Photo"
              >
                <div className="w-10 h-10 rounded-full bg-cyan-400/30" />
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
};
