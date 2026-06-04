from datetime import datetime
from io import BytesIO
import os
import textwrap

from flask import current_app
from PIL import Image, ImageDraw, ImageFont


PAGE_SIZE = (1240, 1754)  # A4 at roughly 150 DPI
MARGIN = 80


def _hex_to_rgb(value, fallback):
    value = (value or '').strip()
    if len(value) == 7 and value.startswith('#'):
        try:
            return tuple(int(value[index:index + 2], 16) for index in (1, 3, 5))
        except ValueError:
            pass
    return fallback


def _font(size, bold=False):
    candidates = [
        'DejaVuSans-Bold.ttf' if bold else 'DejaVuSans.ttf',
        'arialbd.ttf' if bold else 'arial.ttf',
    ]
    for candidate in candidates:
        try:
            return ImageFont.truetype(candidate, size)
        except OSError:
            continue
    return ImageFont.load_default()


def _asset_path(relative_path):
    if not relative_path:
        return None
    if relative_path.startswith('http://') or relative_path.startswith('https://'):
        return None
    return os.path.abspath(os.path.join(current_app.root_path, '..', relative_path.lstrip('/')))


def _draw_wrapped(draw, text, xy, font, fill, width, line_gap=8):
    x, y = xy
    if not text:
        return y
    average_char_width = max(draw.textlength('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', font=font) / 52, 6)
    max_chars = max(18, int(width / average_char_width))
    for paragraph in str(text).splitlines():
        lines = textwrap.wrap(paragraph, width=max_chars) or ['']
        for line in lines:
            draw.text((x, y), line, font=font, fill=fill)
            y += font.size + line_gap
    return y


def _fit_logo(page, logo_path, x, y, max_width=260, max_height=90):
    if not logo_path or not os.path.exists(logo_path):
        return
    try:
        logo = Image.open(logo_path).convert('RGBA')
        logo.thumbnail((max_width, max_height), Image.LANCZOS)
        page.paste(logo, (x, y), logo)
    except Exception:
        current_app.logger.warning('Could not render white-label report logo', exc_info=True)


def _new_page(brand, title, date_label):
    primary = _hex_to_rgb(getattr(brand, 'report_brand_color', None), (181, 230, 29))
    secondary = _hex_to_rgb(getattr(brand, 'report_secondary_color', None), (31, 41, 55))
    page = Image.new('RGB', PAGE_SIZE, 'white')
    draw = ImageDraw.Draw(page)

    draw.rectangle((0, 0, PAGE_SIZE[0], 18), fill=primary)
    logo_path = _asset_path(getattr(brand, 'report_logo', None) or getattr(brand, 'logo', None))
    _fit_logo(page, logo_path, MARGIN, 54)

    title_x = 380 if logo_path else MARGIN
    draw.text((title_x, 56), title, font=_font(36, True), fill=secondary)
    draw.text((title_x, 108), date_label, font=_font(19), fill=(99, 102, 111))
    draw.line((MARGIN, 170, PAGE_SIZE[0] - MARGIN, 170), fill=primary, width=4)

    footer = 'Powered by BantuBuzz'
    footer_width = draw.textlength(footer, font=_font(16))
    draw.text(((PAGE_SIZE[0] - footer_width) / 2, PAGE_SIZE[1] - 58), footer, font=_font(16), fill=(120, 120, 120))
    return page, draw, primary, secondary


def generate_master_dashboard_pdf(brand, payload):
    language = payload.get('language', {})
    title = f"{language.get('dashboard_title', 'Workspace Dashboard')} Report"
    date_range = payload.get('date_range') or {}
    date_label = 'All time'
    if date_range.get('start_date') or date_range.get('end_date'):
        date_label = f"{date_range.get('start_date') or 'Start'} to {date_range.get('end_date') or 'Today'}"

    pages = []
    page, draw, primary, secondary = _new_page(brand, title, date_label)
    pages.append(page)
    y = 220

    company_name = getattr(brand, 'report_sender_name', None) or getattr(brand, 'company_name', None) or 'Agency'
    draw.text((MARGIN, y), company_name, font=_font(28, True), fill=secondary)
    y += 54

    totals = payload.get('totals') or {}
    stats = [
        (language.get('workspace_plural', 'workspaces').title(), totals.get('clients', 0)),
        ('Campaigns', totals.get('campaigns', 0)),
        ('Active Collaborations', totals.get('active_collaborations', 0)),
        ('Spend', f"${float(totals.get('spend') or 0):.2f}"),
    ]
    card_width = 250
    for index, (label, value) in enumerate(stats):
        x = MARGIN + index * (card_width + 24)
        draw.rounded_rectangle((x, y, x + card_width, y + 128), radius=18, outline=(229, 231, 235), width=2, fill=(249, 250, 251))
        draw.text((x + 22, y + 22), str(label), font=_font(17), fill=(99, 102, 111))
        draw.text((x + 22, y + 62), str(value), font=_font(27, True), fill=secondary)
    y += 184

    headers = [
        language.get('workspace_singular', 'workspace').title(),
        'Campaigns',
        'Active',
        'Approvals',
        'Spend',
    ]
    column_x = [MARGIN, 510, 690, 850, 1010]
    for index, header in enumerate(headers):
        draw.text((column_x[index], y), header, font=_font(17, True), fill=secondary)
    y += 36
    draw.line((MARGIN, y, PAGE_SIZE[0] - MARGIN, y), fill=(229, 231, 235), width=2)
    y += 22

    for item in payload.get('clients', []):
        if y > PAGE_SIZE[1] - 170:
            page, draw, primary, secondary = _new_page(brand, title, date_label)
            pages.append(page)
            y = 220
        draw.text((column_x[0], y), str(item.get('name') or ''), font=_font(18, True), fill=secondary)
        industry = item.get('industry') or 'No industry set'
        draw.text((column_x[0], y + 28), str(industry), font=_font(15), fill=(99, 102, 111))
        draw.text((column_x[1], y + 10), str(item.get('campaigns_count') or 0), font=_font(18), fill=secondary)
        draw.text((column_x[2], y + 10), str(item.get('active_collaborations_count') or 0), font=_font(18), fill=secondary)
        draw.text((column_x[3], y + 10), str(item.get('pending_approvals_count') or 0), font=_font(18), fill=secondary)
        draw.text((column_x[4], y + 10), f"${float(item.get('total_spend') or 0):.2f}", font=_font(18, True), fill=secondary)
        y += 72
        draw.line((MARGIN, y, PAGE_SIZE[0] - MARGIN, y), fill=(243, 244, 246), width=1)
        y += 18

    signature = getattr(brand, 'report_email_signature', None)
    if signature:
        if y > PAGE_SIZE[1] - 290:
            page, draw, primary, secondary = _new_page(brand, title, date_label)
            pages.append(page)
            y = 220
        y += 20
        draw.line((MARGIN, y, PAGE_SIZE[0] - MARGIN, y), fill=primary, width=3)
        y += 28
        draw.text((MARGIN, y), 'Prepared by', font=_font(18, True), fill=secondary)
        y = _draw_wrapped(draw, signature, (MARGIN, y + 30), _font(17), (75, 85, 99), PAGE_SIZE[0] - (MARGIN * 2))

    metadata = f"Generated {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}"
    draw.text((MARGIN, PAGE_SIZE[1] - 92), metadata, font=_font(14), fill=(156, 163, 175))

    output = BytesIO()
    pages[0].save(output, format='PDF', save_all=True, append_images=pages[1:])
    output.seek(0)
    return output.getvalue()
