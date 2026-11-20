"use client";

import React, { useEffect, useRef, useState } from "react";
import { Engine, Bodies, Body, Constraint, Composite } from "matter-js";
import Stage, { SCENARIOS, type DoorSide, type ScenarioId } from "./Stage";

type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

const CORNERS: Corner[] = ["top-left", "top-right", "bottom-left", "bottom-right"];

function getRandomCorner(): Corner {
    return CORNERS[Math.floor(Math.random() * CORNERS.length)];
}

function getRandomScenario(): ScenarioId {
    return SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)];
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const SECRET_MIN_W = 140;
const SECRET_MIN_H = 90;

function isTransparent(color: string) {
    if (color === "transparent") return true;
    if (/^rgba\(.*,\s*0(\.0+)?\s*\)$/.test(color)) return true;
    return /\/\s*0(\.0+)?%?\s*\)$/.test(color);
}

function hasCover(el: Element | null): boolean {
    if (!el) return false;
    const cs = getComputedStyle(el);
    return !isTransparent(cs.backgroundColor) || cs.backgroundImage !== "none";
}

function findPageBackground(from: HTMLElement | null): string {
    let node: HTMLElement | null = from;
    while (node) {
        const bg = getComputedStyle(node).backgroundColor;
        if (!isTransparent(bg)) return bg;
        node = node.parentElement;
    }
    return "#ffffff";
}

type Box = { x: number; y: number; w: number; h: number; docH: number; docW: number };
type Secret = { pageBg: string; side: DoorSide; scenario: ScenarioId };

export default function Breakable({
                                      children,
                                      breakCorner = null,
                                      swingMs = null,
                                      secretChance = 0.3,
                                  }: {
    children: React.ReactNode;
    breakCorner?: Corner | null;
    swingMs?: number | null;
    secretChance?: number;
}) {
    const wrapperRef = useRef<HTMLSpanElement>(null);
    const fallingRef = useRef<HTMLDivElement>(null);
    const [box, setBox] = useState<Box | null>(null);
    const [secret, setSecret] = useState<Secret | null>(null);
    const [letGo, setLetGo] = useState(false);

    useEffect(() => {
        if (!box) return;

        const { x, y, w, h, docH, docW } = box;
        const T = 500;

        const corner = breakCorner ?? getRandomCorner();
        const hingeRight = !corner.includes("right");
        const hingeBottom = !corner.includes("bottom");
        const resolvedSwingMs = swingMs ?? rand(250, 900);

        const area = w * h;
        const t = clamp((Math.log(area) - Math.log(400)) / (Math.log(100000) - Math.log(400)), 0, 1);

        const engine = Engine.create();
        engine.gravity.y = 1 + t * 0.6;

        const body = Bodies.rectangle(x + w / 2, y + h / 2, w, h, {
            density: 0.001 + t * 0.004,
            frictionAir: (0.035 - 0.03 * t) * rand(0.8, 1.2),
            friction: 0.4 + 0.5 * t,
            restitution: clamp((0.5 - 0.4 * t) * rand(0.8, 1.2), 0.05, 0.6),
        });

        const floor = Bodies.rectangle(docW / 2, docH + T / 2, docW * 2, T, { isStatic: true });
        const leftWall = Bodies.rectangle(-T / 2, docH / 2, T, docH * 2, { isStatic: true });
        const rightWall = Bodies.rectangle(docW + T / 2, docH / 2, T, docH * 2, { isStatic: true });

        const hinge = Constraint.create({
            pointA: { x: hingeRight ? x + w : x, y: hingeBottom ? y + h : y },
            bodyB: body,
            pointB: { x: hingeRight ? w / 2 : -w / 2, y: hingeBottom ? h / 2 : -h / 2 },
            length: 0,
            stiffness: 1,
        });

        Composite.add(engine.world, [body, floor, leftWall, rightWall, hinge]);

        const fallDirection = hingeRight ? -1 : 1;
        Body.setAngularVelocity(body, fallDirection * rand(0.005, 0.02));

        let released = false;
        const holdMs = resolvedSwingMs * (1.25 - 0.6 * t) * rand(0.8, 1.2);
        const timer = setTimeout(() => {
            Composite.remove(engine.world, hinge);
            released = true;
            setLetGo(true);
        }, holdMs);

        let raf = 0;
        let last = performance.now();
        let calmFrames = 0;

        const tick = (now: number) => {
            Engine.update(engine, Math.min(now - last, 32));
            last = now;

            const el = fallingRef.current;
            if (el) {
                el.style.transform = `translate(${body.position.x - w / 2}px, ${
                    body.position.y - h / 2
                }px) rotate(${body.angle}rad)`;
            }

            const onFloor = body.bounds.max.y >= docH - 4;
            if (released && onFloor && body.speed < 0.15 && Math.abs(body.angularSpeed) < 0.01) {
                calmFrames++;
            } else {
                calmFrames = 0;
            }
            if (calmFrames > 30) return;

            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);

        return () => {
            clearTimeout(timer);
            cancelAnimationFrame(raf);
            Engine.clear(engine);
        };
    }, [box, breakCorner, swingMs]);

    return (
        <>
            <span
                ref={wrapperRef}
                style={{ display: "inline-block", visibility: box ? "hidden" : "visible" }}
                onClickCapture={(e) => {
                    const el = wrapperRef.current;
                    if (box || !el) return;
                    e.preventDefault();

                    const r = el.getBoundingClientRect();

                    const eligible =
                        r.width >= SECRET_MIN_W && r.height >= SECRET_MIN_H && hasCover(el.firstElementChild);
                    if (eligible && Math.random() < secretChance) {
                        setSecret({
                            pageBg: findPageBackground(el.parentElement),
                            side: Math.random() < 0.5 ? "left" : "right",
                            scenario: getRandomScenario(),
                        });
                    }

                    setBox({
                        x: r.left + window.scrollX,
                        y: r.top + window.scrollY,
                        w: r.width,
                        h: r.height,
                        docH: Math.max(
                            document.documentElement.scrollHeight,
                            document.body.scrollHeight
                        ),
                        docW: document.documentElement.clientWidth,
                    });
                }}
            >
                {children}
            </span>

            {box && secret && (
                <div
                    aria-hidden="true"
                    style={{
                        position: "absolute",
                        left: box.x,
                        top: box.y,
                        width: box.w,
                        height: box.h,
                        zIndex: 40,
                        pointerEvents: "none",
                    }}
                >
                    <Stage
                        scenario={secret.scenario}
                        side={secret.side}
                        pageBg={secret.pageBg}
                        released={letGo}
                        onDone={() => setSecret(null)}
                    />
                </div>
            )}

            {box && (
                <div
                    ref={fallingRef}
                    aria-hidden="true"
                    style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        width: box.w,
                        height: box.h,
                        transform: `translate(${box.x}px, ${box.y}px)`,
                        zIndex: 50,
                        pointerEvents: "none",
                    }}
                >
                    {children}
                </div>
            )}
        </>
    );
}