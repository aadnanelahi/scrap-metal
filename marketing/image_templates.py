from PIL import Image, ImageDraw, ImageFont
import os, math

SIZE = (1080, 1080)
BG_COLOR = "#0f172a"
ACCENT_COLOR = "#f97316"
TEXT_PRIMARY = "#f8fafc"
TEXT_SECONDARY = "#94a3b8"
LOGO_PATH = os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "techsight-logo.png")
FONT_DIR = os.path.join(os.path.dirname(__file__), "fonts")

_font_cache = {}

def _get_font(name, size):
    key = f"{name}_{size}"
    if key not in _font_cache:
        if name == "Manrope":
            path = os.path.join(FONT_DIR, "Manrope-Variable.ttf")
        else:
            path = os.path.join(FONT_DIR, f"{name}.ttf")
        if os.path.exists(path):
            _font_cache[key] = ImageFont.truetype(path, size)
        else:
            _font_cache[key] = ImageFont.load_default()
    return _font_cache[key]

def _draw_rounded_rect(draw, xy, radius, fill):
    x1, y1, x2, y2 = xy
    draw.rounded_rectangle(xy, radius=radius, fill=fill)

def _draw_base(draw):
    """Draw shared background elements."""
    draw.rectangle([(0, 0), SIZE], fill=BG_COLOR)
    draw.rectangle([(0, 0), (SIZE[0], 10)], fill=ACCENT_COLOR)

def _draw_bottom_bar(draw, en_text="scrapos.online", ar_text="سكراب أوس"):
    """Draw bottom branding bar with logo + text."""
    bar_y = SIZE[1] - 80
    draw.line([(0, bar_y), (SIZE[0], bar_y)], fill="#1e293b", width=1)

    logo = None
    if os.path.exists(LOGO_PATH):
        try:
            logo = Image.open(LOGO_PATH).convert("RGBA")
            logo.thumbnail((120, 40))
        except:
            logo = None

    if logo:
        draw.bitmap((40, bar_y + 20), logo.split()[3], fill=TEXT_PRIMARY)
        img_draw = ImageDraw.Draw(Image.new("RGBA", SIZE))

    font_small = _get_font("Manrope", 18)
    draw.text((180, bar_y + 24), en_text, fill=TEXT_SECONDARY, font=font_small)

    ar_font_small = _get_font("Manrope", 16)
    draw.text((SIZE[0] - 40, bar_y + 24), ar_text, fill=TEXT_SECONDARY, font=ar_font_small, anchor="rt")

def _draw_arabic_text(draw, text, xy, font, fill):
    """Simple RTL-ish Arabic rendering by right-aligning within a box."""
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    x, y = xy
    draw.text((x - tw, y), text, fill=fill, font=font)

def _wrap_text(draw, text, font, max_width):
    """Simple word wrap for a given text and font."""
    words = text.split()
    lines = []
    current = ""
    for w in words:
        test = f"{current} {w}".strip()
        bbox = draw.textbbox((0, 0), test, font=font)
        tw = bbox[2] - bbox[0]
        if tw <= max_width:
            current = test
        else:
            if current:
                lines.append(current)
            current = w
    if current:
        lines.append(current)
    return lines

def _draw_text_block(draw, text, xy, font, fill, max_width, line_gap=6, align="left"):
    """Draw a text block with word wrap, returning the y position after the last line."""
    x, y = xy
    lines = _wrap_text(draw, text, font, max_width)
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font)
        lh = bbox[3] - bbox[1]
        if align == "right":
            draw.text((x + max_width, y), line, fill=fill, font=font, anchor="rt")
        else:
            draw.text((x, y), line, fill=fill, font=font)
        y += lh + line_gap
    return y

def tip_card(headline_en, headline_ar, tip_number, body_en, body_ar):
    """Template 1: Tip Card — Large number + short tip."""
    img = Image.new("RGB", SIZE, BG_COLOR)
    draw = ImageDraw.Draw(img)
    _draw_base(draw)

    font_number = _get_font("Manrope", 120)
    font_title = _get_font("Manrope", 36)
    font_body = _get_font("Manrope", 22)

    # Large number
    draw.text((60, 80), str(tip_number).zfill(2), fill=ACCENT_COLOR, font=font_number)

    # English headline
    draw.text((60, 240), headline_en, fill=TEXT_PRIMARY, font=font_title)

    # Arabic headline (right-aligned)
    bbox_ar = draw.textbbox((0, 0), headline_ar, font=font_title)
    ar_x = SIZE[0] - 60
    draw.text((ar_x, 320), headline_ar, fill=TEXT_PRIMARY, font=font_title, anchor="rt")

    # Separator
    draw.rectangle([(60, 400), (SIZE[0] - 60, 402)], fill=ACCENT_COLOR)

    # Body English
    _draw_text_block(draw, body_en, (60, 440), font_body, TEXT_SECONDARY, SIZE[0] - 120)

    # Body Arabic (right-aligned)
    _draw_text_block(draw, body_ar, (60, 560), font_body, TEXT_SECONDARY, SIZE[0] - 120, align="right")

    _draw_bottom_bar(draw)
    return img

def feature_spotlight(feature_name_en, feature_name_ar, icon_emoji, description_en, description_ar):
    """Template 2: Feature spotlight with emoji icon."""
    img = Image.new("RGB", SIZE, BG_COLOR)
    draw = ImageDraw.Draw(img)
    _draw_base(draw)

    font_icon = _get_font("Manrope", 80)
    font_title = _get_font("Manrope", 40)
    font_body = _get_font("Manrope", 24)

    # Badge
    draw.rounded_rectangle([(60, 60), (260, 110)], radius=6, fill=ACCENT_COLOR)
    draw.text((160, 85), "FEATURE", fill=TEXT_PRIMARY, font=_get_font("Manrope", 22), anchor="mm")

    # Emoji icon
    draw.text((60, 150), icon_emoji, fill=TEXT_PRIMARY, font=font_icon)

    # Feature name EN
    draw.text((60, 280), feature_name_en, fill=TEXT_PRIMARY, font=font_title)

    # Feature name AR (right-aligned)
    draw.text((SIZE[0] - 60, 370), feature_name_ar, fill=TEXT_PRIMARY, font=font_title, anchor="rt")

    # Separator
    draw.rectangle([(60, 440), (SIZE[0] - 60, 442)], fill=ACCENT_COLOR)

    _draw_text_block(draw, description_en, (60, 480), font_body, TEXT_SECONDARY, SIZE[0] - 120)
    _draw_text_block(draw, description_ar, (60, 600), font_body, TEXT_SECONDARY, SIZE[0] - 120, align="right")

    _draw_bottom_bar(draw)
    return img

def industry_insight(stat, stat_label_en, stat_label_ar, context_en, context_ar):
    """Template 3: Big stat number + context."""
    img = Image.new("RGB", SIZE, BG_COLOR)
    draw = ImageDraw.Draw(img)
    _draw_base(draw)

    font_stat = _get_font("Manrope", 140)
    font_label = _get_font("Manrope", 28)
    font_context = _get_font("Manrope", 22)

    # Big stat number
    draw.text((60, 100), str(stat), fill=ACCENT_COLOR, font=font_stat)

    # Stat label EN
    draw.text((60, 280), stat_label_en, fill=TEXT_PRIMARY, font=font_label)

    # Stat label AR
    draw.text((SIZE[0] - 60, 350), stat_label_ar, fill=TEXT_PRIMARY, font=font_label, anchor="rt")

    # Separator
    draw.rectangle([(60, 420), (SIZE[0] - 60, 422)], fill=ACCENT_COLOR)

    _draw_text_block(draw, context_en, (60, 470), font_context, TEXT_SECONDARY, SIZE[0] - 120)
    _draw_text_block(draw, context_ar, (60, 580), font_context, TEXT_SECONDARY, SIZE[0] - 120, align="right")

    _draw_bottom_bar(draw)
    return img

def testimonial(quote_en, quote_ar, author_en, author_ar, role_en="", role_ar=""):
    """Template 4: Quote/testimonial with attribution."""
    img = Image.new("RGB", SIZE, BG_COLOR)
    draw = ImageDraw.Draw(img)
    _draw_base(draw)

    font_quote_mark = _get_font("Manrope", 160)
    font_quote = _get_font("Manrope", 30)
    font_author = _get_font("Manrope", 24)

    # Large quote mark
    draw.text((60, 70), '"', fill=ACCENT_COLOR, font=font_quote_mark)

    # Quote EN
    _draw_text_block(draw, quote_en, (60, 260), font_quote, TEXT_PRIMARY, SIZE[0] - 120)

    # Quote AR (right-aligned)
    _draw_text_block(draw, quote_ar, (60, 440), font_quote, TEXT_PRIMARY, SIZE[0] - 120, align="right")

    # Separator
    draw.rectangle([(60, 600), (SIZE[0] - 60, 602)], fill=ACCENT_COLOR)

    # Author EN
    draw.text((60, 630), f"— {author_en}", fill=TEXT_PRIMARY, font=font_author)
    if role_en:
        draw.text((60, 670), role_en, fill=TEXT_SECONDARY, font=_get_font("Manrope", 18))

    draw.text((SIZE[0] - 60, 700), f"— {author_ar}", fill=TEXT_PRIMARY, font=font_author, anchor="rt")

    _draw_bottom_bar(draw)
    return img

def product_update(version, features_en, features_ar, headline_en, headline_ar):
    """Template 5: Product update with NEW badge and feature list."""
    img = Image.new("RGB", SIZE, BG_COLOR)
    draw = ImageDraw.Draw(img)
    _draw_base(draw)

    font_badge = _get_font("Manrope", 22)
    font_headline = _get_font("Manrope", 36)
    font_feature = _get_font("Manrope", 24)

    # NEW badge
    draw.rounded_rectangle([(60, 60), (160, 110)], radius=6, fill="#10b981")
    draw.text((110, 85), "NEW", fill=TEXT_PRIMARY, font=font_badge, anchor="mm")

    # Version tag
    ver_bbox = draw.textbbox((0, 0), version, font=font_badge)
    draw.rounded_rectangle([(180, 60), (180 + ver_bbox[2] - ver_bbox[0] + 30, 110)], radius=6, fill="#1e293b")
    draw.text((195, 85), version, fill=TEXT_SECONDARY, font=font_badge, anchor="lm")

    # Headline EN
    draw.text((60, 160), headline_en, fill=TEXT_PRIMARY, font=font_headline)

    # Headline AR (right-aligned)
    draw.text((SIZE[0] - 60, 230), headline_ar, fill=TEXT_PRIMARY, font=font_headline, anchor="rt")

    # Separator
    draw.rectangle([(60, 310), (SIZE[0] - 60, 312)], fill=ACCENT_COLOR)

    # Features EN
    _draw_text_block(draw, features_en, (60, 360), font_feature, TEXT_SECONDARY, SIZE[0] - 120)

    # Features AR
    _draw_text_block(draw, features_ar, (60, 520), font_feature, TEXT_SECONDARY, SIZE[0] - 120, align="right")

    _draw_bottom_bar(draw)
    return img

TEMPLATES = {
    "tip": tip_card,
    "feature": feature_spotlight,
    "insight": industry_insight,
    "testimonial": testimonial,
    "update": product_update,
}

def generate(template_name, params):
    fn = TEMPLATES.get(template_name)
    if not fn:
        raise ValueError(f"Unknown template: {template_name}")
    return fn(**params)
