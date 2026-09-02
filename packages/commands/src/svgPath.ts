import type { PathPoint, PathSubpath } from "@open-canvas/schema";

// Converts an SVG path `d` string into this app's own PathSubpath model
// (PathPoint.handleIn/handleOut are absolute control-point positions, same
// as apps/web/src/canvas/renderer/shapes/drawPath.ts's tracePathSegment
// expects) — the bridge that lets a real vector icon (or any other SVG path
// source) become an authored, editable PathNode rather than a raster image.
// Pure string parsing, no DOM dependency, so it runs anywhere this package
// already runs.
//
// Handles every command SVG paths actually use: M/L/H/V (moveto/lineto,
// plus the axis-aligned shorthands), C/S (cubic bezier, S reflecting the
// previous curve's control point), Q/T (quadratic bezier, converted to an
// equivalent cubic via the standard degree-elevation formula, since
// PathPoint only models cubic handles), A (elliptical arc, converted via
// the standard endpoint-to-center parameterization split into <=90deg
// cubic-bezier segments), and Z (closes the current subpath — a following
// M starts a new one, which is how a single `d` string can describe a
// compound shape with a hole).
export function parseSvgPath(d: string): PathSubpath[] {
  const cursor: Cursor = { d, i: 0 };
  const subpaths: PathSubpath[] = [];
  let points: PathPoint[] = [];
  let current: Pt = { x: 0, y: 0 };
  let subpathStart: Pt = { x: 0, y: 0 };
  let lastCubicControl: Pt | null = null;
  let lastQuadControl: Pt | null = null;
  let lastCommand = "";

  const flush = (closed: boolean): void => {
    if (points.length > 0) subpaths.push({ points, closed });
    points = [];
  };
  const appendAnchor = (point: Pt, handleIn?: Pt): void => {
    points.push({ x: point.x, y: point.y, handleIn });
    current = point;
  };
  const setHandleOutOnCurrent = (handleOut: Pt): void => {
    const last = points[points.length - 1];
    if (last) points[points.length - 1] = { ...last, handleOut };
  };
  const readPoint = (rel: boolean): Pt => {
    const x = readNumber(cursor);
    const y = readNumber(cursor);
    return rel ? { x: current.x + x, y: current.y + y } : { x, y };
  };

  while (true) {
    const commandChar = peekCommand(cursor);
    if (commandChar === null) break;
    cursor.i++;
    const rel = commandChar === commandChar.toLowerCase();
    const upper = commandChar.toUpperCase();

    if (upper === "M") {
      const point = readPoint(rel);
      flush(false);
      appendAnchor(point);
      subpathStart = point;
      lastCommand = "M";
      // Coordinate pairs after the first, within the same M command, are
      // implicit linetos per the SVG spec — not additional moveto starts.
      while (hasMoreArgs(cursor)) {
        appendAnchor(readPoint(rel));
        lastCommand = "L";
      }
      continue;
    }

    if (upper === "Z") {
      flush(true);
      current = subpathStart;
      lastCommand = "Z";
      continue;
    }

    let firstRepeat = true;
    while (firstRepeat || hasMoreArgs(cursor)) {
      firstRepeat = false;
      switch (upper) {
        case "L":
          appendAnchor(readPoint(rel));
          break;
        case "H": {
          const x = readNumber(cursor);
          appendAnchor({ x: rel ? current.x + x : x, y: current.y });
          break;
        }
        case "V": {
          const y = readNumber(cursor);
          appendAnchor({ x: current.x, y: rel ? current.y + y : y });
          break;
        }
        case "C": {
          const c1 = readPoint(rel);
          const c2 = readPoint(rel);
          const to = readPoint(rel);
          setHandleOutOnCurrent(c1);
          appendAnchor(to, c2);
          lastCubicControl = c2;
          break;
        }
        case "S": {
          const c1: Pt = lastCommand === "C" || lastCommand === "S" ? reflect(current, lastCubicControl ?? current) : current;
          const c2 = readPoint(rel);
          const to = readPoint(rel);
          setHandleOutOnCurrent(c1);
          appendAnchor(to, c2);
          lastCubicControl = c2;
          break;
        }
        case "Q": {
          const qc = readPoint(rel);
          const to = readPoint(rel);
          const cubic = quadraticToCubic(current, qc, to);
          setHandleOutOnCurrent(cubic.c1);
          appendAnchor(to, cubic.c2);
          lastQuadControl = qc;
          break;
        }
        case "T": {
          const qc: Pt = lastCommand === "Q" || lastCommand === "T" ? reflect(current, lastQuadControl ?? current) : current;
          const to = readPoint(rel);
          const cubic = quadraticToCubic(current, qc, to);
          setHandleOutOnCurrent(cubic.c1);
          appendAnchor(to, cubic.c2);
          lastQuadControl = qc;
          break;
        }
        case "A": {
          const rx = readNumber(cursor);
          const ry = readNumber(cursor);
          const xAxisRotation = readNumber(cursor);
          const largeArcFlag = readFlag(cursor);
          const sweepFlag = readFlag(cursor);
          const to = readPoint(rel);
          const segments = svgArcToCubics(current, to, rx, ry, xAxisRotation, largeArcFlag, sweepFlag);
          if (segments.length === 0) {
            appendAnchor(to);
          } else {
            for (const segment of segments) {
              setHandleOutOnCurrent(segment.c1);
              appendAnchor(segment.to, segment.c2);
            }
          }
          break;
        }
        default:
          throw new Error(`Unsupported SVG path command "${commandChar}"`);
      }
      lastCommand = upper;
    }
  }

  flush(false);
  return subpaths;
}

interface Pt {
  x: number;
  y: number;
}

interface Cursor {
  d: string;
  i: number;
}

const COMMAND_LETTERS = "MmLlHhVvCcSsQqTtAaZz";

function skipSeparators(cursor: Cursor): void {
  while (cursor.i < cursor.d.length && /[\s,]/.test(cursor.d[cursor.i])) cursor.i++;
}

function peekCommand(cursor: Cursor): string | null {
  skipSeparators(cursor);
  const ch = cursor.d[cursor.i];
  return ch !== undefined && COMMAND_LETTERS.includes(ch) ? ch : null;
}

function hasMoreArgs(cursor: Cursor): boolean {
  skipSeparators(cursor);
  const ch = cursor.d[cursor.i];
  return ch !== undefined && (ch === "-" || ch === "+" || ch === "." || (ch >= "0" && ch <= "9"));
}

function readNumber(cursor: Cursor): number {
  skipSeparators(cursor);
  const start = cursor.i;
  const { d } = cursor;
  if (d[cursor.i] === "+" || d[cursor.i] === "-") cursor.i++;
  while (cursor.i < d.length && d[cursor.i] >= "0" && d[cursor.i] <= "9") cursor.i++;
  if (d[cursor.i] === ".") {
    cursor.i++;
    while (cursor.i < d.length && d[cursor.i] >= "0" && d[cursor.i] <= "9") cursor.i++;
  }
  if (d[cursor.i] === "e" || d[cursor.i] === "E") {
    cursor.i++;
    if (d[cursor.i] === "+" || d[cursor.i] === "-") cursor.i++;
    while (cursor.i < d.length && d[cursor.i] >= "0" && d[cursor.i] <= "9") cursor.i++;
  }
  const text = d.slice(start, cursor.i);
  if (text === "" || text === "+" || text === "-") {
    throw new Error(`Invalid number in SVG path data at index ${start}`);
  }
  return Number(text);
}

// The two arc flags are always exactly one digit (0 or 1) and, unlike every
// other numeric argument, may be packed directly against the next token
// with no separator (e.g. "...1,1,100,100" or "...01100100") — reading
// exactly one character, rather than reusing readNumber, is what makes that
// packed form parse correctly instead of swallowing the next flag/number.
function readFlag(cursor: Cursor): 0 | 1 {
  skipSeparators(cursor);
  const ch = cursor.d[cursor.i];
  if (ch !== "0" && ch !== "1") {
    throw new Error(`Invalid arc flag in SVG path data at index ${cursor.i}`);
  }
  cursor.i++;
  return ch === "0" ? 0 : 1;
}

// Same formula as apps/web/src/canvas/tools/penPath.ts's mirrorHandle —
// duplicated rather than shared, since this package can't depend on
// apps/web and the formula is a two-line reflection, not real logic worth a
// cross-package extraction.
function reflect(anchor: Pt, control: Pt): Pt {
  return { x: 2 * anchor.x - control.x, y: 2 * anchor.y - control.y };
}

// Standard degree-elevation formula for expressing a quadratic bezier as an
// equivalent cubic — needed because PathPoint only models cubic handles.
function quadraticToCubic(p0: Pt, qc: Pt, p1: Pt): { c1: Pt; c2: Pt } {
  return {
    c1: { x: p0.x + (2 / 3) * (qc.x - p0.x), y: p0.y + (2 / 3) * (qc.y - p0.y) },
    c2: { x: p1.x + (2 / 3) * (qc.x - p1.x), y: p1.y + (2 / 3) * (qc.y - p1.y) },
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// Signed angle (radians) from vector u to vector v — used by the endpoint-
// to-center arc parameterization below.
function vectorAngle(ux: number, uy: number, vx: number, vy: number): number {
  const crossSign = ux * vy - uy * vx < 0 ? -1 : 1;
  const dot = clamp((ux * vx + uy * vy) / (Math.hypot(ux, uy) * Math.hypot(vx, vy)), -1, 1);
  return crossSign * Math.acos(dot);
}

// SVG's elliptical-arc endpoint parameterization (spec appendix F.6),
// converted to a run of <=90deg cubic-bezier segments (the standard
// "kappa" approximation) since neither Path2D nor this app's own PathPoint
// model has a native arc primitive. Arcs are the single most common curve
// command across the icon set this parser exists for (more common than
// plain cubic beziers), so this isn't an edge case to approximate loosely —
// it's the typical case.
function svgArcToCubics(
  from: Pt,
  to: Pt,
  rxIn: number,
  ryIn: number,
  xAxisRotationDeg: number,
  largeArcFlag: 0 | 1,
  sweepFlag: 0 | 1,
): Array<{ c1: Pt; c2: Pt; to: Pt }> {
  if (rxIn === 0 || ryIn === 0 || (from.x === to.x && from.y === to.y)) return [];

  let rx = Math.abs(rxIn);
  let ry = Math.abs(ryIn);
  const phi = (xAxisRotationDeg * Math.PI) / 180;
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);

  const dx2 = (from.x - to.x) / 2;
  const dy2 = (from.y - to.y) / 2;
  const x1p = cosPhi * dx2 + sinPhi * dy2;
  const y1p = -sinPhi * dx2 + cosPhi * dy2;

  const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lambda > 1) {
    const scale = Math.sqrt(lambda);
    rx *= scale;
    ry *= scale;
  }

  const centerSign = largeArcFlag !== sweepFlag ? 1 : -1;
  const rxSq = rx * rx;
  const rySq = ry * ry;
  const x1pSq = x1p * x1p;
  const y1pSq = y1p * y1p;
  const numerator = Math.max(0, rxSq * rySq - rxSq * y1pSq - rySq * x1pSq);
  const denom = rxSq * y1pSq + rySq * x1pSq;
  const co = denom === 0 ? 0 : centerSign * Math.sqrt(numerator / denom);
  const cxp = (co * rx * y1p) / ry;
  const cyp = (-co * ry * x1p) / rx;

  const cx = cosPhi * cxp - sinPhi * cyp + (from.x + to.x) / 2;
  const cy = sinPhi * cxp + cosPhi * cyp + (from.y + to.y) / 2;

  const theta1 = vectorAngle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let deltaTheta = vectorAngle((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
  if (!sweepFlag && deltaTheta > 0) deltaTheta -= 2 * Math.PI;
  if (sweepFlag && deltaTheta < 0) deltaTheta += 2 * Math.PI;

  const segmentCount = Math.max(1, Math.ceil(Math.abs(deltaTheta) / (Math.PI / 2)));
  const segmentAngle = deltaTheta / segmentCount;
  const alpha = (4 / 3) * Math.tan(segmentAngle / 4);

  const pointAt = (theta: number): Pt => {
    const ex = rx * Math.cos(theta);
    const ey = ry * Math.sin(theta);
    return { x: cosPhi * ex - sinPhi * ey + cx, y: sinPhi * ex + cosPhi * ey + cy };
  };
  const tangentAt = (theta: number): Pt => {
    const ex = -rx * Math.sin(theta);
    const ey = ry * Math.cos(theta);
    return { x: cosPhi * ex - sinPhi * ey, y: sinPhi * ex + cosPhi * ey };
  };

  const segments: Array<{ c1: Pt; c2: Pt; to: Pt }> = [];
  for (let i = 0; i < segmentCount; i++) {
    const start = theta1 + i * segmentAngle;
    const end = theta1 + (i + 1) * segmentAngle;
    const p1 = pointAt(start);
    const p2 = pointAt(end);
    const t1 = tangentAt(start);
    const t2 = tangentAt(end);
    segments.push({
      c1: { x: p1.x + alpha * t1.x, y: p1.y + alpha * t1.y },
      c2: { x: p2.x - alpha * t2.x, y: p2.y - alpha * t2.y },
      to: p2,
    });
  }
  // Force the final segment to land exactly on the requested endpoint —
  // the parameterization is mathematically exact, but floating point can
  // drift by an imperceptible-but-nonzero amount over the trig round-trip.
  segments[segments.length - 1].to = to;
  return segments;
}
