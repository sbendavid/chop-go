import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SteamShotViewer } from "./SteamShotViewer";
import { Flame, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChefWithSteamShot {
  chef_id: string;
  brand_name: string;
  kitchen_verified: boolean | null;
  has_new: boolean;
}

interface SteamShotRingProps {
  onAddClick?: () => void;
  showAddButton?: boolean;
}

export function SteamShotRing({ onAddClick, showAddButton = false }: SteamShotRingProps) {
  const [chefs, setChefs] = useState<ChefWithSteamShot[]>([]);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedChefIndex, setSelectedChefIndex] = useState(0);

  useEffect(() => {
    fetchChefsWithSteamShots();
  }, []);

  const fetchChefsWithSteamShots = async () => {
    const { data, error } = await supabase
      .from('steam_shots')
      .select(`
        chef_id,
        chef_profiles!inner (
          brand_name,
          kitchen_verified
        )
      `)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (!error && data) {
      // Dedupe by chef_id
      const uniqueChefs = new Map<string, ChefWithSteamShot>();
      data.forEach((shot: any) => {
        if (!uniqueChefs.has(shot.chef_id)) {
          uniqueChefs.set(shot.chef_id, {
            chef_id: shot.chef_id,
            brand_name: shot.chef_profiles.brand_name,
            kitchen_verified: shot.chef_profiles.kitchen_verified,
            has_new: true
          });
        }
      });
      setChefs(Array.from(uniqueChefs.values()));
    }
  };

  const handleChefClick = (index: number) => {
    setSelectedChefIndex(index);
    setViewerOpen(true);
  };

  if (chefs.length === 0 && !showAddButton) {
    return null;
  }

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {/* Add button for chefs */}
        {showAddButton && (
          <button
            onClick={onAddClick}
            className="flex flex-col items-center gap-1 flex-shrink-0"
          >
            <div className="w-16 h-16 rounded-full bg-muted border-2 border-dashed border-primary/50 flex items-center justify-center hover:border-primary transition-colors">
              <Plus className="w-6 h-6 text-primary" />
            </div>
            <span className="text-xs text-muted-foreground">Add</span>
          </button>
        )}

        {/* Chef rings */}
        {chefs.map((chef, index) => (
          <button
            key={chef.chef_id}
            onClick={() => handleChefClick(index)}
            className="flex flex-col items-center gap-1 flex-shrink-0"
          >
            <div
              className={cn(
                "w-16 h-16 rounded-full p-0.5",
                chef.has_new
                  ? "bg-gradient-to-tr from-primary via-accent to-secondary"
                  : "bg-muted"
              )}
            >
              <Avatar className="w-full h-full border-2 border-background">
                <AvatarFallback className="bg-primary/10 text-primary text-lg">
                  {chef.brand_name.charAt(0)}
                </AvatarFallback>
              </Avatar>
            </div>
            <span className="text-xs text-foreground truncate max-w-[64px]">
              {chef.brand_name.split(' ')[0]}
            </span>
          </button>
        ))}

        {/* Steam Shots branding */}
        {chefs.length > 0 && (
          <div className="flex items-center gap-1 px-3 text-muted-foreground flex-shrink-0">
            <Flame className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium">Steam Shots</span>
          </div>
        )}
      </div>

      <SteamShotViewer
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
        initialIndex={selectedChefIndex}
      />
    </>
  );
}
