import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Palette, Wand2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Effect {
  name: string;
  tag: string;
  preview: string;
  description: string;
}

interface EffectsPickerProps {
  onEffectSelect: (tag: string) => void;
  disabled?: boolean;
}

const animations: Effect[] = [
  { name: "Wave", tag: "/#/animate; wave YOUR_TEXT/#/", preview: "🌊", description: "Letters wave up and down" },
  { name: "Bounce", tag: "/#/animate; bounce YOUR_TEXT/#/", preview: "⬆️", description: "Letters bounce up and down" },
  { name: "Shake", tag: "/#/animate; shake YOUR_TEXT/#/", preview: "📳", description: "Text shakes side to side" },
  { name: "Pulse", tag: "/#/animate; pulse YOUR_TEXT/#/", preview: "💓", description: "Text pulses bigger and smaller" },
  { name: "Glow", tag: "/#/animate; glow YOUR_TEXT/#/", preview: "✨", description: "Text glows with light" },
  { name: "Rainbow", tag: "/#/animate; rainbow YOUR_TEXT/#/", preview: "🌈", description: "Text cycles through colors" },
  { name: "Typewriter", tag: "/#/animate; typewriter YOUR_TEXT/#/", preview: "⌨️", description: "Text types out letter by letter" },
  { name: "Flip", tag: "/#/animate; flip YOUR_TEXT/#/", preview: "🔄", description: "Letters flip around" },
  { name: "Randomize", tag: "/#/animate; randomize YOUR_TEXT/#/", preview: "🔀", description: "Letters shuffle randomly" },
  { name: "Fade", tag: "/#/animate; fade YOUR_TEXT/#/", preview: "👻", description: "Text fades in and out" },
  { name: "Zoom", tag: "/#/animate; zoom YOUR_TEXT/#/", preview: "🔍", description: "Text zooms in and out" },
  { name: "Spin", tag: "/#/animate; spin YOUR_TEXT/#/", preview: "🔃", description: "Text spins around" },
  { name: "Glitch", tag: "/#/animate; glitch YOUR_TEXT/#/", preview: "📺", description: "Glitchy distortion effect" },
  { name: "Neon", tag: "/#/animate; neon YOUR_TEXT/#/", preview: "💡", description: "Neon sign flickering" },
  { name: "Jelly", tag: "/#/animate; jelly YOUR_TEXT/#/", preview: "🍮", description: "Wobbly jelly effect" },
  { name: "Float", tag: "/#/animate; float YOUR_TEXT/#/", preview: "🎈", description: "Text floats up gently" },
];

const colors: { name: string; hex: string }[] = [
  { name: "Red", hex: "#FF0000" },
  { name: "Orange", hex: "#FF8000" },
  { name: "Yellow", hex: "#FFD700" },
  { name: "Lime", hex: "#00FF00" },
  { name: "Green", hex: "#00CC00" },
  { name: "Cyan", hex: "#00FFFF" },
  { name: "Blue", hex: "#0080FF" },
  { name: "Purple", hex: "#8000FF" },
  { name: "Pink", hex: "#FF00FF" },
  { name: "Rose", hex: "#FF0080" },
  { name: "White", hex: "#FFFFFF" },
  { name: "Gray", hex: "#808080" },
];

const EffectsPicker = ({ onEffectSelect, disabled }: EffectsPickerProps) => {
  const [open, setOpen] = useState(false);

  const handleEffectClick = (tag: string) => {
    onEffectSelect(tag);
    setOpen(false);
  };

  const handleColorClick = (hex: string) => {
    onEffectSelect(`/#/text; ${hex} YOUR_TEXT/#/`);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={disabled}
          className="shrink-0"
          title="Text Effects"
        >
          <Wand2 className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Tabs defaultValue="animations" className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="animations" className="flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Animations
            </TabsTrigger>
            <TabsTrigger value="colors" className="flex items-center gap-1">
              <Palette className="h-3 w-3" />
              Colors
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="animations" className="m-0">
            <ScrollArea className="h-64">
              <div className="grid grid-cols-2 gap-1 p-2">
                {animations.map((effect) => (
                  <button
                    key={effect.name}
                    onClick={() => handleEffectClick(effect.tag)}
                    className="flex items-center gap-2 p-2 rounded-md hover:bg-secondary transition-colors text-left"
                  >
                    <span className="text-lg">{effect.preview}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{effect.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{effect.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="colors" className="m-0">
            <ScrollArea className="h-64">
              <div className="grid grid-cols-4 gap-2 p-3">
                {colors.map((color) => (
                  <button
                    key={color.name}
                    onClick={() => handleColorClick(color.hex)}
                    className="flex flex-col items-center gap-1 p-2 rounded-md hover:bg-secondary transition-colors"
                    title={color.name}
                  >
                    <div
                      className="w-8 h-8 rounded-full border-2 border-border"
                      style={{ backgroundColor: color.hex }}
                    />
                    <span className="text-xs text-muted-foreground">{color.name}</span>
                  </button>
                ))}
              </div>
              <div className="p-3 pt-0">
                <p className="text-xs text-muted-foreground text-center">
                  Replace YOUR_TEXT with your message
                </p>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
};

export default EffectsPicker;
