#!/usr/bin/env python3
"""
Generate the OG thumbnail for futuresdailyword.com.
Run from the repo root: python3 tools/generate-og-image.py
Output: public/og-image.png (1200x630)
"""

import os
from PIL import Image, ImageDraw, ImageFont

# ----- Canvas & colours (match site dark-mode theme) -----
W, H = 1200, 630
BG      = (15, 13, 11)        # #0F0D0B
RED     = (220, 83, 93)        # #DC535D  accent
CREAM   = (242, 237, 229)      # #F2EDE5  primary text
MUTED   = (138, 130, 122)      # #8A827A  secondary text
BORDER  = (46, 42, 37)         # #2E2A25

# ----- Fonts -----
SERIF_BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf'
SERIF      = '/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf'
SANS       = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'

font_dw    = ImageFont.truetype(SERIF_BOLD, 280)
font_title = ImageFont.truetype(SERIF,      66)
font_sub   = ImageFont.truetype(SANS,       23)

# ----- Layout helpers -----
def centered_x(draw, text, font, canvas_w=W):
    bbox = draw.textbbox((0, 0), text, font=font)
    text_w = bbox[2] - bbox[0]
    return (canvas_w - text_w) // 2 - bbox[0]

def text_height(draw, text, font):
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[3] - bbox[1]

def draw_spaced_text(draw, xy, text, font, fill, spacing=3):
    """Draw text with extra letter-spacing."""
    x, y = xy
    for ch in text:
        draw.text((x, y), ch, font=font, fill=fill)
        bbox = draw.textbbox((0, 0), ch, font=font)
        x += (bbox[2] - bbox[0]) + spacing

def spaced_text_width(draw, text, font, spacing=3):
    total = 0
    for i, ch in enumerate(text):
        bbox = draw.textbbox((0, 0), ch, font=font)
        total += (bbox[2] - bbox[0])
        if i < len(text) - 1:
            total += spacing
    return total

# ----- Build image -----
img  = Image.new('RGB', (W, H), BG)
draw = ImageDraw.Draw(img)

# Compute content block height to centre it vertically
DW_TEXT    = 'DW'
TITLE_TEXT = 'Futures Daily Word'
SUB_TEXT   = 'YOUR DAILY BIBLE READING COMPANION'

dw_h     = text_height(draw, DW_TEXT,    font_dw)
title_h  = text_height(draw, TITLE_TEXT, font_title)
sub_h    = text_height(draw, SUB_TEXT,   font_sub)

GAP_1 = 18   # between DW and accent line
LINE_H = 3   # accent line height
GAP_2 = 22   # between accent line and title
GAP_3 = 24   # between title and subtitle

total_h = dw_h + GAP_1 + LINE_H + GAP_2 + title_h + GAP_3 + sub_h
top = (H - total_h) // 2

# 1. Large "DW" in accent red
y = top
x = centered_x(draw, DW_TEXT, font_dw)
draw.text((x, y), DW_TEXT, font=font_dw, fill=RED)
y += dw_h + GAP_1

# 2. Thin red accent line
line_x1 = W // 2 - 140
line_x2 = W // 2 + 140
draw.rectangle([line_x1, y, line_x2, y + LINE_H], fill=RED)
y += LINE_H + GAP_2

# 3. "Futures Daily Word" in cream
x = centered_x(draw, TITLE_TEXT, font_title)
draw.text((x, y), TITLE_TEXT, font=font_title, fill=CREAM)
y += title_h + GAP_3

# 4. Subtitle in muted with slight letter-spacing
sub_w = spaced_text_width(draw, SUB_TEXT, font_sub, spacing=2)
sub_x = (W - sub_w) // 2
draw_spaced_text(draw, (sub_x, y), SUB_TEXT, font_sub, fill=MUTED, spacing=2)

# ----- Save -----
out_path = os.path.join(os.path.dirname(__file__), '..', 'public', 'og-image.png')
out_path = os.path.normpath(out_path)
img.save(out_path, 'PNG', optimize=True)
print(f"Saved {out_path}  ({W}x{H})")
