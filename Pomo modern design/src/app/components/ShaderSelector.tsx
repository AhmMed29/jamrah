import { useState } from "react";
import { Tooltip } from "./ui/tooltip";
import { shaders } from "./util/shaders";
import { ShaderPreviewButton } from "./ShaderPreviewButton";

interface ShaderSelectorProps {
  selectedShader: number;
  onSelectShader: (id: number) => void;
}

export const ShaderSelector = ({ selectedShader, onSelectShader }: ShaderSelectorProps) => {
  const [hoveredShader, setHoveredShader] = useState<number | null>(null);

  return (
    <div className="fixed right-4 top-1/2 transform -translate-y-1/2 flex flex-col gap-3 z-10">
      {shaders.map((shader) => (
        <Tooltip key={shader.id} content={shader.name} side="left">
          <div className={`${hoveredShader && hoveredShader !== shader.id ? 'opacity-60' : 'opacity-100'}`}>
            <ShaderPreviewButton
              shaderId={shader.id}
              isSelected={selectedShader === shader.id}
              onSelect={() => onSelectShader(shader.id)}
              onMouseEnter={() => setHoveredShader(shader.id)}
              onMouseLeave={() => setHoveredShader(null)}
            />
          </div>
        </Tooltip>
      ))}
    </div>
  );
};