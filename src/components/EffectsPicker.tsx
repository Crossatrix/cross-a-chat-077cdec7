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
  { name: "Swing", type: "swing", preview: "🎪", description: "Text swings like a pendulum" },
  { name: "Blur", type: "blur", preview: "🌫️", description: "Text blurs in and out" },
  { name: "Stretch", type: "stretch", preview: "↔️", description: "Text stretches horizontally" },
  { name: "Flicker", type: "flicker", preview: "🕯️", description: "Text flickers like a candle" },
  { name: "Slide", type: "slide", preview: "➡️", description: "Text slides left and right" },
  { name: "Pop", type: "pop", preview: "💥", description: "Letters pop into view" },
  { name: "Wobble", type: "wobble", preview: "〰️", description: "Text wobbles around" },
  { name: "Matrix", type: "matrix", preview: "🟢", description: "Matrix-style falling text" },
];

const colors: { name: string; hex: string }[] = [
  { name: "Red", hex: "#FF0000" },
  { name: "Crimson", hex: "#DC143C" },
  { name: "Orange", hex: "#FF8000" },
  { name: "Amber", hex: "#FFBF00" },
  { name: "Yellow", hex: "#FFD700" },
  { name: "Lime", hex: "#00FF00" },
  { name: "Green", hex: "#00CC00" },
  { name: "Teal", hex: "#008080" },
  { name: "Cyan", hex: "#00FFFF" },
  { name: "Sky", hex: "#00BFFF" },
  { name: "Blue", hex: "#0080FF" },
  { name: "Indigo", hex: "#4B0082" },
  { name: "Purple", hex: "#8000FF" },
  { name: "Violet", hex: "#7F00FF" },
  { name: "Pink", hex: "#FF00FF" },
  { name: "Rose", hex: "#FF0080" },
  { name: "Coral", hex: "#FF7F50" },
  { name: "Salmon", hex: "#FA8072" },
  { name: "Gold", hex: "#FFD700" },
  { name: "White", hex: "#FFFFFF" },
  { name: "Silver", hex: "#C0C0C0" },
  { name: "Gray", hex: "#808080" },
  { name: "Mint", hex: "#98FF98" },
  { name: "Peach", hex: "#FFDAB9" },
];

const EffectsPicker = ({ onEffectSelect, disabled }: EffectsPickerProps) => {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [selectedAnimations, setSelectedAnimations] = useState<string[]>([]);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [customColor, setCustomColor] = useState("#FF0000");

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
    
    const inputText = text.trim();
    
    if (selectedAnimations.length > 0 && selectedColor) {
      // Combined: /#/combo; wave,bounce #FF0000 Hello/#/
      const anims = selectedAnimations.join(',');
      onEffectSelect(`/#/combo; ${anims} ${selectedColor} ${inputText}/#/`);
    } else if (selectedAnimations.length > 0) {
      const anims = selectedAnimations.join(',');
      onEffectSelect(`/#/combo; ${anims} ${inputText}/#/`);
    } else if (selectedColor) {
      onEffectSelect(`/#/text; ${selectedColor} ${inputText}/#/`);
    }
    
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
              <div className="p-3 space-y-3">
                {/* Custom color picker */}
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={customColor}
                    onChange={(e) => setCustomColor(e.target.value)}
                    className="w-8 h-8 rounded-full border-2 border-border cursor-pointer bg-transparent"
                  />
                  <span className="text-xs text-muted-foreground flex-1">Custom</span>
                  <Button
                    type="button"
                    variant={selectedColor === customColor ? "default" : "outline"}
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => handleColorClick(customColor)}
                  >
                    {selectedColor === customColor ? "Selected" : "Use"}
                  </Button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {colors.map((color) => (
                    <button
                      key={color.name}
                      type="button"
                      onClick={() => handleColorClick(color.hex)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-md transition-all duration-200 ${
                        selectedColor === color.hex
                          ? 'bg-primary/20 ring-2 ring-primary scale-105'
                          : 'hover:bg-secondary hover:scale-105'
                      }`}
                      title={color.name}
                    >
                      <div
                        className="w-7 h-7 rounded-full border-2 border-border shadow-sm"
                        style={{ backgroundColor: color.hex }}
                      />
                      <span className="text-[10px] text-muted-foreground">{color.name}</span>
                    </button>
                  ))}
                </div>
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
