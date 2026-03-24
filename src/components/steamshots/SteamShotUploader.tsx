import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Video, Upload, X, Loader2 } from "lucide-react";

interface Dish {
  id: string;
  name: string;
}

interface SteamShotUploaderProps {
  isOpen: boolean;
  onClose: () => void;
  chefId: string;
  userId: string;
  onUploaded?: () => void;
}

const MAX_DURATION = 5; // seconds
const MAX_SIZE_MB = 10;

export function SteamShotUploader({ isOpen, onClose, chefId, userId, onUploaded }: SteamShotUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedDish, setSelectedDish] = useState<string | null>(null);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  useState(() => {
    // Fetch chef's dishes
    const fetchDishes = async () => {
      const { data } = await supabase
        .from('dishes')
        .select('id, name')
        .eq('chef_id', chefId);
      if (data) setDishes(data);
    };
    fetchDishes();
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setError(null);

    // Check file type
    if (!selectedFile.type.startsWith('video/')) {
      setError('Please select a video file');
      return;
    }

    // Check file size
    if (selectedFile.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Video must be under ${MAX_SIZE_MB}MB`);
      return;
    }

    // Check duration
    const duration = await getVideoDuration(selectedFile);
    if (duration > MAX_DURATION) {
      setError(`Video must be ${MAX_DURATION} seconds or less`);
      return;
    }

    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
  };

  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };
      video.src = URL.createObjectURL(file);
    });
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    try {
      // Upload to storage
      const fileName = `${userId}/${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('steam-shots')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('steam-shots')
        .getPublicUrl(uploadData.path);

      // Get video duration
      const duration = await getVideoDuration(file);

      // Create steam shot record
      const { error: insertError } = await supabase
        .from('steam_shots')
        .insert({
          chef_id: chefId,
          video_url: publicUrl,
          dish_id: selectedDish || null,
          duration_seconds: Math.round(duration)
        });

      if (insertError) throw insertError;

      toast({
        title: "Steam Shot uploaded!",
        description: "Your video will be visible for 24 hours"
      });

      onUploaded?.();
      handleClose();
    } catch (err: any) {
      toast({
        title: "Upload failed",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreview(null);
    setSelectedDish(null);
    setError(null);
    onClose();
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="w-5 h-5 text-primary" />
            Upload Steam Shot
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* File input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {!preview ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-48 border-2 border-dashed border-muted-foreground/25 rounded-lg flex flex-col items-center justify-center gap-3 hover:border-primary/50 transition-colors"
            >
              <Upload className="w-10 h-10 text-muted-foreground" />
              <div className="text-center">
                <p className="font-medium text-foreground">Choose a video</p>
                <p className="text-sm text-muted-foreground">
                  Max {MAX_DURATION}s, {MAX_SIZE_MB}MB
                </p>
              </div>
            </button>
          ) : (
            <div className="relative">
              <video
                ref={videoRef}
                src={preview}
                className="w-full h-48 object-cover rounded-lg bg-black"
                controls
                muted
              />
              <button
                onClick={clearFile}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-black"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {/* Link to dish */}
          <div className="space-y-2">
            <Label>Link to a dish (optional)</Label>
            <Select value={selectedDish || ""} onValueChange={setSelectedDish}>
              <SelectTrigger>
                <SelectValue placeholder="Select a dish" />
              </SelectTrigger>
              <SelectContent>
                {dishes.map(dish => (
                  <SelectItem key={dish.id} value={dish.id}>
                    {dish.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Upload button */}
          <Button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload Steam Shot
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Steam Shots expire automatically after 24 hours
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
