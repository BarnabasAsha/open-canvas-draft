import {
  ArrowUpRightIcon,
  CircleIcon,
  FrameCornersIcon,
  ImageIcon,
  LineSegmentIcon,
  PackageIcon,
  PenNibIcon,
  RectangleIcon,
  RowsIcon,
  SelectionIcon,
  TextTIcon,
} from "@phosphor-icons/react";
import type { SceneNode } from "../../../types/scene";

// One icon per node type, reusing the exact same icons the toolbar already
// uses for the tool that draws each type — so a shape reads as "the same
// thing" whether you're looking at the tool that made it or the layer row
// it left behind.
const ICON_BY_TYPE: Record<SceneNode["type"], typeof RectangleIcon> = {
  rect: RectangleIcon,
  ellipse: CircleIcon,
  line: LineSegmentIcon,
  arrow: ArrowUpRightIcon,
  image: ImageIcon,
  text: TextTIcon,
  path: PenNibIcon,
  frame: FrameCornersIcon,
  section: RowsIcon,
  group: SelectionIcon,
  instance: PackageIcon,
};

export function LayerTypeIcon({ type }: { type: SceneNode["type"] }) {
  const Icon = ICON_BY_TYPE[type];
  return <Icon size={14} />;
}
