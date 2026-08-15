'use client';

import { useEffect, useRef } from 'react';
import Phaser from 'phaser';

export type RoadPitchPhase = 'idle' | 'question' | 'correct' | 'decision' | 'tackle' | 'tackled' | 'cashed' | 'complete';

interface RoadPitchState {
  progress: number;
  phase: RoadPitchPhase;
  labels: {
    liveRoute: string;
    safe: string;
    target: string;
  };
}

interface RoadToGoalPitchProps extends RoadPitchState {
  onFailure?: () => void;
}

interface HairAnchor {
  top: number;
  left: number;
  width: number;
}

interface AvatarKit {
  skin: string;
  jersey: string;
  hair: string;
  hairAnchor: HairAnchor;
  number: string;
}

interface ZoneMarker {
  container: Phaser.GameObjects.Container;
  plate: Phaser.GameObjects.Rectangle;
  accent: Phaser.GameObjects.Rectangle;
  value: Phaser.GameObjects.Text;
  label: Phaser.GameObjects.Text;
}

const GAME_EVENT = 'road-to-goal:state';
const WIDTH = 960;
const HEIGHT = 540;
const WORLD_WIDTH = 2_160;
const LANE = 126;
const START_X = 452;
const FIRST_ZONE_X = 578;
const PLAYER_Y = 423;
const DEFENDER_Y = 423;
const AVATAR_CANVAS_WIDTH = 495.25;
const AVATAR_CANVAS_HEIGHT = 543.03;
const ZONE_COLORS = [0x58cc02, 0x1cb0f6, 0xffe500, 0xff9600] as const;
const MULTIPLIERS = [1.03, 1.08, 1.15, 1.24, 1.36, 1.52, 1.72, 1.98, 2.35, 2.9, 4] as const;
const GOAL_X = FIRST_ZONE_X + MULTIPLIERS.length * LANE + 24;

const PLAYER_KIT: AvatarKit = {
  skin: 'skin-dark-alt',
  jersey: 'jersey-green',
  hair: 'hair-ramos',
  hairAnchor: { top: -3, left: 23, width: 42 },
  number: '10',
};

const DEFENDER_KITS: AvatarKit[] = [
  {
    skin: 'skin-tan',
    jersey: 'jersey-blue',
    hair: 'hair-boy',
    hairAnchor: { top: -8, left: 18, width: 55 },
    number: '4',
  },
  {
    skin: 'skin-dark',
    jersey: 'jersey-yellow',
    hair: 'hair-cornrows',
    hairAnchor: { top: -1, left: 25, width: 39 },
    number: '6',
  },
  {
    skin: 'skin-light',
    jersey: 'jersey-blue',
    hair: 'hair-wave',
    hairAnchor: { top: -3, left: 18, width: 41 },
    number: '8',
  },
];

function hex(color: number) {
  return `#${color.toString(16).padStart(6, '0')}`;
}

function drawStadium(scene: Phaser.Scene) {
  scene.add.image(WIDTH / 2, HEIGHT / 2, 'stadium-night').setDisplaySize(WIDTH, HEIGHT).setScrollFactor(0).setDepth(-20);

  const grade = scene.add.graphics().setScrollFactor(0).setDepth(-18);
  grade.fillGradientStyle(0x020817, 0x020817, 0x020817, 0x020817, 0.2, 0.2, 0, 0);
  grade.fillRect(0, 0, WIDTH, HEIGHT);
  grade.fillGradientStyle(0x020815, 0x020815, 0x020815, 0x020815, 0, 0, 0.35, 0.35);
  grade.fillRect(0, 300, WIDTH, 240);

  const hud = scene.add.graphics().setScrollFactor(0).setDepth(16);
  hud.fillStyle(0x061128, 0.88);
  hud.fillRoundedRect(22, 18, 196, 46, 12);
  hud.lineStyle(1, 0x6685ff, 0.55);
  hud.strokeRoundedRect(22, 18, 196, 46, 12);
  hud.fillStyle(0x1645ff, 1);
  hud.fillRoundedRect(32, 28, 7, 26, 3);
  scene.add.text(50, 25, 'QUIZBALL', {
    fontFamily: 'Poppins, sans-serif',
    fontSize: '13px',
    fontStyle: '900',
    color: '#F4FFF8',
    letterSpacing: 1.8,
  }).setScrollFactor(0).setDepth(17);
  scene.add.text(50, 44, '11 ZONES  •  ONE RUN', {
    fontFamily: 'Poppins, sans-serif',
    fontSize: '8px',
    fontStyle: '700',
    color: '#9BB0FF',
    letterSpacing: 1.2,
  }).setScrollFactor(0).setDepth(17);

  scene.add.text(WIDTH - 24, 29, 'ROAD TO GOAL', {
    fontFamily: 'Poppins, sans-serif',
    fontSize: '16px',
    fontStyle: '900',
    color: '#FFE500',
    letterSpacing: 2.8,
  }).setOrigin(1, 0).setScrollFactor(0).setDepth(17);
}

function drawPitch(scene: Phaser.Scene) {
  const route = scene.add.graphics().setDepth(8);
  route.lineStyle(9, 0x020817, 0.5);
  route.lineBetween(FIRST_ZONE_X - 56, 276, GOAL_X - 68, 276);
  route.lineStyle(2, 0x6685ff, 0.72);
  route.lineBetween(FIRST_ZONE_X - 56, 276, GOAL_X - 68, 276);
}

function makeAvatar(scene: Phaser.Scene, x: number, y: number, kit: AvatarKit, width: number) {
  const height = width * (AVATAR_CANVAS_HEIGHT / AVATAR_CANVAS_WIDTH);
  const baseTop = -height - 12;

  const shadow = scene.add.ellipse(0, -6, width * 0.77, 14, 0x020906, 0.38);

  const base = scene.add.image(-width / 2, baseTop, kit.skin).setOrigin(0, 0).setDisplaySize(width, height);

  const jerseyWidth = width * 0.7;
  const jersey = scene.add.image(
    -width / 2 + width * 0.13,
    baseTop + height * 0.44,
    kit.jersey,
  ).setOrigin(0, 0);
  jersey.setDisplaySize(jerseyWidth, jerseyWidth * (jersey.height / jersey.width));

  const hairWidth = width * (kit.hairAnchor.width / 100);
  const hair = scene.add.image(
    -width / 2 + width * (kit.hairAnchor.left / 100),
    baseTop + height * (kit.hairAnchor.top / 100),
    kit.hair,
  ).setOrigin(0, 0);
  hair.setDisplaySize(hairWidth, hairWidth * (hair.height / hair.width));

  const number = scene.add.text(0, baseTop + height * 0.62, kit.number, {
    fontFamily: 'Poppins, sans-serif',
    fontSize: `${Math.round(width * 0.15)}px`,
    fontStyle: '900',
    color: '#FFFFFF',
    stroke: '#07111D',
    strokeThickness: 3,
  }).setOrigin(0.5);

  return scene.add.container(x, y, [shadow, base, jersey, hair, number])
    .setDepth(30)
    .setSize(width, height + 20);
}

function makeZoneMarker(scene: Phaser.Scene, x: number, multiplier: number, index: number): ZoneMarker {
  const plate = scene.add.rectangle(0, 0, 92, 52, 0x061128, 0.9).setStrokeStyle(1, 0x6685ff, 0.55);
  const accent = scene.add.rectangle(-43, 0, 4, 34, 0x6685ff, 1);
  const value = scene.add.text(2, -6, `${multiplier.toFixed(2)}×`, {
    fontFamily: 'Poppins, sans-serif',
    fontSize: '17px',
    fontStyle: '900',
    color: '#B9C6FF',
  }).setOrigin(0.5);
  const label = scene.add.text(2, 15, `ZONE ${String(index + 1).padStart(2, '0')}`, {
    fontFamily: 'Poppins, sans-serif',
    fontSize: '8px',
    fontStyle: '800',
    color: '#8499EE',
    letterSpacing: 1,
  }).setOrigin(0.5);
  const container = scene.add.container(x, 276, [plate, accent, value, label]).setDepth(18);
  return { container, plate, accent, value, label };
}

function drawGoal(scene: Phaser.Scene, x: number) {
  scene.add.ellipse(x, 497, 150, 24, 0x020906, 0.42).setDepth(5);
  scene.add.grid(x, 408, 126, 154, 14, 14, 0xffffff, 0.02, 0xe9fff2, 0.24).setDepth(7);
  const frame = scene.add.graphics().setDepth(9);
  frame.lineStyle(8, 0xf5fff8, 1);
  frame.strokeRect(x - 64, 328, 128, 164);
  frame.lineStyle(3, 0x58cc02, 0.85);
  frame.strokeRect(x - 56, 337, 112, 151);
  scene.add.text(x, 306, 'FINAL WHISTLE', {
    fontFamily: 'Poppins, sans-serif',
    fontSize: '11px',
    fontStyle: '900',
    color: '#FFE500',
    letterSpacing: 2,
  }).setOrigin(0.5).setDepth(10);
}

class RoadScene extends Phaser.Scene {
  private readonly readState: () => RoadPitchState;
  private player!: Phaser.GameObjects.Container;
  private ball!: Phaser.GameObjects.Image;
  private defenders: Phaser.GameObjects.Container[] = [];
  private markers: ZoneMarker[] = [];
  private pulseTween: Phaser.Tweens.Tween | null = null;
  private defenderTween: Phaser.Tweens.Tween | null = null;
  private ballTween: Phaser.Tweens.Tween | null = null;
  private impact!: Phaser.GameObjects.Star;
  private liveRouteText!: Phaser.GameObjects.Text;
  private previous: RoadPitchState;

  constructor(readState: () => RoadPitchState) {
    super('road-to-goal');
    this.readState = readState;
    this.previous = readState();
  }

  preload() {
    this.load.image('stadium-night', '/assets/demos/road-to-goal-stadium-cartoon-v3.png');
    this.load.image('skin-light', '/assets/store/avatars/avatar_male_white.webp');
    this.load.image('skin-tan', '/assets/store/avatars/avatar_male_white_alt.webp');
    this.load.image('skin-dark', '/assets/store/avatars/avatar_male_dark.webp');
    this.load.image('skin-dark-alt', '/assets/store/avatars/avatar_male_dark_alt.webp');
    this.load.image('jersey-green', '/assets/store/jersey_green.webp?v=2');
    this.load.image('jersey-blue', '/assets/store/jersey_blue.webp?v=2');
    this.load.image('jersey-yellow', '/assets/store/jersey_yellow.webp?v=2');
    this.load.image('hair-boy', '/assets/store/hair_boy_basic.webp?v=2');
    this.load.image('hair-ramos', '/assets/store/hair_ramos.webp?v=2');
    this.load.image('hair-wave', '/assets/store/hair_wave.webp?v=2');
    this.load.image('hair-cornrows', '/assets/store/hair_cornrows.webp?v=2');
    this.load.image('match-ball', '/assets/brand/ball.webp');
  }

  create() {
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, HEIGHT);
    drawStadium(this);
    drawPitch(this);

    this.liveRouteText = this.add.text(480, 71, this.readState().labels.liveRoute.toUpperCase(), {
      fontFamily: 'Poppins, sans-serif',
      fontSize: '10px',
      fontStyle: '800',
      color: '#B9C9C0',
      letterSpacing: 2,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(17);

    MULTIPLIERS.forEach((multiplier, index) => {
      const x = FIRST_ZONE_X + index * LANE;
      this.markers.push(makeZoneMarker(this, x, multiplier, index));
      const defender = makeAvatar(this, x, DEFENDER_Y, DEFENDER_KITS[index % DEFENDER_KITS.length], 92);
      defender.setData('homeX', x);
      defender.setData('homeY', DEFENDER_Y);
      this.defenders.push(defender);
    });

    drawGoal(this, GOAL_X);
    this.player = makeAvatar(this, START_X, PLAYER_Y, PLAYER_KIT, 108).setDepth(34);
    this.ball = this.add.image(START_X + 26, PLAYER_Y - 7, 'match-ball').setDisplaySize(18, 18).setDepth(36);
    this.impact = this.add.star(0, 0, 10, 18, 40, 0xff9600)
      .setStrokeStyle(5, 0xffe500)
      .setVisible(false)
      .setDepth(45);

    this.game.events.on(GAME_EVENT, this.onRoadState, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(GAME_EVENT, this.onRoadState, this);
    });
    this.onRoadState(this.readState(), true);
  }

  private onRoadState(next: RoadPitchState, immediate = false) {
    const previous = this.previous;
    this.previous = next;
    this.liveRouteText.setText(next.labels.liveRoute.toUpperCase());
    this.refreshZones(next);

    const playerX = next.progress === 0 ? START_X : FIRST_ZONE_X + (next.progress - 1) * LANE;
    const focusX = next.progress >= MULTIPLIERS.length ? GOAL_X - 70 : playerX;
    const cameraX = next.progress === 0 ? 0 : Phaser.Math.Clamp(focusX - WIDTH / 2, 0, WORLD_WIDTH - WIDTH);

    if (immediate) {
      this.player.setPosition(playerX, PLAYER_Y).setAngle(0).setAlpha(1);
      this.ball.setPosition(playerX + 26, PLAYER_Y - 7).setAngle(0).setDisplaySize(18, 18).setAlpha(1).setVisible(true);
      this.cameras.main.scrollX = cameraX;
    } else if (next.progress !== previous.progress) {
      this.tweens.add({ targets: this.player, x: playerX, y: PLAYER_Y, angle: 0, duration: 650, ease: 'Back.Out' });
      this.tweens.add({ targets: this.ball, x: playerX + 26, y: PLAYER_Y - 7, angle: '+=280', duration: 650, ease: 'Back.Out' });
      this.tweens.add({ targets: this.cameras.main, scrollX: cameraX, duration: 760, ease: 'Sine.InOut' });
    }

    if (next.phase === 'correct' && previous.phase !== 'correct') {
      this.tweens.add({ targets: this.player, y: PLAYER_Y - 13, scaleX: 1.04, scaleY: 1.04, yoyo: true, duration: 210, ease: 'Quad.Out' });
      this.tweens.add({ targets: this.ball, y: PLAYER_Y - 12, angle: '+=180', yoyo: true, duration: 210, ease: 'Quad.Out' });
    }
    if (next.phase === 'tackle' && previous.phase !== 'tackle') this.playTackle(next.progress);
    if (next.phase === 'idle' && previous.phase !== 'idle') this.resetActors();
    if (next.phase === 'complete' && previous.phase !== 'complete') this.playGoalCelebration();
  }

  private refreshZones(state: RoadPitchState) {
    this.pulseTween?.stop();
    this.defenderTween?.stop();
    this.pulseTween = null;
    this.defenderTween = null;

    this.markers.forEach((marker, index) => {
      const color = ZONE_COLORS[index % ZONE_COLORS.length];
      const cleared = index < state.progress;
      const active = index === state.progress && state.progress < MULTIPLIERS.length;
      const defender = this.defenders[index];
      const homeY = defender.getData('homeY') as number;

      marker.container.setScale(1);
      marker.plate.setFillStyle(cleared ? color : active ? 0x0b1712 : 0x07100d, cleared ? 0.96 : 0.92);
      marker.plate.setStrokeStyle(active ? 3 : 2, cleared || active ? color : 0x53655c, active ? 1 : 0.62);
      marker.accent.setFillStyle(cleared || active ? color : 0x53655c, 1);
      marker.value.setColor(cleared ? '#07110D' : active ? hex(color) : '#8EA398');
      marker.label.setText(cleared ? state.labels.safe.toUpperCase() : active ? state.labels.target.toUpperCase() : `ZONE ${String(index + 1).padStart(2, '0')}`);
      marker.label.setColor(cleared ? '#173019' : active ? '#F4FFF8' : '#71847A');

      defender.setY(homeY).setAlpha(cleared ? 0.1 : active ? 1 : 0.48).setScale(active ? 1.04 : 1);
      if (active) {
        this.pulseTween = this.tweens.add({ targets: marker.container, scale: 1.07, yoyo: true, repeat: -1, duration: 720, ease: 'Sine.InOut' });
        if (state.phase !== 'tackle' && state.phase !== 'tackled') {
          this.defenderTween = this.tweens.add({ targets: defender, y: homeY - 5, angle: -1.5, yoyo: true, repeat: -1, duration: 480, ease: 'Sine.InOut' });
        }
      }
    });
  }

  private playTackle(zone: number) {
    const defender = this.defenders[Math.min(zone, this.defenders.length - 1)];
    if (!defender) return;
    const homeX = defender.getData('homeX') as number;
    const homeY = defender.getData('homeY') as number;
    this.tweens.killTweensOf(defender);
    this.tweens.killTweensOf(this.ball);
    defender.setPosition(homeX, homeY).setAngle(0).setAlpha(1).setScale(1.04);

    this.tweens.add({
      targets: defender,
      x: this.player.x + 36,
      y: this.player.y + 8,
      angle: -24,
      scale: 1.15,
      duration: 390,
      ease: 'Power2',
      onComplete: () => {
        this.impact.setPosition(this.player.x + 20, this.player.y - 23).setScale(0.18).setAlpha(1).setAngle(-12).setVisible(true);
        this.tweens.add({ targets: this.impact, scale: 1.18, angle: 18, alpha: 0, duration: 430, ease: 'Quad.Out' });
      },
    });
    this.tweens.add({ targets: this.player, x: this.player.x + 27, y: this.player.y + 30, angle: 73, duration: 500, delay: 160, ease: 'Back.Out' });
    this.ballTween = this.tweens.add({
      targets: this.ball,
      x: this.ball.x + 116,
      y: this.ball.y - 72,
      angle: '+=540',
      duration: 470,
      delay: 170,
      ease: 'Cubic.Out',
      onComplete: () => {
        this.tweens.add({ targets: this.ball, y: PLAYER_Y + 6, angle: '+=260', duration: 310, ease: 'Bounce.Out' });
      },
    });
    this.cameras.main.shake(280, 0.0075);
  }

  private resetActors() {
    this.tweens.killTweensOf(this.player);
    this.tweens.killTweensOf(this.ball);
    this.ballTween = null;
    this.player.setPosition(START_X, PLAYER_Y).setAngle(0).setScale(1).setAlpha(1);
    this.ball.setPosition(START_X + 26, PLAYER_Y - 7).setAngle(0).setDisplaySize(18, 18).setAlpha(1).setVisible(true);
    this.defenders.forEach((defender) => {
      this.tweens.killTweensOf(defender);
      defender.setPosition(defender.getData('homeX') as number, defender.getData('homeY') as number).setAngle(0).setScale(1);
    });
    this.impact.setVisible(false);
    this.tweens.add({ targets: this.cameras.main, scrollX: 0, duration: 540, ease: 'Sine.InOut' });
  }

  private playGoalCelebration() {
    this.tweens.killTweensOf(this.ball);
    this.tweens.add({ targets: this.player, x: GOAL_X - 110, y: PLAYER_Y, angle: 0, duration: 600, ease: 'Back.Out' });
    this.tweens.add({
      targets: this.ball,
      x: GOAL_X + 15,
      y: 392,
      angle: '+=900',
      displayWidth: 11,
      displayHeight: 11,
      duration: 760,
      ease: 'Cubic.InOut',
    });
    this.time.delayedCall(580, () => {
      this.tweens.add({ targets: this.player, y: PLAYER_Y - 34, angle: 360, duration: 760, ease: 'Sine.InOut' });
      for (let index = 0; index < 32; index += 1) {
        const color = ZONE_COLORS[index % ZONE_COLORS.length];
        const piece = this.add.rectangle(GOAL_X, 338, 7, 15, color).setDepth(45).setAngle(index * 31);
        this.tweens.add({
          targets: piece,
          x: piece.x + (index % 2 === 0 ? 1 : -1) * (45 + (index * 19) % 170),
          y: 500 + (index * 11) % 35,
          angle: piece.angle + 320,
          alpha: 0,
          duration: 940 + (index % 5) * 95,
          ease: 'Quad.In',
          onComplete: () => piece.destroy(),
        });
      }
    });
  }
}

export function RoadToGoalPitch({ progress, phase, labels, onFailure }: RoadToGoalPitchProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const stateRef = useRef<RoadPitchState>({ progress, phase, labels });
  const liveRoute = labels.liveRoute;
  const safe = labels.safe;
  const target = labels.target;

  useEffect(() => {
    stateRef.current = { progress, phase, labels: { liveRoute, safe, target } };
    gameRef.current?.events.emit(GAME_EVENT, stateRef.current);
  }, [liveRoute, phase, progress, safe, target]);

  useEffect(() => {
    if (!hostRef.current) return;
    try {
      const game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: hostRef.current,
        width: WIDTH,
        height: HEIGHT,
        backgroundColor: '#040B09',
        antialias: true,
        render: { pixelArt: false, roundPixels: true },
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
          width: WIDTH,
          height: HEIGHT,
        },
        scene: new RoadScene(() => stateRef.current),
      });
      gameRef.current = game;
    } catch {
      onFailure?.();
    }
    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [onFailure]);

  return (
    <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[26px] border border-white/10 bg-[#040B09] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_24px_60px_rgba(0,0,0,0.32)]">
      <div ref={hostRef} className="absolute inset-0 [&_canvas]:!h-full [&_canvas]:!w-full" aria-label="Animated eleven-zone football challenge inside Quizball Stadium" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[#020805]/70 to-transparent" />
    </div>
  );
}
