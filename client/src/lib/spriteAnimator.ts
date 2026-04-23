/**
 * Sprite Animator - Handles frame-based sprite animation with smooth cycling
 * Supports multiple animation states (idle, run, jump, shoot, pass, catch)
 * Optimized for 60fps playback with minimal memory overhead
 */

export type AnimationState = 'idle' | 'run' | 'jump' | 'shoot' | 'pass' | 'catch';

export interface SpriteFrameSet {
  idle: string[];
  run: string[];
  jump: string;
  shoot: string;
  pass: string;
  catch: string;
}

export interface AnimationConfig {
  idle: { frames: number; speed: number }; // frames per cycle, speed multiplier
  run: { frames: number; speed: number };
  jump: { frames: number; speed: number };
  shoot: { frames: number; speed: number };
  pass: { frames: number; speed: number };
  catch: { frames: number; speed: number };
}

const DEFAULT_CONFIG: AnimationConfig = {
  idle: { frames: 1, speed: 1 },
  run: { frames: 3, speed: 0.15 }, // 3 frames, cycle every ~200ms at 60fps
  jump: { frames: 1, speed: 1 },
  shoot: { frames: 1, speed: 1 },
  pass: { frames: 1, speed: 1 },
  catch: { frames: 1, speed: 1 },
};

export class SpriteAnimator {
  private frameSet: SpriteFrameSet;
  private config: AnimationConfig;
  private currentState: AnimationState = 'idle';
  private frameIndex: number = 0;
  private animationTime: number = 0;
  private imageCache: Map<string, HTMLImageElement> = new Map();
  private loadingPromises: Map<string, Promise<HTMLImageElement>> = new Map();
  private isReady: boolean = false;
  private failedUrls: Set<string> = new Set();

  constructor(frameSet: SpriteFrameSet, config: Partial<AnimationConfig> = {}) {
    this.frameSet = frameSet;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.preloadImages();
  }

  /**
   * Preload all sprite images into cache for smooth playback
   */
  private preloadImages(): void {
    const allUrls = new Set<string>();

    // Collect all unique URLs
    Object.values(this.frameSet).forEach((value) => {
      if (Array.isArray(value)) {
        value.forEach((url) => allUrls.add(url));
      } else if (typeof value === 'string') {
        allUrls.add(value);
      }
    });

    // Preload each image with proper error handling
    const loadPromises: Promise<void>[] = [];
    allUrls.forEach((url) => {
      if (!this.imageCache.has(url) && !this.failedUrls.has(url)) {
        const promise = this.loadImage(url);
        loadPromises.push(promise);
      }
    });

    // Mark as ready once all images are loaded or failed
    Promise.all(loadPromises).then(() => {
      this.isReady = true;
    });
  }

  /**
   * Load a single image with proper error handling
   */
  private loadImage(url: string): Promise<void> {
    if (this.loadingPromises.has(url)) {
      return this.loadingPromises.get(url)!.then(() => {});
    }

    const promise = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        this.imageCache.set(url, img);
        resolve(img);
      };

      img.onerror = () => {
        this.failedUrls.add(url);
        reject(new Error(`Failed to load image: ${url}`));
      };

      img.src = url;
    }).catch((err) => {
      console.warn(err);
    });

    this.loadingPromises.set(url, promise as Promise<HTMLImageElement>);
    return promise.then(() => {});
  }

  /**
   * Update animation state and advance frame
   */
  update(deltaTime: number): void {
    const stateConfig = this.config[this.currentState];
    if (!stateConfig) return;

    // Only animate multi-frame states
    if (stateConfig.frames > 1) {
      this.animationTime += deltaTime * stateConfig.speed;
      const frameDuration = 1 / stateConfig.frames;

      if (this.animationTime >= frameDuration) {
        this.frameIndex = (this.frameIndex + 1) % stateConfig.frames;
        this.animationTime = 0;
      }
    } else {
      this.frameIndex = 0;
    }
  }

  /**
   * Set animation state and reset frame index
   */
  setState(state: AnimationState): void {
    if (state !== this.currentState) {
      this.currentState = state;
      this.frameIndex = 0;
      this.animationTime = 0;
    }
  }

  /**
   * Get current sprite image URL
   */
  getCurrentFrame(): string {
    const frames = this.frameSet[this.currentState];

    if (Array.isArray(frames)) {
      return frames[this.frameIndex % frames.length];
    }

    return frames;
  }

  /**
   * Get current sprite image (preloaded)
   */
  getCurrentImage(): HTMLImageElement | null {
    const url = this.getCurrentFrame();
    const img = this.imageCache.get(url);

    // Return image only if it's fully loaded
    if (img && img.complete && img.naturalWidth > 0) {
      return img;
    }

    return null;
  }

  /**
   * Draw sprite on canvas at specified position and size
   */
  draw(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    const img = this.getCurrentImage();
    if (!img) return;

    try {
      // Draw sprite centered at (x, y)
      ctx.drawImage(img, x - width / 2, y - height / 2, width, height);
    } catch (err) {
      // Silently fail if image is still loading or broken
      console.warn('Failed to draw sprite:', err);
    }
  }

  /**
   * Get current animation state
   */
  getState(): AnimationState {
    return this.currentState;
  }

  /**
   * Get current frame index
   */
  getFrameIndex(): number {
    return this.frameIndex;
  }

  /**
   * Check if images are ready
   */
  isSpritesReady(): boolean {
    return this.isReady && this.imageCache.size > 0;
  }
}

/**
 * Build sprite frame set for a specific team
 * Uses CDN URLs for sprite images
 */
export function buildSpriteFrameSet(team: string): SpriteFrameSet {
  // Map team names to sprite asset names
  const teamMap: Record<string, string> = {
    inferno: 'inferno',
    cyclone: 'cyclone',
    vortex: 'vortex',
    sledge: 'sledge',
    empire: 'empire',
    almighty: 'almighty',
    goliath: 'goliath',
    phoenix: 'phoenix',
    shock: 'shock',
    titan: 'titan',
    nebula: 'nebula',
    blackout: 'blackout',
    frost: 'frost',
    strike: 'strike',
    venom: 'venom',
    orbit: 'orbit',
  };

  const spriteTeam = teamMap[team.toLowerCase()] || 'inferno';
  const baseUrl = `https://d2xsxph8kpxj0f.cloudfront.net/310519663489271487/bLh3StKHGXUj5K9umHEgwQ`;

  return {
    idle: [
      `${baseUrl}/pyroball-sprites-${spriteTeam}-idle-HgCdzCEFwDWzifCnRSFfU9.webp`,
    ],
    run: [
      `${baseUrl}/pyroball-sprites-${spriteTeam}-run1-cztZL46h9k3BCJZUJRpVam.webp`,
      `${baseUrl}/pyroball-sprites-${spriteTeam}-run2-PRBV45wsHQfuN76aWmaeaT.webp`,
      `${baseUrl}/pyroball-sprites-${spriteTeam}-run3-88kx9ZBmT4bbydKtH4G2cB.webp`,
    ],
    jump: `${baseUrl}/pyroball-sprites-${spriteTeam}-jump-4NeboopQqjpWUXgdWLdsWr.webp`,
    shoot: `${baseUrl}/pyroball-sprites-${spriteTeam}-shoot-K8sAe4zSF2xeVR4eBcwnUK.webp`,
    pass: `${baseUrl}/pyroball-sprites-${spriteTeam}-pass-PjNQHMNBEzjdVbo2gqtCv8.webp`,
    catch: `${baseUrl}/pyroball-sprites-${spriteTeam}-catch-LDREyTrHWRrpKQtit9QUJk.webp`,
  };
}
