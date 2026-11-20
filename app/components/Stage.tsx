"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

export type DoorSide = "left" | "right";
export type ScenarioId =
    | "sneak"
    | "tape"
    | "hamster"
    | "duck"
    // | "juggle"
    | "jetpack"
    | "box"
    | "plug";

export const SCENARIOS: ScenarioId[] = [
    "sneak",
    "tape",
    "hamster",
    "duck",
    // "juggle",
    "jetpack",
    "box",
    "plug",
];

type P = { x: number; y: number };
type Dir = 1 | -1;
type Eyes = "dot" | "wide" | "closed" | "x" | "shades";
type Mouth = "none" | "o" | "scream" | "smile" | "grin" | "frown" | "flat";

const FONT = "ui-monospace, SFMono-Regular, Menlo, monospace";

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeIn = (t: number) => t * t;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const seg = (t: number, start: number, dur: number) => clamp((t - start) / dur, 0, 1);
const flip = (d: Dir): Dir => (d === 1 ? -1 : 1);
const sign = (v: number): Dir => (v < 0 ? -1 : 1);
const deg = (r: number) => (r * 180) / Math.PI;
const mixP = (a: P, b: P, k: number): P => ({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k) });
const mixFeet = (a: [P, P], b: [P, P], k: number): [P, P] => [mixP(a[0], b[0], k), mixP(a[1], b[1], k)];

const standFeet = (x: number, y: number, U: number, spread = 0.9): [P, P] => [
    { x: x - spread * U, y },
    { x: x + spread * U, y },
];

const stepFeet = (
    x: number,
    floorY: number,
    U: number,
    phase: number,
    dir: Dir,
    stride = 1.5,
    lift = 0.7
): [P, P] => {
    const f = (k: number): P => {
        const a = phase + k * Math.PI;
        return {
            x: x + dir * stride * U * Math.sin(a),
            y: floorY - lift * U * Math.max(0, Math.cos(a)),
        };
    };
    return [f(0), f(1)];
};

const starPoints = (cx: number, cy: number, r1: number, r2: number, n: number, rot: number) =>
    Array.from({ length: n * 2 }, (_, i) => {
        const r = i % 2 === 0 ? r2 : r1;
        const a = rot + (i * Math.PI) / n;
        return `${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`;
    }).join(" ");

function joint(a: P, b: P, l1: number, l2: number, bend: number): P {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = clamp(Math.hypot(dx, dy), Math.abs(l1 - l2) + 0.01, l1 + l2 - 0.01);
    const A = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
    const ang = Math.atan2(dy, dx) + bend * A;
    return { x: a.x + Math.cos(ang) * l1, y: a.y + Math.sin(ang) * l1 };
}

function walkWithGlance(ts: number, moveMs: number, pauseMs: number) {
    const half = moveMs / 2;
    let progress: number;
    if (ts < half) progress = ts / moveMs;
    else if (ts < half + pauseMs) progress = 0.5;
    else progress = clamp((ts - pauseMs) / moveMs, 0, 1);
    const plant =
        clamp((ts - (half - 90)) / 90, 0, 1) * (1 - clamp((ts - (half + pauseMs)) / 90, 0, 1));
    const glance =
        clamp((ts - half) / 70, 0, 1) * (1 - clamp((ts - half - pauseMs) / 70, 0, 1));
    return { progress: clamp(progress, 0, 1), plant, glance };
}

interface Layout {
    w: number;
    h: number;
    floorY: number;
    U: number;
    side: DoorSide;
    dir: Dir;
    ink: string;
    pageBg: string;
}

function makeLayout(w: number, h: number, side: DoorSide, pageBg: string): Layout {
    const floorY = h - Math.max(10, h * 0.1);
    const figH = clamp(h * 0.42, 26, 64);
    return {
        w,
        h,
        floorY,
        U: figH / 10.1,
        side,
        dir: side === "right" ? 1 : -1,
        ink: "#0f172a",
        pageBg,
    };
}

interface Pose {
    hip: P;
    feet: [P, P];
    dir?: Dir;
    lean?: number;
    hands?: [P, P];
    handsAbs?: [P | null, P | null];
    look?: number;
    eyes?: Eyes;
    mouth?: Mouth;
    opacity?: number;
    scale?: number;
    lift?: number;
    rot?: number;
    shadow?: number;
    bang?: number;
    sweat?: number;
    ink?: string;
    headFill?: string;
}

interface Figure {
    legs: [P[], P[]];
    arms: [P[], P[]];
    hip: P;
    neck: P;
    head: P;
    shoulder: P;
    td: P;
    headR: number;
    dir: Dir;
    look: number;
    eyes: Eyes;
    mouth: Mouth;
    opacity: number;
    scale: number;
    lift: number;
    rot: number;
    shadow: number;
    bang: number;
    sweat: number;
    ink?: string;
    headFill?: string;
}

function rig(p: Pose, L: Layout): Figure {
    const U = L.U;
    const dir = p.dir ?? 1;
    const legLen = 2.2 * U;
    const armLen = 1.6 * U;
    const torso = 3.2 * U;
    const headR = 1.25 * U;
    const lean = p.lean ?? 0;
    const td: P = { x: Math.sin(dir * lean), y: -Math.cos(dir * lean) };
    const hip = p.hip;
    const along = (k: number): P => ({ x: hip.x + td.x * k, y: hip.y + td.y * k });
    const neck = along(torso);
    const head = along(torso + headR);
    const shoulder = along(torso - 0.4 * U);

    const reach = (from: P, to: P, max: number): P => {
        const d = Math.hypot(to.x - from.x, to.y - from.y);
        if (d <= max) return to;
        const k = max / d;
        return { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k };
    };

    const legs = p.feet.map((f) => {
        const foot = reach(hip, f, legLen * 1.99);
        return [hip, joint(hip, foot, legLen, legLen, -dir), foot];
    }) as [P[], P[]];

    const arms = [0, 1].map((k) => {
        const abs = p.handsAbs?.[k];
        const o = p.hands?.[k] ?? { x: 0, y: 2.8 * U };
        const target = abs ?? { x: shoulder.x + o.x, y: shoulder.y + o.y };
        const hand = reach(shoulder, target, armLen * 1.99);
        return [shoulder, joint(shoulder, hand, armLen, armLen, dir), hand];
    }) as [P[], P[]];

    return {
        legs,
        arms,
        hip,
        neck,
        head,
        shoulder,
        td,
        headR,
        dir,
        look: p.look ?? 0,
        eyes: p.eyes ?? "dot",
        mouth: p.mouth ?? "flat",
        opacity: p.opacity ?? 1,
        scale: p.scale ?? 1,
        lift: p.lift ?? 0,
        rot: p.rot ?? 0,
        shadow: p.shadow ?? 0.9,
        bang: p.bang ?? 0,
        sweat: p.sweat ?? 0,
        ink: p.ink,
        headFill: p.headFill,
    };
}

function drawFigure(f: Figure, L: Layout, key: string): ReactNode {
    const { U, floorY } = L;
    const ink = f.ink ?? L.ink;
    const headFill = f.headFill ?? L.pageBg;
    const sw = Math.max(1.6, U * 0.55);
    const fsw = sw * 0.42;
    const R = f.headR;
    const hx = f.head.x;
    const hy = f.head.y;
    const poly = (pts: P[]) => pts.map((p) => `${p.x},${p.y}`).join(" ");
    const eyeY = hy - R * 0.12;
    const eyeX = (s: number) => hx + s * R * 0.42 + f.look * R * 0.2;
    const mouthY = hy + R * 0.42;
    const mx = hx + f.look * R * 0.12;

    const eyeEls =
        f.eyes === "shades" ? (
            <rect
                x={hx - R * 0.8 + f.look * R * 0.1}
                y={eyeY - R * 0.24}
                width={R * 1.6}
                height={R * 0.46}
                rx={R * 0.16}
                fill={ink}
            />
        ) : (
            [-1, 1].map((s) => {
                const cx = eyeX(s);
                if (f.eyes === "wide") {
                    return (
                        <g key={s}>
                            <circle cx={cx} cy={eyeY} r={R * 0.27} fill="#fff" strokeWidth={fsw * 0.8} />
                            <circle cx={cx + f.look * R * 0.1} cy={eyeY} r={R * 0.1} fill={ink} stroke="none" />
                        </g>
                    );
                }
                if (f.eyes === "closed") {
                    return <line key={s} x1={cx - R * 0.18} x2={cx + R * 0.18} y1={eyeY} y2={eyeY} />;
                }
                if (f.eyes === "x") {
                    const k = R * 0.16;
                    return (
                        <path
                            key={s}
                            d={`M${cx - k} ${eyeY - k} L${cx + k} ${eyeY + k} M${cx + k} ${eyeY - k} L${cx - k} ${eyeY + k}`}
                        />
                    );
                }
                return <circle key={s} cx={cx} cy={eyeY} r={Math.max(0.9, R * 0.14)} fill={ink} stroke="none" />;
            })
        );

    let mouthEl: ReactNode = null;
    if (f.mouth === "o") {
        mouthEl = <ellipse cx={mx} cy={mouthY} rx={R * 0.14} ry={R * 0.2} fill={ink} stroke="none" />;
    } else if (f.mouth === "scream") {
        mouthEl = <ellipse cx={mx} cy={mouthY + R * 0.05} rx={R * 0.28} ry={R * 0.38} fill={ink} stroke="none" />;
    } else if (f.mouth === "smile") {
        mouthEl = <path d={`M${mx - R * 0.36} ${mouthY - R * 0.06} Q${mx} ${mouthY + R * 0.42} ${mx + R * 0.36} ${mouthY - R * 0.06}`} />;
    } else if (f.mouth === "grin") {
        mouthEl = (
            <path
                d={`M${mx - R * 0.45} ${mouthY - R * 0.08} Q${mx} ${mouthY + R * 0.55} ${mx + R * 0.45} ${mouthY - R * 0.08} Z`}
                fill={ink}
            />
        );
    } else if (f.mouth === "frown") {
        mouthEl = <path d={`M${mx - R * 0.32} ${mouthY + R * 0.14} Q${mx} ${mouthY - R * 0.3} ${mx + R * 0.32} ${mouthY + R * 0.14}`} />;
    } else if (f.mouth === "flat") {
        mouthEl = <line x1={mx - R * 0.28} x2={mx + R * 0.28} y1={mouthY} y2={mouthY} />;
    }

    const sweatEls =
        f.sweat > 0
            ? [0, 0.5].map((o) => {
                  const ph = (f.sweat + o) % 1;
                  const sx = hx + R * 1.05;
                  const sy = hy - R * 0.5 + ph * R * 1.7;
                  const r = R * 0.22;
                  return (
                      <path
                          key={o}
                          d={`M${sx} ${sy - r * 1.5} Q${sx + r} ${sy} ${sx} ${sy + r * 0.6} Q${sx - r} ${sy} ${sx} ${sy - r * 1.5}`}
                          fill="#60a5fa"
                          stroke="none"
                          opacity={1 - ph}
                      />
                  );
              })
            : null;

    const transform =
        `translate(0 ${f.lift}) rotate(${deg(f.rot)} ${f.hip.x} ${f.hip.y}) ` +
        `translate(${f.hip.x} ${floorY}) scale(${f.scale}) translate(${-f.hip.x} ${-floorY})`;

    return (
        <g key={key}>
            {f.shadow > 0 && (
                <ellipse
                    cx={f.hip.x}
                    cy={floorY}
                    rx={1.7 * U * f.scale}
                    ry={0.35 * U}
                    fill="rgba(15,23,42,0.14)"
                    opacity={f.shadow * f.opacity}
                />
            )}
            <g opacity={f.opacity} transform={transform}>
                <g stroke={ink} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" fill="none">
                    <polyline points={poly(f.legs[0])} />
                    <polyline points={poly(f.legs[1])} />
                    <line x1={f.hip.x} y1={f.hip.y} x2={f.neck.x} y2={f.neck.y} />
                    <polyline points={poly(f.arms[0])} />
                    <polyline points={poly(f.arms[1])} />
                    <circle cx={hx} cy={hy} r={R} fill={headFill} />
                </g>
                <g stroke={ink} strokeWidth={fsw} strokeLinecap="round" strokeLinejoin="round" fill="none">
                    {eyeEls}
                    {mouthEl}
                </g>
                {sweatEls}
                {f.bang > 0.02 && (
                    <text
                        x={0}
                        y={0}
                        transform={`translate(${hx} ${hy - R - 0.5 * U}) scale(${f.bang})`}
                        fontSize={2.6 * U}
                        fontWeight={800}
                        textAnchor="middle"
                        fill="#ef4444"
                    >
                        !
                    </text>
                )}
            </g>
        </g>
    );
}

function bubble(L: Layout, cx: number, bottomY: number, text: string, scale = 1, key = "bub"): ReactNode {
    if (scale <= 0.02) return null;
    const { U, w, ink } = L;
    const fs = clamp(U * 1.5, 6.5, 11);
    const tw = text.length * fs * 0.6 + fs * 1.3;
    const bh = fs * 1.9;
    const tail = fs * 0.8;
    const x = clamp(cx, tw / 2 + 2, Math.max(tw / 2 + 2, w - tw / 2 - 2));
    const y = Math.max(bottomY, bh + tail + 2);
    const tx = clamp(cx - x, -tw / 2 + fs * 0.9, tw / 2 - fs * 0.9);
    return (
        <g key={key} transform={`translate(${x} ${y}) scale(${scale})`}>
            <rect x={-tw / 2} y={-bh - tail} width={tw} height={bh} rx={fs * 0.6} fill="#fff" stroke={ink} strokeWidth={0.9} />
            <polygon points={`${tx - fs * 0.5},${-tail - 0.6} ${tx + fs * 0.5},${-tail - 0.6} ${tx},0`} fill="#fff" />
            <polyline
                points={`${tx - fs * 0.5},${-tail} ${tx},0 ${tx + fs * 0.5},${-tail}`}
                fill="none"
                stroke={ink}
                strokeWidth={0.9}
                strokeLinejoin="round"
            />
            <text
                x={0}
                y={-tail - bh / 2}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={fs}
                fontFamily={FONT}
                fill={ink}
            >
                {text}
            </text>
        </g>
    );
}

function drawDuck(cx: number, cy: number, s: number, face: Dir, key: string): ReactNode {
    return (
        <g key={key}>
            <ellipse cx={cx} cy={cy} rx={1.15 * s} ry={0.8 * s} fill="#facc15" stroke="#ca8a04" strokeWidth={0.12 * s} />
            <path
                d={`M${cx - face * 0.9 * s} ${cy - 0.1 * s} Q${cx - face * 1.6 * s} ${cy - 0.9 * s} ${cx - face * 1.2 * s} ${cy - 1.15 * s}`}
                fill="none"
                stroke="#ca8a04"
                strokeWidth={0.14 * s}
                strokeLinecap="round"
            />
            <circle cx={cx + face * 0.85 * s} cy={cy - 0.95 * s} r={0.62 * s} fill="#facc15" stroke="#ca8a04" strokeWidth={0.12 * s} />
            <polygon
                points={`${cx + face * 1.4 * s},${cy - 1.05 * s} ${cx + face * 2.1 * s},${cy - 0.85 * s} ${cx + face * 1.4 * s},${cy - 0.7 * s}`}
                fill="#fb923c"
            />
            <circle cx={cx + face * 1.0 * s} cy={cy - 1.1 * s} r={0.1 * s} fill="#0f172a" />
            <path
                d={`M${cx - face * 0.5 * s} ${cy - 0.1 * s} Q${cx - face * 0.1 * s} ${cy + 0.5 * s} ${cx + face * 0.5 * s} ${cy - 0.1 * s}`}
                fill="none"
                stroke="#ca8a04"
                strokeWidth={0.12 * s}
                strokeLinecap="round"
            />
        </g>
    );
}

function drawBox(cx: number, cy: number, bw: number, bh: number, U: number, tilt: number, key: string): ReactNode {
    return (
        <g key={key} transform={`translate(${cx} ${cy}) rotate(${tilt})`}>
            <path
                d={`M${-bw / 2} ${-bh / 2} l${-0.9 * U} ${-0.9 * U} M${bw / 2} ${-bh / 2} l${0.9 * U} ${-0.9 * U}`}
                stroke="#7c5426"
                strokeWidth={0.4 * U}
                strokeLinecap="round"
                fill="none"
            />
            <rect x={-bw / 2} y={-bh / 2} width={bw} height={bh} fill="#c08a4b" stroke="#7c5426" strokeWidth={0.4 * U} />
            <rect x={-0.55 * U} y={-bh / 2} width={1.1 * U} height={bh} fill="#d9b382" opacity={0.9} />
            <path
                d={`M${bw * 0.25} ${bh * 0.3} V${bh * 0.0} M${bw * 0.25 - 0.7 * U} ${bh * 0.12} L${bw * 0.25} ${-bh * 0.04} L${bw * 0.25 + 0.7 * U} ${bh * 0.12}`}
                stroke="#7c5426"
                strokeWidth={0.35 * U}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
            />
        </g>
    );
}

interface Frame {
    fade: number;
    bg?: ReactNode;
    figs: Figure[];
    fg?: ReactNode;
    dim?: number;
}

interface Scenario {
    end: number;
    sample: (t: number, idle: number) => Frame;
}
type Builder = (L: Layout) => Scenario;

const sneakScenario: Builder = (L) => {
    const { w, h, floorY, U, dir: doorDir, pageBg } = L;
    const dw = clamp(w * 0.2, 30, 70);
    const dh = clamp(h * 0.72, 44, floorY - 8);
    const margin = Math.max(8, w * 0.04);
    const doorX = doorDir === 1 ? w - margin - dw : margin;
    const doorY = floorY - dh;
    const doorCx = doorX + dw / 2;
    const startX = doorDir === 1 ? w * 0.28 : w * 0.72;
    const nearEdge = doorDir === 1 ? doorX : doorX + dw;
    const D = Math.abs(doorCx - startX);
    const pn = clamp((nearEdge - startX) / (doorCx - startX), 0, 0.98);

    const reactAt = 120;
    const hopMs = 380;
    const openAt = 420;
    const openMs = 420;
    const sneakAt = 880;
    const sneakMs = clamp((D / 180) * 1000, 500, 1600);
    const glanceMs = 420;
    const closeAt = sneakAt + sneakMs + glanceMs + 120;
    const closeMs = 380;
    const fadeAt = closeAt + closeMs + 250;
    const fadeMs = 500;

    const sample = (t: number, idle: number): Frame => {
        const fade = t < 0 ? 1 : 1 - seg(t, fadeAt, fadeMs);
        const curtain =
            t < 0
                ? 0
                : clamp(easeOut(seg(t, openAt, openMs)) - easeInOut(seg(t, closeAt, closeMs)), 0, 1);

        const sway = Math.sin(idle * 0.004);
        let dir: Dir = flip(doorDir);
        let hipX = startX;
        let hipY = floorY - 4.2 * U + sway * 0.08 * U;
        let lean = 0;
        let air = 0;
        let bang = 0;
        let look: number = dir * 0.7;
        let opacity = 1;
        let scale = 1;
        let lift = 0;
        let sweat = 0;
        let eyes: Eyes = "dot";
        let mouth: Mouth = Math.sin(idle * 0.012) > 0 ? "o" : "flat";
        let feet = standFeet(hipX, floorY, U, 0.8);
        let hands: [P, P] = [
            { x: dir * 0.4 * U + sway * 0.25 * U, y: 2.9 * U },
            { x: -dir * 0.3 * U - sway * 0.25 * U, y: 2.9 * U },
        ];

        if (t >= reactAt) dir = t < reactAt + hopMs * 0.45 ? flip(doorDir) : doorDir;

        if (t >= reactAt && t < sneakAt) {
            const p = seg(t, reactAt, hopMs);
            air = Math.sin(Math.PI * p) * 1.6 * U;
            const shake = p >= 1 ? Math.sin(t * 0.09) * 0.14 * U : 0;
            hipX = startX + shake;
            hipY = floorY - (p < 1 ? 4.0 * U + air : 3.5 * U);
            lean = p < 1 ? 0 : -0.15;
            const footY = floorY - air * 0.92;
            feet = [
                { x: hipX - 0.9 * U, y: footY },
                { x: hipX + 0.9 * U, y: footY },
            ];
            hands =
                p < 1
                    ? [
                          { x: -1.3 * U, y: -2.7 * U },
                          { x: 1.3 * U, y: -2.7 * U },
                      ]
                    : [
                          { x: dir * 1.5 * U, y: 0.9 * U },
                          { x: dir * 1.1 * U, y: 1.7 * U },
                      ];
            bang = easeOut(seg(t, reactAt, 160)) * (1 - seg(t, sneakAt - 150, 150));
            eyes = "wide";
            mouth = p < 1 ? "scream" : "o";
            look = dir * 0.8;
            sweat = t * 0.0015 + 0.01;
        }

        if (t >= sneakAt) {
            const ts = t - sneakAt;
            const wg = walkWithGlance(ts, sneakMs, glanceMs);
            const ang0 = 2 * Math.PI * ((wg.progress * D) / (6 * U));
            hipX = lerp(startX, doorCx, wg.progress);
            hipY = floorY - 3.4 * U - Math.abs(Math.sin(ang0)) * 0.18 * U * (1 - wg.plant);
            lean = 0.5;
            look = doorDir * (1 - 2 * wg.glance);
            eyes = "dot";
            mouth = wg.glance > 0.5 ? "o" : "flat";
            const walk = stepFeet(hipX, floorY, U, ang0, dir);
            const planted: [P, P] = [
                { x: hipX - dir * 0.9 * U, y: floorY },
                { x: hipX + dir * 0.9 * U, y: floorY },
            ];
            feet = mixFeet(walk, planted, wg.plant);
            hands = [0, 1].map((k) => ({
                x: dir * (0.8 * U - 0.9 * U * Math.sin(ang0 + k * Math.PI)),
                y: 2.3 * U,
            })) as [P, P];
            const u = wg.progress > pn ? (wg.progress - pn) / (1 - pn) : 0;
            scale = 1 - 0.65 * u;
            opacity = 1 - Math.pow(u, 1.6);
            lift = -dh * 0.1 * u;
        }

        const visible = opacity > 0.01 && scale > 0.01;
        const figs = visible
            ? [
                  rig(
                      {
                          hip: { x: hipX, y: hipY },
                          feet,
                          hands,
                          dir,
                          lean,
                          look,
                          eyes,
                          mouth,
                          opacity,
                          scale,
                          lift,
                          bang,
                          sweat,
                          shadow: clamp(1 - air / (3 * U), 0.3, 1) * 0.9,
                      },
                      L
                  ),
              ]
            : [];

        const sx = 1 - 0.82 * curtain;
        const half = dw / 2;
        const fs = clamp(dw * 0.15, 5, 9);
        const folds = [0.25, 0.5, 0.75];
        const curtainHalf = (x0: number, anchor: number, key: string) => (
            <g key={key} transform={`translate(${anchor} 0) scale(${sx} 1) translate(${-anchor} 0)`}>
                <rect x={x0} y={doorY - 2} width={half + 0.5} height={dh + 2} fill={pageBg} />
                {folds.map((f) => (
                    <line
                        key={f}
                        x1={x0 + half * f}
                        x2={x0 + half * f}
                        y1={doorY}
                        y2={doorY + dh}
                        stroke="rgba(15,23,42,0.12)"
                        vectorEffect="non-scaling-stroke"
                    />
                ))}
                <line
                    x1={doorX + half}
                    x2={doorX + half}
                    y1={doorY}
                    y2={doorY + dh}
                    stroke="rgba(15,23,42,0.22)"
                    vectorEffect="non-scaling-stroke"
                />
            </g>
        );

        const bg = (
            <g>
                <rect x={doorX} y={doorY} width={dw} height={dh} rx={2} fill="#0b1220" />
                <text x={doorX + dw / 2} y={doorY + fs + 3} fontSize={fs} textAnchor="middle" fill="#4ade80" fontFamily={FONT}>
                    BACKEND
                </text>
                {[0.55, 0.4, 0.62, 0.3].map((cw, i) => (
                    <rect
                        key={i}
                        x={doorX + dw * 0.14}
                        y={doorY + dh * (0.28 + i * 0.16)}
                        width={dw * cw}
                        height={Math.max(1.5, dh * 0.03)}
                        fill="#22c55e"
                        opacity={0.7}
                    />
                ))}
                {curtainHalf(doorX, doorX, "cl")}
                {curtainHalf(doorX + half - 0.5, doorX + dw, "cr")}
                <line x1={doorX - 3} x2={doorX + dw + 3} y1={doorY - 2} y2={doorY - 2} stroke="#94a3b8" strokeWidth={2} strokeLinecap="round" />
            </g>
        );

        return { fade, bg, figs };
    };

    return { end: fadeAt + fadeMs, sample };
};

const tapeScenario: Builder = (L) => {
    const { w, floorY, U } = L;
    const x0 = w * 0.5 - 2.5 * U;
    const fracs = [0.5, 0.12, 0.88, 0.3, 0.7, 0.2];
    const stopX = fracs.map((f) => w * (0.12 + 0.76 * f));
    const xs = [x0, ...stopX, w * 0.5];
    const n = stopX.length;
    const levels = [0.2, 0.8, 0.5, 0.95, 0.3, 0.65];
    const angles = [-14, 10, -4, 18, -22, 6];
    const lens = [6, 7, 5.5, 8, 6.5, 7].map((v) => v * U);
    const freezeMs = 520;
    const gap = 300;
    const travel = 160;
    const lastTravel = 300;
    const holdEnd = freezeMs + n * gap + lastTravel + 1100;
    const fadeMs = 450;
    const signW = clamp(Math.min(w * 0.5, 14 * U), 40, 120);
    const signH = signW * 0.36;
    const crackX = x0 + 1.9 * U;
    const crackY = floorY - 7.2 * U;
    const stripY = (k: number) => floorY - (4.5 + 3 * levels[k]) * U;
    const dirOf = (k: number): Dir => (Math.abs(xs[k + 1] - xs[k]) > 1 ? sign(xs[k + 1] - xs[k]) : 1);

    const sample = (t: number, idle: number): Frame => {
        const fade = t < 0 ? 1 : 1 - seg(t, holdEnd, fadeMs);
        let x = x0;
        let dir: Dir = 1;
        let hipY = floorY - 4.2 * U;
        let lean = 0.2;
        let eyes: Eyes = "dot";
        let mouth: Mouth = "flat";
        let look = 0.8;
        let bang = 0;
        let sweat = 0;
        let signP = 0;
        let feet: [P, P] = standFeet(x, floorY, U, 0.8);
        let hands: [P, P] = [
            { x: -0.6 * U, y: 2.6 * U },
            { x: 0, y: 2.8 * U },
        ];
        let handsAbs: [P | null, P | null] = [null, null];
        const prog = 0.5 + 0.5 * Math.sin(idle * 0.002);

        if (t < 0) {
            handsAbs = [null, { x: crackX, y: crackY + (0.1 + 2.7 * prog) * U }];
        } else if (t < freezeMs) {
            const p = seg(t, 60, 300);
            const air = Math.sin(Math.PI * p) * 1.0 * U;
            hipY = floorY - 4.2 * U - air;
            lean = 0;
            eyes = "wide";
            mouth = "scream";
            look = 0;
            feet = standFeet(x, floorY - air * 0.9, U, 0.9);
            hands = [
                { x: -1.3 * U, y: -2.7 * U },
                { x: 1.3 * U, y: -2.7 * U },
            ];
            bang = easeOut(seg(t, 60, 150)) * (1 - seg(t, freezeMs - 150, 150));
            sweat = t * 0.0015 + 0.01;
        } else {
            const k = Math.min(n, Math.floor((t - freezeMs) / gap));
            const local = t - (freezeMs + k * gap);
            const trav = k === n ? lastTravel : travel;
            const p = seg(local, 0, trav);
            x = lerp(xs[k], xs[k + 1], easeInOut(p));
            dir = dirOf(k);
            sweat = t * 0.0015 + 0.01;
            look = dir * 0.6;
            if (p < 1 && Math.abs(xs[k + 1] - xs[k]) > 1) {
                const phase = t * 0.03;
                hipY = floorY - 3.9 * U - Math.abs(Math.sin(phase)) * 0.25 * U;
                lean = 0.35;
                feet = stepFeet(x, floorY, U, phase, dir, 1.7, 0.9);
                hands = [
                    { x: dir * 1.2 * U * Math.sin(phase), y: 2.0 * U },
                    { x: -dir * 1.2 * U * Math.sin(phase), y: 2.0 * U },
                ];
                eyes = "wide";
                mouth = "o";
            } else {
                hipY = floorY - 4.0 * U;
                lean = 0.2;
                feet = standFeet(x, floorY, U, 0.9);
                hands = [
                    { x: -dir * 0.6 * U, y: 2.6 * U },
                    { x: 0, y: 2.8 * U },
                ];
                if (k < n) {
                    const s = local - trav;
                    handsAbs = [null, { x: x + dir * 1.8 * U, y: stripY(k) + Math.sin(s * 0.05) * 0.6 * U }];
                } else {
                    handsAbs = [null, { x: x + dir * 1.2 * U, y: floorY - 9.6 * U }];
                    mouth = "grin";
                    look = 0;
                    signP = easeOut(seg(local, trav, 180));
                }
            }
        }

        const fig = rig(
            { hip: { x, y: hipY }, feet, hands, handsAbs, dir, lean, look, eyes, mouth, bang, sweat },
            L
        );

        const layLen = t < 0 ? 0.1 + 2.7 * prog : 2.8;
        const strips: ReactNode[] = [];
        for (let k = 0; k < n; k++) {
            const pr = t < 0 ? 0 : easeOut(seg(t, freezeMs + k * gap + travel + 40, 140));
            if (pr <= 0.02) continue;
            const d = dirOf(k);
            strips.push(
                <g key={`s${k}`} transform={`translate(${xs[k + 1] + d * 1.8 * U} ${stripY(k)}) rotate(${angles[k]}) scale(${pr} 1)`}>
                    <rect x={-lens[k] / 2} y={-0.45 * U} width={lens[k]} height={0.9 * U} rx={0.15 * U} fill="#e7e5e4" stroke="#a8a29e" strokeWidth={0.6} opacity={0.95} />
                </g>
            );
        }

        const bg = (
            <g>
                <path
                    d={`M${crackX} ${crackY} l${0.7 * U} ${1.2 * U} l${-0.9 * U} ${1.2 * U} l${0.8 * U} ${1.3 * U} l${-0.6 * U} ${1.1 * U}`}
                    fill="none"
                    stroke="rgba(15,23,42,0.45)"
                    strokeWidth={1.2}
                    strokeLinejoin="round"
                />
                <rect x={crackX - 0.2 * U} y={crackY} width={0.9 * U} height={layLen * U} fill="#e7e5e4" stroke="#a8a29e" strokeWidth={0.5} opacity={0.9} />
                {strips}
            </g>
        );

        const roll = fig.arms[0][2];
        const hnd = fig.arms[1][2];
        const fg = (
            <g>
                <circle cx={roll.x} cy={roll.y} r={0.9 * U} fill="none" stroke="#a16207" strokeWidth={0.45 * U} />
                {signP > 0.02 && (
                    <g transform={`translate(${hnd.x} ${hnd.y}) scale(${signP})`}>
                        <line x1={0} y1={0} x2={0} y2={-2 * U} stroke="#92400e" strokeWidth={0.5 * U} strokeLinecap="round" />
                        <rect x={-signW / 2} y={-2 * U - signH} width={signW} height={signH} rx={0.4 * U} fill="#fef3c7" stroke="#92400e" strokeWidth={0.35 * U} />
                        <text
                            x={0}
                            y={-2 * U - signH / 2}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fontSize={clamp(signH * 0.42, 6, 11)}
                            fontWeight={800}
                            fontFamily={FONT}
                            fill="#78350f"
                        >
                            ALL FINE
                        </text>
                    </g>
                )}
            </g>
        );

        return { fade, bg, figs: [fig], fg };
    };

    return { end: holdEnd + fadeMs, sample };
};

const hamsterScenario: Builder = (L) => {
    const { w, floorY, U, dir: exitDir } = L;
    const wheelR = clamp(Math.min(w * 0.22, floorY * 0.65), 22, 54);
    const wheelCx = w * 0.5;
    const wheelCy = floorY - wheelR - 0.6 * U;
    const rimY = wheelCy + wheelR;

    const reactAt = 150;
    const spinStart = 420;
    const spinMs = 1100;
    const launchAt = spinStart + spinMs;
    const launchMs = 550;
    const fadeAt = launchAt + launchMs + 150;
    const fadeMs = 450;

    const sample = (t: number, idle: number): Frame => {
        const fade = t < 0 ? 1 : 1 - seg(t, fadeAt, fadeMs);
        let dir: Dir = exitDir;
        let hipX = wheelCx;
        let hipY = rimY - 3.6 * U;
        let lean = 0.25;
        let eyes: Eyes = "dot";
        let mouth: Mouth = "flat";
        let look = dir * 0.7;
        let bang = 0;
        let sweat = 0;
        let rot = 0;
        let opacity = 1;
        let wheelAngle = idle * 0.004 * exitDir;
        let feet: [P, P];
        let hands: [P, P];

        if (t < 0) {
            const ph = idle * 0.012;
            hipY = rimY - 3.5 * U - Math.abs(Math.sin(ph)) * 0.14 * U;
            lean = 0.28;
            feet = stepFeet(wheelCx, rimY, U, ph, dir, 1.2, 0.55);
            hands = [
                { x: dir * 0.9 * U * Math.sin(ph), y: 2.1 * U },
                { x: -dir * 0.9 * U * Math.sin(ph), y: 2.1 * U },
            ];
            mouth = Math.sin(idle * 0.008) > 0.4 ? "smile" : "flat";
        } else if (t < spinStart) {
            const p = seg(t, reactAt, spinStart - reactAt);
            const hop = Math.sin(Math.PI * p) * 0.9 * U;
            hipY = rimY - 3.6 * U - hop;
            lean = 0.05;
            eyes = "wide";
            mouth = p > 0.4 ? "scream" : "o";
            look = 0;
            bang = easeOut(seg(t, reactAt, 140));
            sweat = t * 0.0016 + 0.01;
            feet = standFeet(wheelCx, rimY - hop * 0.85, U, 0.85);
            hands = [
                { x: -1.2 * U, y: -2.2 * U },
                { x: 1.2 * U, y: -2.2 * U },
            ];
            wheelAngle = idle * 0.004 * exitDir + p * 0.6 * exitDir;
        } else if (t < launchAt) {
            const p = seg(t, spinStart, spinMs);
            const speed = lerp(0.018, 0.065, easeIn(p));
            const ph = t * speed;
            hipY = rimY - 3.4 * U - Math.abs(Math.sin(ph)) * 0.18 * U;
            lean = lerp(0.35, 0.72, p);
            eyes = p > 0.65 ? "x" : "wide";
            mouth = "scream";
            look = dir * 0.9;
            bang = 1 - p * 0.7;
            sweat = t * 0.002 + 0.01;
            feet = stepFeet(wheelCx, rimY, U, ph, dir, 1.5, 0.65);
            hands = [
                { x: dir * 1.4 * U * Math.sin(ph), y: 1.6 * U },
                { x: -dir * 1.4 * U * Math.sin(ph), y: 1.6 * U },
            ];
            wheelAngle += easeIn(p) * 14 * exitDir;
        } else {
            const p = seg(t, launchAt, launchMs);
            const e = easeIn(p);
            hipX = wheelCx + exitDir * e * (w * 0.75 + 40);
            hipY = rimY - 3.6 * U - Math.sin(Math.PI * Math.min(p, 0.7)) * 1.5 * U;
            lean = 0.82;
            rot = exitDir * 0.35 * e;
            eyes = "wide";
            mouth = "scream";
            look = exitDir;
            sweat = t * 0.002 + 0.01;
            opacity = 1 - clamp((p - 0.65) / 0.35, 0, 1);
            const ph = t * 0.07;
            feet = stepFeet(hipX, hipY + 3.6 * U, U, ph, dir, 1.6, 0.7);
            hands = [
                { x: exitDir * 1.8 * U, y: -0.6 * U },
                { x: exitDir * 1.5 * U, y: 0.4 * U },
            ];
            wheelAngle += (14 + p * 12) * exitDir;
        }

        const fig = rig(
            {
                hip: { x: hipX, y: hipY },
                feet,
                hands,
                dir,
                lean,
                look,
                eyes,
                mouth,
                bang,
                sweat,
                rot,
                opacity,
            },
            L
        );

        const spokes = [0, 1, 2, 3];
        const bg = (
            <g>
                <line
                    x1={wheelCx - wheelR * 0.45}
                    x2={wheelCx + wheelR * 0.45}
                    y1={floorY}
                    y2={floorY}
                    stroke="#64748b"
                    strokeWidth={Math.max(1.5, 0.35 * U)}
                    strokeLinecap="round"
                />
                <line
                    x1={wheelCx}
                    x2={wheelCx}
                    y1={floorY}
                    y2={wheelCy}
                    stroke="#64748b"
                    strokeWidth={Math.max(1.2, 0.25 * U)}
                />
                <g transform={`translate(${wheelCx} ${wheelCy}) rotate(${deg(wheelAngle)})`}>
                    <circle cx={0} cy={0} r={wheelR} fill="none" stroke="#94a3b8" strokeWidth={Math.max(1.6, 0.35 * U)} />
                    <circle cx={0} cy={0} r={wheelR * 0.84} fill="none" stroke="#cbd5e1" strokeWidth={0.8} strokeDasharray="3 3" />
                    {spokes.map((i) => {
                        const a = (i * Math.PI) / 4;
                        return (
                            <line
                                key={i}
                                x1={-Math.cos(a) * wheelR}
                                y1={-Math.sin(a) * wheelR}
                                x2={Math.cos(a) * wheelR}
                                y2={Math.sin(a) * wheelR}
                                stroke="#cbd5e1"
                                strokeWidth={0.9}
                            />
                        );
                    })}
                    <circle cx={0} cy={0} r={Math.max(1.5, 0.35 * U)} fill="#64748b" />
                </g>
            </g>
        );

        return { fade, bg, figs: [fig] };
    };

    return { end: fadeAt + fadeMs, sample };
};

const duckScenario: Builder = (L) => {
    const { w, floorY, U, dir: marchDir } = L;
    const duckS = clamp(U * 0.55, 2.2, 5.2);
    const startX = w * 0.5;
    const dropAt = 80;
    const dropMs = 320;
    const paradeAt = 520;
    const paradeMs = 1400;
    const fadeAt = paradeAt + paradeMs + 250;
    const fadeMs = 450;

    const sample = (t: number, idle: number): Frame => {
        const fade = t < 0 ? 1 : 1 - seg(t, fadeAt, fadeMs);
        let hipX = startX;
        let hipY = floorY - 4.1 * U;
        let dir: Dir = marchDir;
        let lean = 0.08;
        let eyes: Eyes = "dot";
        let mouth: Mouth = "flat";
        let look: number = marchDir * 0.5;
        let bang = 0;
        let sweat = 0;
        let feet: [P, P] = standFeet(hipX, floorY, U, 0.85);
        let hands: [P, P] = [
            { x: -0.7 * U, y: 2.5 * U },
            { x: 0.7 * U, y: 2.5 * U },
        ];

        const duckDropP = t < 0 ? 0 : easeOut(seg(t, dropAt, dropMs));
        const duckLandingY = floorY - 0.8 * duckS;
        const duckX = startX + marchDir * 2.6 * U;
        const duckY = t < 0 ? -20 : lerp(-16, duckLandingY, duckDropP);
        const squeakScale =
            t >= dropAt + dropMs && t < paradeAt + 300
                ? Math.sin(clamp((t - (dropAt + dropMs)) / 240, 0, 1) * Math.PI)
                : 0;

        if (t >= dropAt + dropMs * 0.6 && t < paradeAt) {
            eyes = "wide";
            mouth = "o";
            bang = easeOut(seg(t, dropAt + dropMs * 0.6, 140));
            look = marchDir * 0.9;
            hands = [
                { x: -1.1 * U, y: 1.5 * U },
                { x: 1.1 * U, y: 1.5 * U },
            ];
        } else if (t >= paradeAt) {
            const p = seg(t, paradeAt, paradeMs);
            const ph = t * 0.025;
            hipX = lerp(startX, marchDir === 1 ? w + 3 * U : -3 * U, easeInOut(p));
            hipY = floorY - 3.9 * U - Math.abs(Math.sin(ph)) * 0.2 * U;
            lean = 0.22;
            eyes = "dot";
            mouth = "smile";
            look = marchDir * 0.8;
            sweat = t * 0.0014 + 0.01;
            feet = stepFeet(hipX, floorY, U, ph, marchDir, 1.4, 0.7);
            hands = [
                { x: marchDir * 1.1 * U * Math.sin(ph), y: 2.1 * U },
                { x: -marchDir * 1.1 * U * Math.sin(ph), y: 2.1 * U },
            ];
        } else if (t < 0) {
            hipY = floorY - 4.1 * U + Math.sin(idle * 0.003) * 0.08 * U;
        }

        const fig = rig(
            { hip: { x: hipX, y: hipY }, feet, hands, dir, lean, look, eyes, mouth, bang, sweat },
            L
        );

        const paradeDucks: ReactNode[] = [];
        if (t >= paradeAt) {
            const p = seg(t, paradeAt, paradeMs);
            for (let i = 0; i < 6; i++) {
                const delay = i * 0.09;
                const dp = clamp((p - delay) / (1 - delay), 0, 1);
                if (dp <= 0) continue;
                const dStart = duckX - marchDir * (i + 1) * 2.8 * U;
                const dEnd = marchDir === 1 ? w + (i + 2) * 2.8 * U : -((i + 2) * 2.8 * U);
                const dx = lerp(dStart, dEnd, dp);
                const bob = Math.abs(Math.sin(t * 0.02 + i)) * 0.45 * duckS;
                paradeDucks.push(drawDuck(dx, duckLandingY - bob, duckS * 0.88, marchDir, `pd${i}`));
            }
        }

        const fg = (
            <g>
                {drawDuck(duckX, duckY, duckS, flip(marchDir), "heroDuck")}
                {paradeDucks}
                {bubble(L, duckX, duckY - 1.8 * duckS, "SQUEAK!", squeakScale, "sq")}
            </g>
        );

        return { fade, figs: [fig], fg };
    };

    return { end: fadeAt + fadeMs, sample };
};

const juggleScenario: Builder = (L) => {
    const { w, floorY, U } = L;
    const cx = w * 0.5;
    const hipY = floorY - 4.0 * U;
    const r = clamp(U * 0.55, 2.2, 5);
    const colors = ["#38bdf8", "#f472b6", "#a78bfa"];

    const dropAt = 240;
    const scrambleMs = 900;
    const shrugAt = dropAt + scrambleMs;
    const fadeAt = shrugAt + 950;
    const fadeMs = 450;

    const sample = (t: number, idle: number): Frame => {
        const fade = t < 0 ? 1 : 1 - seg(t, fadeAt, fadeMs);
        let x = cx;
        let dir: Dir = 1;
        let lean = 0.05;
        let eyes: Eyes = "dot";
        let mouth: Mouth = "smile";
        let look = 0;
        let bang = 0;
        let sweat = 0;
        let feet: [P, P] = standFeet(x, floorY, U, 0.85);
        let hands: [P, P] = [
            { x: -1.4 * U, y: 1.4 * U },
            { x: 1.4 * U, y: 1.4 * U },
        ];

        const ballPos = (i: number): P => {
            if (t < 0) {
                const ph = idle * 0.006 + (i * Math.PI * 2) / 3;
                return {
                    x: cx + Math.cos(ph) * 2.3 * U,
                    y: floorY - 6.8 * U - Math.sin(ph) * 1.3 * U,
                };
            }
            if (i === 0 && t >= dropAt) {
                const p = seg(t, dropAt, scrambleMs);
                const startP = { x: cx - 1.8 * U, y: floorY - 6.8 * U };
                const bounceY = floorY - r;
                const rawY = startP.y + (bounceY - startP.y) * easeIn(clamp(p * 1.4, 0, 1));
                const rebound = p > 0.7 ? Math.abs(Math.sin(((p - 0.7) / 0.3) * Math.PI)) * 1.8 * U : 0;
                return {
                    x: lerp(startP.x, cx - 2.6 * U, p),
                    y: Math.min(bounceY, rawY) - rebound,
                };
            }
            const ph = t * 0.011 + (i * Math.PI * 2) / 3;
            return {
                x: x + Math.cos(ph) * 2.1 * U,
                y: floorY - 6.6 * U - Math.sin(ph) * 1.1 * U,
            };
        };

        if (t >= dropAt && t < shrugAt) {
            const p = seg(t, dropAt, scrambleMs);
            const ph = t * 0.035;
            x = cx - p * 1.4 * U;
            dir = -1;
            lean = 0.35;
            eyes = "wide";
            mouth = "scream";
            look = -0.9;
            bang = easeOut(seg(t, dropAt, 140)) * (1 - seg(t, shrugAt - 120, 120));
            sweat = t * 0.0018 + 0.01;
            feet = stepFeet(x, floorY, U, ph, dir, 1.3, 0.6);
            hands = [
                { x: -1.8 * U, y: 0.4 * U + Math.sin(ph) * 0.8 * U },
                { x: 1.5 * U, y: 0.8 * U - Math.sin(ph) * 0.8 * U },
            ];
        } else if (t >= shrugAt) {
            const p = easeOut(seg(t, shrugAt, 220));
            x = cx - 1.4 * U;
            dir = 1;
            lean = 0;
            eyes = "closed";
            mouth = "flat";
            look = 0;
            feet = standFeet(x, floorY, U, 0.9);
            hands = [
                { x: -1.8 * U * p, y: lerp(1.5 * U, -0.5 * U, p) },
                { x: 1.8 * U * p, y: lerp(1.5 * U, -0.5 * U, p) },
            ];
        }

        const fig = rig(
            { hip: { x, y: hipY }, feet, hands, dir, lean, look, eyes, mouth, bang, sweat },
            L
        );

        const fg = (
            <g>
                {[0, 1, 2].map((i) => {
                    const bp = ballPos(i);
                    return <circle key={i} cx={bp.x} cy={bp.y} r={r} fill={colors[i]} stroke={L.ink} strokeWidth={0.9} />;
                })}
            </g>
        );

        return { fade, figs: [fig], fg };
    };

    return { end: fadeAt + fadeMs, sample };
};

const jetpackScenario: Builder = (L) => {
    const { w, h, floorY, U, dir: exitDir } = L;
    const startX = w * 0.5;
    const igniteAt = 260;
    const blastAt = 620;
    const blastMs = 600;
    const fadeAt = blastAt + blastMs + 150;
    const fadeMs = 450;

    const sample = (t: number, idle: number): Frame => {
        const fade = t < 0 ? 1 : 1 - seg(t, fadeAt, fadeMs);
        let hipX = startX;
        let hipY = floorY - 4.0 * U;
        let dir: Dir = exitDir;
        let lean = 0.1;
        let rot = 0;
        let eyes: Eyes = "dot";
        let mouth: Mouth = "smile";
        let look: number = exitDir * 0.6;
        let bang = 0;
        let sweat = 0;
        let opacity = 1;
        let flame = 0;
        let feet: [P, P] = standFeet(hipX, floorY, U, 0.85);
        let hands: [P, P] = [
            { x: -0.9 * U, y: 1.5 * U },
            { x: 0.9 * U, y: 1.5 * U },
        ];

        if (t >= igniteAt && t < blastAt) {
            const p = seg(t, igniteAt, blastAt - igniteAt);
            flame = 0.6 + 0.4 * Math.sin(t * 0.08);
            hipX = startX + Math.sin(t * 0.12) * 0.25 * U;
            hipY = floorY - 4.0 * U - p * 0.4 * U;
            eyes = "wide";
            mouth = "o";
            bang = easeOut(seg(t, igniteAt, 140));
            sweat = t * 0.0018 + 0.01;
            feet = [
                { x: hipX - 0.9 * U, y: floorY - p * 0.3 * U },
                { x: hipX + 0.9 * U, y: floorY - p * 0.3 * U },
            ];
            hands = [
                { x: -1.4 * U, y: 0.2 * U },
                { x: 1.4 * U, y: 0.2 * U },
            ];
        } else if (t >= blastAt) {
            const p = easeIn(seg(t, blastAt, blastMs));
            flame = 1.4 + 0.3 * Math.sin(t * 0.09);
            hipX = startX + exitDir * p * (w * 0.55 + 30);
            hipY = floorY - 4.0 * U - p * (h * 0.85 + 30);
            lean = 0.55;
            rot = exitDir * 0.65;
            eyes = "wide";
            mouth = "scream";
            look = exitDir;
            sweat = t * 0.002 + 0.01;
            opacity = 1 - clamp((p - 0.6) / 0.4, 0, 1);
            feet = [
                { x: hipX - exitDir * 0.7 * U, y: hipY + 3.8 * U + Math.sin(t * 0.05) * 0.4 * U },
                { x: hipX + exitDir * 0.5 * U, y: hipY + 4.1 * U - Math.sin(t * 0.05) * 0.4 * U },
            ];
            hands = [
                { x: exitDir * 1.4 * U, y: -1.2 * U },
                { x: -exitDir * 1.2 * U, y: 1.8 * U },
            ];
        } else if (t < 0) {
            hipY = floorY - 4.0 * U + Math.sin(idle * 0.004) * 0.06 * U;
        }

        const fig = rig(
            { hip: { x: hipX, y: hipY }, feet, hands, dir, lean, rot, look, eyes, mouth, bang, sweat, opacity },
            L
        );

        const packX = fig.shoulder.x - dir * 1.1 * U;
        const packY = fig.shoulder.y + 0.8 * U;
        const packW = 1.2 * U;
        const packH = 2.6 * U;

        const bg = (
            <g transform={`translate(${packX} ${packY}) rotate(${deg(rot + dir * lean)})`}>
                <rect x={-packW / 2} y={-packH / 2} width={packW} height={packH} rx={0.3 * U} fill="#475569" stroke={L.ink} strokeWidth={0.9} />
                {flame > 0 && (
                    <g transform={`translate(0 ${packH / 2}) scale(${flame})`}>
                        <polygon points={`${-0.5 * U},0 ${0.5 * U},0 0,${2.6 * U}`} fill="#f97316" />
                        <polygon points={`${-0.28 * U},0 ${0.28 * U},0 0,${1.6 * U}`} fill="#fde047" />
                    </g>
                )}
            </g>
        );

        return { fade, bg, figs: [fig] };
    };

    return { end: fadeAt + fadeMs, sample };
};

const boxScenario: Builder = (L) => {
    const { w, floorY, U } = L;
    const bx = w * 0.5;
    const bw = clamp(U * 6.2, 24, 58);
    const bh = clamp(U * 5.2, 20, 48);
    const boxY = floorY - bh / 2;

    const peekAt = 220;
    const popAt = 650;
    const fadeAt = popAt + 950;
    const fadeMs = 450;

    const sample = (t: number, idle: number): Frame => {
        const fade = t < 0 ? 1 : 1 - seg(t, fadeAt, fadeMs);
        let hipX = bx;
        let hipY = floorY - 3.6 * U;
        let eyes: Eyes = "dot";
        let mouth: Mouth = "flat";
        let look = 0;
        let bang = 0;
        let sweat = 0;
        let tilt = 0;
        let popLift = 0;

        if (t < 0) {
            tilt = Math.sin(idle * 0.003) * 2.5;
            popLift = -bh * 0.25;
        } else if (t < peekAt) {
            tilt = Math.sin(t * 0.04) * 3.5;
            popLift = -bh * 0.25;
        } else if (t < popAt) {
            const p = easeOut(seg(t, peekAt, 200));
            popLift = lerp(-bh * 0.25, -bh * 0.72, p);
            look = Math.sin(t * 0.015) * 0.8;
            eyes = "dot";
            mouth = "o";
        } else {
            const p = easeOut(seg(t, popAt, 220));
            popLift = lerp(-bh * 0.72, -bh * 1.15, p);
            eyes = "wide";
            mouth = "scream";
            bang = p;
            sweat = t * 0.0018 + 0.01;
            look = 0;
        }

        const fig = rig(
            {
                hip: { x: hipX, y: hipY },
                feet: standFeet(hipX, floorY, U, 0.7),
                hands: [
                    { x: -1.1 * U, y: 1.6 * U },
                    { x: 1.1 * U, y: 1.6 * U },
                ],
                lift: popLift,
                eyes,
                mouth,
                look,
                bang,
                sweat,
                shadow: 0,
            },
            L
        );

        const fg = drawBox(bx, boxY, bw, bh, U, tilt, "cardboardBox");
        return { fade, figs: [fig], fg };
    };

    return { end: fadeAt + fadeMs, sample };
};

const plugScenario: Builder = (L) => {
    const { w, floorY, U } = L;
    const outletX = w * 0.68;
    const outletY = floorY - 3.2 * U;
    const startX = w * 0.42;

    const pullAt = 240;
    const pullMs = 360;
    const replugAt = pullAt + pullMs + 480;
    const replugMs = 320;
    const fadeAt = replugAt + replugMs + 550;
    const fadeMs = 450;

    const sample = (t: number, idle: number): Frame => {
        const fade = t < 0 ? 1 : 1 - seg(t, fadeAt, fadeMs);
        let hipX = startX;
        let hipY = floorY - 4.0 * U;
        let dir: Dir = 1;
        let lean = 0.15;
        let eyes: Eyes = "dot";
        let mouth: Mouth = "flat";
        let look = 0.7;
        let bang = 0;
        let sweat = 0;
        let dim = 0;
        let spark = 0;
        let plugX = outletX;

        if (t >= pullAt && t < replugAt) {
            const p = easeOut(seg(t, pullAt, pullMs));
            hipX = lerp(startX, outletX - 3.2 * U, p);
            plugX = lerp(outletX, outletX - 2.2 * U, p);
            lean = 0.35;
            dim = p * 0.55;
            eyes = "wide";
            mouth = "o";
            bang = easeOut(seg(t, pullAt + pullMs * 0.6, 150));
            sweat = t * 0.0016 + 0.01;
        } else if (t >= replugAt) {
            const p = easeInOut(seg(t, replugAt, replugMs));
            hipX = lerp(outletX - 3.2 * U, outletX - 2.4 * U, p);
            plugX = lerp(outletX - 2.2 * U, outletX, p);
            lean = 0.25;
            dim = (1 - p) * 0.55;
            spark = p > 0.75 ? Math.sin(((p - 0.75) / 0.25) * Math.PI) : 0;
            eyes = p > 0.7 ? "closed" : "wide";
            mouth = p > 0.7 ? "smile" : "scream";
            sweat = (1 - p) * (t * 0.0016 + 0.01);
        } else if (t < 0) {
            hipY = floorY - 4.0 * U + Math.sin(idle * 0.003) * 0.06 * U;
        }

        const handTarget: P = { x: plugX - 0.6 * U, y: outletY };
        const fig = rig(
            {
                hip: { x: hipX, y: hipY },
                feet: standFeet(hipX, floorY, U, 0.85),
                handsAbs: [null, handTarget],
                dir,
                lean,
                look,
                eyes,
                mouth,
                bang,
                sweat,
            },
            L
        );

        const bg = (
            <g>
                <rect x={outletX - 1.1 * U} y={outletY - 1.5 * U} width={2.2 * U} height={3.0 * U} rx={0.3 * U} fill="#e2e8f0" stroke="#64748b" strokeWidth={0.9} />
                <circle cx={outletX - 0.35 * U} cy={outletY - 0.2 * U} r={0.22 * U} fill="#334155" />
                <circle cx={outletX + 0.35 * U} cy={outletY - 0.2 * U} r={0.22 * U} fill="#334155" />
                <path
                    d={`M${plugX} ${outletY} Q${plugX - 2.5 * U} ${outletY + 2.2 * U} ${plugX - 5.5 * U} ${floorY}`}
                    fill="none"
                    stroke="#334155"
                    strokeWidth={Math.max(1.4, 0.32 * U)}
                    strokeLinecap="round"
                />
                <rect x={plugX - 0.6 * U} y={outletY - 0.65 * U} width={1.2 * U} height={1.3 * U} rx={0.2 * U} fill="#475569" stroke={L.ink} strokeWidth={0.8} />
                {spark > 0.02 && (
                    <polygon
                        points={starPoints(outletX, outletY, 0.6 * U * spark, 1.8 * U * spark, 6, t * 0.02)}
                        fill="#facc15"
                        stroke="#f59e0b"
                        strokeWidth={0.6}
                    />
                )}
            </g>
        );

        return { fade, bg, figs: [fig], dim };
    };

    return { end: fadeAt + fadeMs, sample };
};

const SCENARIO_BUILDERS: Record<ScenarioId, Builder> = {
    sneak: sneakScenario,
    tape: tapeScenario,
    hamster: hamsterScenario,
    duck: duckScenario,
    juggle: juggleScenario,
    jetpack: jetpackScenario,
    box: boxScenario,
    plug: plugScenario,
};

export interface StageProps {
    scenario: ScenarioId;
    side?: DoorSide;
    pageBg?: string;
    released?: boolean;
    onDone?: () => void;
    className?: string;
}

export function Stage({
    scenario,
    side = "right",
    pageBg = "#ffffff",
    released = false,
    onDone,
    className,
}: StageProps) {
    const hostRef = useRef<HTMLDivElement | null>(null);
    const [mounted, setMounted] = useState<boolean>(false);
    const [size, setSize] = useState<{ w: number; h: number }>({ w: 320, h: 110 });
    const [now, setNow] = useState<number>(0);
    const mountRef = useRef<number | null>(null);
    const releaseRef = useRef<number | null>(null);
    const doneFiredRef = useRef<boolean>(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;
        const el = hostRef.current;
        if (!el) return;
        const update = () => {
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                setSize({ w: rect.width, h: rect.height });
            }
        };
        update();
        if (typeof ResizeObserver !== "undefined") {
            const ro = new ResizeObserver(update);
            ro.observe(el);
            return () => ro.disconnect();
        }
        window.addEventListener("resize", update);
        return () => window.removeEventListener("resize", update);
    }, [mounted]);

    useEffect(() => {
        doneFiredRef.current = false;
        releaseRef.current = null;
    }, [scenario, released]);

    const layout = useMemo(
        () => makeLayout(size.w, size.h, side, pageBg),
        [size.w, size.h, side, pageBg]
    );
    const activeScenario = useMemo(
        () => SCENARIO_BUILDERS[scenario](layout),
        [scenario, layout]
    );

    useEffect(() => {
        if (!mounted) return;
        let raf = 0;
        const tick = (ts: number) => {
            if (mountRef.current === null) mountRef.current = ts;
            if (released && releaseRef.current === null) releaseRef.current = ts;
            if (!released) releaseRef.current = null;

            setNow(ts);

            const relElapsed = releaseRef.current !== null ? ts - releaseRef.current : -1;
            if (released && relElapsed >= activeScenario.end) {
                if (!doneFiredRef.current) {
                    doneFiredRef.current = true;
                    onDone?.();
                }
                return;
            }
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [mounted, released, activeScenario, onDone]);

    const idle = mountRef.current !== null ? now - mountRef.current : 0;
    const t = released && releaseRef.current !== null ? now - releaseRef.current : -1;
    const frame = activeScenario.sample(t, idle);

    return (
        <div ref={hostRef} className={className} style={{ width: "100%", height: "100%", position: "relative" }}>
            {mounted && (
                <svg
                    width={size.w}
                    height={size.h}
                    viewBox={`0 0 ${size.w} ${size.h}`}
                    style={{ display: "block", width: "100%", height: "100%", opacity: frame.fade }}
                >
                    {frame.bg}
                    {frame.dim && frame.dim > 0 && (
                        <rect x={0} y={0} width={size.w} height={size.h} fill="#020617" opacity={frame.dim} />
                    )}
                    {frame.figs.map((fig, idx) => drawFigure(fig, layout, `fig${idx}`))}
                    {frame.fg}
                </svg>
            )}
        </div>
    );
}

export default Stage;