import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { X, ChefHat, Eye, Volume2, VolumeX } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface SteamShot {
  id: string;
  video_url: string;
  thumbnail_url: string | null;
  chef_id: string;
  dish_id: string | null;
  view_count: number;
  duration_seconds: number;
  created_at: string;
  chef_profiles: {
    brand_name: string;
    kitchen_verified: boolean | null;
  };
  dishes?: {
    name: string;
    price: number;
  } | null;
}

interface SteamShotViewerProps {
  isOpen: boolean;
  onClose: () => void;
  initialIndex?: number;
}

export function SteamShotViewer({ isOpen, onClose, initialIndex = 0 }: SteamShotViewerProps) {
  const [steamShots, setSteamShots] = useState<SteamShot[]>([]);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [muted, setMuted] = useState(true);
  const [loading, setLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchSteamShots();
    }
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [isOpen]);

  const fetchSteamShots = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('steam_shots')
      .select(`
        id,
        video_url,
        thumbnail_url,
        chef_id,
        dish_id,
        view_count,
        duration_seconds,
        created_at,
        chef_profiles!inner (
          brand_name,
          kitchen_verified
        ),
        dishes (
          name,
          price
        )
      `)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      setSteamShots(data as unknown as SteamShot[]);
    }
    setLoading(false);
  };

  const currentShot = steamShots[currentIndex];

  useEffect(() => {
    if (!currentShot || !videoRef.current) return;

    const video = videoRef.current;
    const duration = currentShot.duration_seconds * 1000;

    // Reset and play
    video.currentTime = 0;
    video.play().catch(() => {});

    setProgress(0);
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }

    const startTime = Date.now();
    progressInterval.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(newProgress);

      if (newProgress >= 100) {
        handleNext();
      }
    }, 50);

    // Increment view count
    supabase
      .from('steam_shots')
      .update({ view_count: (currentShot.view_count || 0) + 1 })
      .eq('id', currentShot.id)
      .then();

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [currentIndex, steamShots]);

  const handleNext = () => {
    if (currentIndex < steamShots.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleTap = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;

    if (x < width / 3) {
      handlePrev();
    } else if (x > (width * 2) / 3) {
      handleNext();
    } else {
      // Toggle mute on center tap
      setMuted(prev => !prev);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Progress bars */}
      <div className="absolute top-2 left-2 right-2 z-40 flex gap-1">
        {steamShots.map((_, idx) => (
          <div key={idx} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-100"
              style={{
                width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%'
              }}
            />
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full" />
        </div>
      ) : currentShot ? (
        <div className="h-full flex items-center justify-center" onClick={handleTap}>
          {/* Video */}
          <video
            ref={videoRef}
            src={currentShot.video_url}
            className="max-h-full max-w-full object-contain"
            muted={muted}
            playsInline
            loop={false}
          />

          {/* Mute indicator */}
          <button
            onClick={(e) => { e.stopPropagation(); setMuted(prev => !prev); }}
            className="absolute bottom-24 right-4 p-3 rounded-full bg-black/50 text-white"
          >
            {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>

          {/* Chef info overlay */}
          <div className="absolute bottom-4 left-4 right-4 text-white">
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="w-10 h-10 border-2 border-primary">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {currentShot.chef_profiles.brand_name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{currentShot.chef_profiles.brand_name}</span>
                  {currentShot.chef_profiles.kitchen_verified && (
                    <ChefHat className="w-4 h-4 text-primary" />
                  )}
                </div>
                {currentShot.dishes && (
                  <p className="text-sm text-white/80">
                    {currentShot.dishes.name} • ₦{currentShot.dishes.price.toLocaleString()}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 text-sm text-white/80">
                <Eye className="w-4 h-4" />
                <span>{currentShot.view_count}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-full text-white">
          <p>No Steam Shots available</p>
        </div>
      )}
    </div>
  );
}
