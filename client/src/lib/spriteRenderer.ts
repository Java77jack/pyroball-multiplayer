/**
 * Sprite-based player renderer for pixel art Pyroball players
 * Replaces vector rendering with pre-drawn pixel art sprites
 */

// Sprite URLs for different player states
const SPRITE_URLS = {
  idle: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663489271487/bLh3StKHGXUj5K9umHEgwQ/pyroball_player_idle-aSwC9dPzAcPYiehChQTVoL.webp',
  running: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663489271487/bLh3StKHGXUj5K9umHEgwQ/pyroball_player_running-gHnHiG8VehoaHG9LkVYz4U.webp',
  jumping: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663489271487/bLh3StKHGXUj5K9umHEgwQ/pyroball_player_jumping-dWyEYuzTroHmkLDggwuvNg.webp',
  shooting: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663489271487/bLh3StKHGXUj5K9umHEgwQ/pyroball_player_shooting-gEHRms2QFJ3QttXNqmdGSj.webp',
};

// Cache for loaded sprite images
const spriteCache = new Map<string, HTMLImageElement | null>();
const spriteLoadingPromises = new Map<string, Promise<HTMLImageElement>>();

/**
 * Load a sprite image and cache it
 */
function loadSprite(url: string): Promise<HTMLImageElement> {
  // Return cached image if available
  if (spriteCache.has(url)) {
    const cached = spriteCache.get(url);
    if (cached) {
      return Promise.resolve(cached);
    }
  }

  // Return existing loading promise if already loading
  if (spriteLoadingPromises.has(url)) {
    return spriteLoadingPromises.get(url)!;
  }

  // Create new loading promise
  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      spriteCache.set(url, img);
      spriteLoadingPromises.delete(url);
      resolve(img);
    };
    
    img.onerror = () => {
      spriteCache.set(url, null);
      spriteLoadingPromises.delete(url);
      reject(new Error(`Failed to load sprite: ${url}`));
    };
    
    img.src = url;
  });

  spriteLoadingPromises.set(url, promise);
  return promise;
}

/**
 * Get the appropriate sprite URL based on player pose
 */
function getSpriteUrl(pose: string): string {
  switch (pose) {
    case 'idle':
      return SPRITE_URLS.idle;
    case 'running':
      return SPRITE_URLS.running;
    case 'jumping':
      return SPRITE_URLS.jumping;
    case 'shooting':
      return SPRITE_URLS.shooting;
    case 'passing':
      return SPRITE_URLS.shooting;
    case 'catching':
      return SPRITE_URLS.idle;
    default:
      return SPRITE_URLS.idle;
  }
}

/**
 * Draw a player using sprite-based rendering
 * This is synchronous but uses cached images when available
 */
export function drawPlayerSprite(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  pose: string,
  teamColor: string,
  playerNumber: number,
  facingRight: boolean
) {
  const spriteUrl = getSpriteUrl(pose);
  const cachedSprite = spriteCache.get(spriteUrl);

  // If sprite is loaded, draw it
  if (cachedSprite) {
    try {
      ctx.save();
      ctx.translate(x, y);

      if (!facingRight) {
        ctx.scale(-1, 1);
      }

      const scaleFactor = size / 64;
      ctx.scale(scaleFactor, scaleFactor);
      ctx.drawImage(cachedSprite, -32, -32, 64, 64);
      ctx.restore();
    } catch (error) {
      console.error('Error drawing sprite:', error);
      // Fallback to circle
      drawFallback(ctx, x, y, size, teamColor);
    }
  } else {
    // Sprite not loaded yet, draw fallback
    drawFallback(ctx, x, y, size, teamColor);
    
    // Start loading the sprite asynchronously
    loadSprite(spriteUrl).catch(err => console.error('Failed to load sprite:', err));
  }
}

/**
 * Draw a fallback player representation while sprites are loading
 */
function drawFallback(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  teamColor: string
) {
  ctx.save();
  ctx.fillStyle = teamColor;
  ctx.beginPath();
  ctx.arc(x, y, size / 2, 0, Math.PI * 2);
  ctx.fill();
  
  // Add a border
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

/**
 * Preload all sprites for faster rendering
 */
export async function preloadSprites(): Promise<void> {
  const urls = Object.values(SPRITE_URLS);
  const promises = urls.map(url => 
    loadSprite(url).catch(err => console.warn('Failed to preload sprite:', err))
  );
  await Promise.all(promises);
}
