export type MacroFrame = {
  t: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
  moving: boolean;
  sprinting: boolean;
};

export type Macro = {
  id: string;
  name: string;
  duration: number;
  frames: MacroFrame[];
};

export class MacroRecorder {
  private recording = false;
  private startedAt = 0;
  private frames: MacroFrame[] = [];
  private sampleAcc = 0;
  private count = 0;

  get active(): boolean {
    return this.recording;
  }

  start(): void {
    this.recording = true;
    this.startedAt = performance.now();
    this.frames = [];
    this.sampleAcc = 0;
  }

  stop(): Macro | null {
    if (!this.recording) {
      return null;
    }
    this.recording = false;
    if (this.frames.length < 4) {
      return null;
    }
    this.count += 1;
    const duration = this.frames[this.frames.length - 1].t;
    return {
      id: `macro-${this.count}`,
      name: `Macro ${this.count}`,
      duration,
      frames: this.frames,
    };
  }

  sample(dt: number, frame: MacroFrame): void {
    if (!this.recording) {
      return;
    }
    this.sampleAcc += dt;
    if (this.frames.length > 0 && this.sampleAcc < 0.05) {
      return;
    }
    this.sampleAcc = 0;
    frame.t = (performance.now() - this.startedAt) / 1000;
    this.frames.push(frame);
  }
}
