import type { ReactNode } from "react";
import type { ToolId } from "../canvas/tools/toolManager";
import {
  ArrowIcon,
  EllipseIcon,
  FrameIcon,
  ImageIcon,
  LineIcon,
  PenIcon,
  RectangleIcon,
  SectionIcon,
  SelectIcon,
  TextIcon,
} from "./ToolIcons";

interface ToolbarProps {
  activeToolId: ToolId;
  onSelectTool: (id: ToolId) => void;
}

interface ToolDefinition {
  id: ToolId;
  label: string;
  icon: ReactNode;
}

const TOOLS: ToolDefinition[] = [
  { id: "select", label: "Select (V)", icon: <SelectIcon /> },
  { id: "frame", label: "Frame (F)", icon: <FrameIcon /> },
  { id: "section", label: "Section (Shift+S)", icon: <SectionIcon /> },
  { id: "rectangle", label: "Rectangle (R)", icon: <RectangleIcon /> },
  { id: "ellipse", label: "Ellipse (O)", icon: <EllipseIcon /> },
  { id: "line", label: "Line (L)", icon: <LineIcon /> },
  { id: "arrow", label: "Arrow (A)", icon: <ArrowIcon /> },
  { id: "pen", label: "Pen (P)", icon: <PenIcon /> },
  { id: "text", label: "Text (T)", icon: <TextIcon /> },
  { id: "image", label: "Image", icon: <ImageIcon /> },
];

const ACCENT_COLOR = "#4f46e5";

export function Toolbar({ activeToolId, onSelectTool }: ToolbarProps) {
  return (
    <div
      style={{
        position: "absolute",
        top: 16,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        gap: 2,
        padding: 4,
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: 10,
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      }}
    >
      {TOOLS.map((tool) => {
        const isActive = tool.id === activeToolId;
        return (
          <button
            key={tool.id}
            type="button"
            title={tool.label}
            aria-pressed={isActive}
            onClick={() => onSelectTool(tool.id)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              color: isActive ? ACCENT_COLOR : "#374151",
              background: isActive ? "#eef2ff" : "transparent",
            }}
          >
            {tool.icon}
          </button>
        );
      })}
    </div>
  );
}
