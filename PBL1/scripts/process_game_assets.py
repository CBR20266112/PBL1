"""게임 에셋 후처리: 체커보드 제거, 크롭·정렬, 아이콘 분할."""
from __future__ import annotations

import os
import shutil
from pathlib import Path

from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[1]
GAME = ROOT / "assets" / "game"
ICON_DIR = ROOT / "assets" / "icon"
PET_FX = ROOT / "assets" / "pet" / "effects"
ARCHIVE = GAME / "_source"
CANVAS = 1024


def is_bg_pixel(r: int, g: int, b: int, bg_colors: set[tuple[int, int, int]] | None = None) -> bool:
    if bg_colors:
        for br, bg, bb in bg_colors:
            if abs(r - br) <= 22 and abs(g - bg) <= 22 and abs(b - bb) <= 22:
                return True
        return False
    if r > 248 and g > 248 and b > 248:
        return True
    if r < 22 and g < 22 and b < 22:
        return True
    if abs(r - g) < 8 and abs(g - b) < 8 and 186 <= r <= 202:
        return True
    return False


def sample_corner_colors(img: Image.Image, n: int = 12) -> set[tuple[int, int, int]]:
    img = img.convert("RGB")
    w, h = img.size
    px = img.load()
    pts = []
    for i in range(n):
        t = i / max(n - 1, 1)
        pts.extend([
            (int(t * (w - 1)), 0),
            (int(t * (w - 1)), h - 1),
            (0, int(t * (h - 1))),
            (w - 1, int(t * (h - 1))),
        ])
    colors: set[tuple[int, int, int]] = set()
    for x, y in pts:
        r, g, b = px[x, y]
        colors.add((r, g, b))
    return colors


def remove_checkerboard(img: Image.Image) -> Image.Image:
    img = img.convert("RGBA")
    w, h = img.size
    px = img.load()
    bg_colors = sample_corner_colors(img)
    visited = [[False] * w for _ in range(h)]

    def neighbors(x: int, y: int):
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h:
                yield nx, ny

    stack = []
    for x, y in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)):
        r, g, b, a = px[x, y]
        if is_bg_pixel(r, g, b, bg_colors):
            stack.append((x, y))

    while stack:
        x, y = stack.pop()
        if visited[y][x]:
            continue
        r, g, b, a = px[x, y]
        if not is_bg_pixel(r, g, b, bg_colors):
            continue
        visited[y][x] = True
        px[x, y] = (0, 0, 0, 0)
        for nx, ny in neighbors(x, y):
            if not visited[ny][nx]:
                stack.append((nx, ny))
    return img


def trim_transparent(img: Image.Image, pad: int = 8) -> Image.Image:
    img = img.convert("RGBA")
    alpha = img.split()[-1]
    bbox = alpha.getbbox()
    if not bbox:
        return img
    x0, y0, x1, y1 = bbox
    x0 = max(0, x0 - pad)
    y0 = max(0, y0 - pad)
    x1 = min(img.width, x1 + pad)
    y1 = min(img.height, y1 + pad)
    return img.crop((x0, y0, x1, y1))


def place_on_canvas(img: Image.Image, size: int = CANVAS, scale: float = 0.82, y_offset: int = 0) -> Image.Image:
    img = trim_transparent(img)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    target = int(size * scale)
    w, h = img.size
    ratio = min(target / w, target / h)
    nw, nh = max(1, int(w * ratio)), max(1, int(h * ratio))
    resized = img.resize((nw, nh), Image.Resampling.LANCZOS)
    x = (size - nw) // 2
    y = (size - nh) // 2 + y_offset
    canvas.paste(resized, (x, y), resized)
    return canvas


def save_png(img: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, "PNG", optimize=True)
    print("saved", path.relative_to(ROOT))


def process_sprite(src: Path, dst: Path, scale: float = 0.82, y_offset: int = 0) -> None:
    img = Image.open(src)
    if img.mode != "RGBA":
        img = remove_checkerboard(img)
    else:
        img = img.convert("RGBA")
    out = place_on_canvas(img, scale=scale, y_offset=y_offset)
    save_png(out, dst)


def split_icon_grid(src: Path, out_dir: Path, names: list[str]) -> None:
    img = Image.open(src).convert("RGBA")
    w, h = img.size
    hw, hh = w // 2, h // 2
    quads = [
        (0, 0, hw, hh),
        (hw, 0, w, hh),
        (0, hh, hw, h),
        (hw, hh, w, h),
    ]
    for name, box in zip(names, quads):
        crop = img.crop(box)
        canvas = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
        cw, ch = crop.size
        ratio = min(512 / cw, 512 / ch)
        nw, nh = int(cw * ratio), int(ch * ratio)
        resized = crop.resize((nw, nh), Image.Resampling.LANCZOS)
        canvas.paste(resized, ((512 - nw) // 2, (512 - nh) // 2), resized)
        save_png(canvas, out_dir / name)


def main() -> None:
    ARCHIVE.mkdir(exist_ok=True)
    ICON_DIR.mkdir(exist_ok=True)

    # 원본 보관 (_source에서 복원 후 재처리)
    for name in ("fluffywool.png", "bared2.png", "clipper2.png", "particle2.png",
                 "sparkle.png", "icon.png", "icon2345.png"):
        src = ARCHIVE / name
        if src.exists():
            shutil.copy2(src, GAME / name)

    # 미니게임 레이어 — bared2 기준 정렬, wool은 약간 더 크게
    process_sprite(GAME / "bared2.png", GAME / "bared.png", scale=0.72, y_offset=24)
    process_sprite(GAME / "fluffywool.png", GAME / "fluffy.png", scale=0.86, y_offset=10)

    # 도구·파티클
    process_sprite(GAME / "clipper2.png", GAME / "clipper.png", scale=0.55)
    process_sprite(GAME / "particle.png", GAME / "particle.png", scale=0.28)

    # particle2 → 개별 조각 1장 추출
    p2 = remove_checkerboard(Image.open(GAME / "particle2.png"))
    p2 = trim_transparent(p2)
    # 가로 3등분
    w, h = p2.size
    third = w // 3
    piece = p2.crop((third, 0, third * 2, h))
    save_png(place_on_canvas(piece, scale=0.22), GAME / "particle_alt.png")

    # sparkle → pet effects
    process_sprite(GAME / "sparkle.png", PET_FX / "sparkle.png", scale=0.35)

    # 앱 아이콘 — icon.png(밤 하늘 클로즈업) 메인
    icon_main = Image.open(GAME / "icon.png").convert("RGBA")
    save_png(icon_main.resize((512, 512), Image.Resampling.LANCZOS), ICON_DIR / "app_icon_512.png")
    save_png(icon_main.resize((192, 192), Image.Resampling.LANCZOS), ICON_DIR / "app_icon_192.png")

    split_icon_grid(
        GAME / "icon2345.png",
        ICON_DIR,
        ["app_icon_candidate_night.png", "app_icon_candidate_day.png",
         "app_icon_candidate_mint.png", "app_icon_candidate_sunset.png"],
    )

    # game 폴더 정리 — 중복·원본·아이콘 이동
    for name in ("bared2.png", "fluffywool.png", "clipper2.png", "particle2.png",
                 "sparkle.png", "icon.png", "icon2345.png"):
        src = GAME / name
        if src.exists():
            dst = ARCHIVE / name
            if not dst.exists():
                shutil.move(str(src), str(dst))
            else:
                src.unlink()

    print("done")


if __name__ == "__main__":
    main()
