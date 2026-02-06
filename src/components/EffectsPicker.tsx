import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Palette, Wand2, X, Check } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface Effect {
  name: string;
  type: string;
  preview: string;
  description: string;
}

interface EffectsPickerProps {
  onEffectSelect: (tag: string) => void;
  disabled?: boolean;
}

const animations: Effect[] = [
  { name: "Wave", type: "wave", preview: "🌊", description: "Letters wave up and down" },
  { name: "Bounce", type: "bounce", preview: "⬆️", description: "Letters bounce up and down" },
  { name: "Shake", type: "shake", preview: "📳", description: "Text shakes side to side" },
  { name: "Pulse", type: "pulse", preview: "💓", description: "Text pulses bigger and smaller" },
  { name: "Glow", type: "glow", preview: "✨", description: "Text glows with light" },
  { name: "Rainbow", type: "rainbow", preview: "🌈", description: "Text cycles through colors" },
  { name: "Typewriter", type: "typewriter", preview: "⌨️", description: "Text types out letter by letter" },
  { name: "Flip", type: "flip", preview: "🔄", description: "Letters flip around" },
  { name: "Randomize", type: "randomize", preview: "🔀", description: "Letters shuffle randomly" },
  { name: "Fade", type: "fade", preview: "👻", description: "Text fades in and out" },
  { name: "Zoom", type: "zoom", preview: "🔍", description: "Text zooms in and out" },
  { name: "Spin", type: "spin", preview: "🔃", description: "Text spins around" },
  { name: "Glitch", type: "glitch", preview: "📺", description: "Glitchy distortion effect" },
  { name: "Neon", type: "neon", preview: "💡", description: "Neon sign flickering" },
  { name: "Jelly", type: "jelly", preview: "🍮", description: "Wobbly jelly effect" },
  { name: "Float", type: "float", preview: "🎈", description: "Text floats up gently" },
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
  const [text, setText] = useState("");
  const [selectedAnimations, setSelectedAnimations] = useState<string[]>([]);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  const handleAnimationClick = (type: string) => {
    setSelectedAnimations(prev => 
      prev.includes(type) 
        ? prev.filter(a => a !== type)
        : [...prev, type]
    );
  };

  const handleColorClick = (hex: string) => {
    setSelectedColor(prev => prev === hex ? null : hex);
  };

  const handleApply = () => {
    if (!text.trim()) return;
    
    let result = text.trim();
    
    // Apply color first (innermost)
    if (selectedColor) {
      result = `/#/text; ${selectedColor} ${result}/#/`;
    }
    
    // Apply animations (wrap around, outermost first when reading)
    // We reverse so the first selected animation is the outermost wrapper
    [...selectedAnimations].reverse().forEach(animType => {
      result = `/#/animate; ${animType} ${result}/#/`;
    });
    
    onEffectSelect(result);
    resetAndClose();
  };

  const resetAndClose = () => {
    setText("");
    setSelectedAnimations([]);
    setSelectedColor(null);
    setOpen(false);
  };

  const hasSelection = selectedAnimations.length > 0 || selectedColor;

  return (
    <Popover open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) {
        setText("");
        setSelectedAnimations([]);
        setSelectedColor(null);
      }
    }}>
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
        <div className="p-3 border-b border-border space-y-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter your text..."
            className="text-sm"
          />
          {hasSelection && (
            <div className="flex flex-wrap gap-1">
              {selectedColor && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: selectedColor }}
                  />
                  Color
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => setSelectedColor(null)}
                  />
                </Badge>
              )}
              {selectedAnimations.map(anim => (
                <Badge key={anim} variant="secondary" className="text-xs gap-1">
                  {anim}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => setSelectedAnimations(prev => prev.filter(a => a !== anim))}
                  />
                </Badge>
              ))}
            </div>
          )}
        </div>
        
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
            <ScrollArea className="h-48">
              <div className="grid grid-cols-2 gap-1 p-2">
                {animations.map((effect) => (
                  <button
                    key={effect.name}
                    type="button"
                    onClick={() => handleAnimationClick(effect.type)}
                    className={`flex items-center gap-2 p-2 rounded-md transition-colors text-left ${
                      selectedAnimations.includes(effect.type)
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-secondary'
                    }`}
                  >
                    <span className="text-lg">{effect.preview}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{effect.name}</div>
                      <div className={`text-xs truncate ${
                        selectedAnimations.includes(effect.type)
                          ? 'text-primary-foreground/70'
                          : 'text-muted-foreground'
                      }`}>{effect.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="colors" className="m-0">
            <ScrollArea className="h-48">
              <div className="grid grid-cols-4 gap-2 p-3">
                {colors.map((color) => (
                  <button
                    key={color.name}
                    type="button"
                    onClick={() => handleColorClick(color.hex)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-md transition-colors ${
                      selectedColor === color.hex
                        ? 'bg-primary/20 ring-2 ring-primary'
                        : 'hover:bg-secondary'
                    }`}
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
            </ScrollArea>
          </TabsContent>
        </Tabs>
        
        <div className="p-3 border-t border-border">
          <Button 
            onClick={handleApply} 
            disabled={!text.trim() || !hasSelection}
            className="w-full"
            size="sm"
          >
            <Check className="h-4 w-4 mr-1" />
            Apply Effects
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default EffectsPicker;
