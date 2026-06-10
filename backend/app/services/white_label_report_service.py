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


def _new_page(brand, title, date_label, white_label=True):
    primary = _hex_to_rgb(
        getattr(brand, 'report_brand_color', None) if white_label else None,
        (181, 230, 29),
    )
    secondary = _hex_to_rgb(
        getattr(brand, 'report_secondary_color', None) if white_label else None,
        (31, 41, 55),
    )
    page = Image.new('RGB', PAGE_SIZE, 'white')
    draw = ImageDraw.Draw(page)

    draw.rectangle((0, 0, PAGE_SIZE[0], 18), fill=primary)
    logo_path = _asset_path(
        (getattr(brand, 'report_logo', None) or getattr(brand, 'logo', None))
        if white_label else None
    )
    _fit_logo(page, logo_path, MARGIN, 54)

    title_x = 380 if logo_path else MARGIN
    if not white_label:
        draw.text((MARGIN, 50), 'BantuBuzz', font=_font(24, True), fill=secondary)
        title_x = 270
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


def generate_campaign_sentiment_pdf(brand, campaign, performance):
    """Generate a branded Premium sentiment report for one campaign."""
    date_label = f"Generated {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}"
    title = f"{campaign.title} Sentiment Report"
    pages = []
    page, draw, primary, secondary = _new_page(brand, title, date_label)
    pages.append(page)
    y = 220

    sentiment = performance.get('sentiment') or {}
    percentages = sentiment.get('percentages') or {}
    overview = performance.get('overview') or {}

    draw.text((MARGIN, y), 'Campaign overview', font=_font(25, True), fill=secondary)
    y += 52
    stats = [
        ('Reach', f"{int(overview.get('total_reach') or 0):,}"),
        ('Engagement', f"{int(overview.get('total_engagements') or 0):,}"),
        ('Comments analysed', f"{int(sentiment.get('total_analyzed') or 0):,}"),
        ('Overall sentiment', str(sentiment.get('overall') or 'neutral').title()),
    ]
    card_width = 250
    for index, (label, value) in enumerate(stats):
        x = MARGIN + index * (card_width + 24)
        draw.rounded_rectangle(
            (x, y, x + card_width, y + 128),
            radius=16,
            outline=(229, 231, 235),
            width=2,
            fill=(249, 250, 251),
        )
        draw.text((x + 20, y + 20), label, font=_font(16), fill=(99, 102, 111))
        draw.text((x + 20, y + 60), value, font=_font(25, True), fill=secondary)
    y += 184

    draw.text((MARGIN, y), 'Sentiment distribution', font=_font(25, True), fill=secondary)
    y += 48
    for label, color in (
        ('positive', (34, 197, 94)),
        ('neutral', (107, 114, 128)),
        ('negative', (239, 68, 68)),
    ):
        percentage = float(percentages.get(label) or 0)
        draw.text((MARGIN, y), label.title(), font=_font(18, True), fill=secondary)
        draw.rounded_rectangle(
            (300, y + 2, PAGE_SIZE[0] - MARGIN, y + 28),
            radius=10,
            fill=(229, 231, 235),
        )
        width = int((PAGE_SIZE[0] - MARGIN - 300) * min(percentage, 100) / 100)
        if width > 0:
            draw.rounded_rectangle((300, y + 2, 300 + width, y + 28), radius=10, fill=color)
        draw.text((PAGE_SIZE[0] - 150, y), f'{percentage:.1f}%', font=_font(18, True), fill=secondary)
        y += 52

    y += 22
    draw.text((MARGIN, y), 'Sentiment drivers', font=_font(25, True), fill=secondary)
    y += 46
    drivers = sentiment.get('drivers') or {}
    for group, color in (('positive', (22, 101, 52)), ('negative', (185, 28, 28))):
        draw.text((MARGIN, y), f'{group.title()} themes', font=_font(19, True), fill=color)
        y += 34
        items = drivers.get(group) or []
        if not items:
            draw.text((MARGIN + 20, y), 'No recurring themes detected yet.', font=_font(16), fill=(99, 102, 111))
            y += 32
        for item in items:
            label = str(item.get('theme') or '').replace('_', ' ').title()
            draw.text((MARGIN + 20, y), f"- {label}: {item.get('count') or 0}", font=_font(17), fill=secondary)
            y += 30
        y += 16

    comments = sentiment.get('top_comments') or []
    if comments:
        page, draw, primary, secondary = _new_page(brand, title, 'Top comments by sentiment')
        pages.append(page)
        y = 220
        for index, comment in enumerate(comments, start=1):
            if y > PAGE_SIZE[1] - 180:
                page, draw, primary, secondary = _new_page(brand, title, 'Top comments by sentiment')
                pages.append(page)
                y = 220
            sentiment_label = str(comment.get('sentiment') or 'neutral').title()
            language = str(comment.get('language') or 'unknown').title()
            draw.text(
                (MARGIN, y),
                f"{index}. {sentiment_label} | {language} | {comment.get('likes') or 0} likes",
                font=_font(17, True),
                fill=secondary,
            )
            y = _draw_wrapped(
                draw,
                comment.get('content') or '',
                (MARGIN + 18, y + 30),
                _font(16),
                (75, 85, 99),
                PAGE_SIZE[0] - (MARGIN * 2) - 18,
                line_gap=6,
            )
            y += 24

    output = BytesIO()
    pages[0].save(output, format='PDF', save_all=True, append_images=pages[1:])
    output.seek(0)
    return output.getvalue()


def generate_campaign_report_pdf(brand, payload, white_label=False):
    """Generate the complete campaign stakeholder report."""
    campaign = payload.get('campaign') or {}
    date_range = payload.get('date_range') or {}
    date_label = (
        f"{date_range.get('start_date', 'Start')} to "
        f"{date_range.get('end_date', 'Today')}"
    )
    title = f"{campaign.get('title') or 'Campaign'} Performance Report"
    pages = []
    page, draw, primary, secondary = _new_page(
        brand,
        title,
        date_label,
        white_label=white_label,
    )
    pages.append(page)
    y = 220

    overview = payload.get('overview') or {}
    draw.text((MARGIN, y), 'Executive summary', font=_font(25, True), fill=secondary)
    y += 48
    summary = [
        ('Reach', f"{int(overview.get('total_reach') or 0):,}"),
        ('Impressions', f"{int(overview.get('total_impressions') or 0):,}"),
        ('Engagement', f"{int(overview.get('total_engagements') or 0):,}"),
        ('ROI', f"{float(overview.get('estimated_roi') or 0):.1f}%"),
        ('Creators', f"{int(overview.get('total_creators') or 0):,}"),
        ('Posts', f"{int(overview.get('total_posts') or 0):,}"),
        ('Spend', f"${float(overview.get('total_spend') or 0):,.2f}"),
        ('Engagement rate', f"{float(overview.get('engagement_rate') or 0):.2f}%"),
    ]
    card_width = 250
    for index, (label, value) in enumerate(summary):
        row, column = divmod(index, 4)
        x = MARGIN + column * (card_width + 24)
        card_y = y + row * 144
        draw.rounded_rectangle(
            (x, card_y, x + card_width, card_y + 120),
            radius=14,
            outline=(229, 231, 235),
            width=2,
            fill=(249, 250, 251),
        )
        draw.text((x + 18, card_y + 18), label, font=_font(15), fill=(99, 102, 111))
        draw.text((x + 18, card_y + 56), value, font=_font(24, True), fill=secondary)
    y += 320

    def draw_breakdown(section_title, rows, label_key):
        nonlocal page, draw, primary, secondary, y
        if y > PAGE_SIZE[1] - 420:
            page, draw, primary, secondary = _new_page(
                brand, title, date_label, white_label=white_label
            )
            pages.append(page)
            y = 220
        draw.text((MARGIN, y), section_title, font=_font(24, True), fill=secondary)
        y += 42
        headers = ['Name', 'Posts', 'Reach', 'Engagement', 'Rate']
        columns = [MARGIN, 570, 710, 900, 1080]
        for index, header in enumerate(headers):
            draw.text((columns[index], y), header, font=_font(15, True), fill=(99, 102, 111))
        y += 30
        draw.line((MARGIN, y, PAGE_SIZE[0] - MARGIN, y), fill=(229, 231, 235), width=2)
        y += 16
        for row in rows[:12]:
            if y > PAGE_SIZE[1] - 130:
                page, draw, primary, secondary = _new_page(
                    brand, title, date_label, white_label=white_label
                )
                pages.append(page)
                y = 220
            label = str(row.get(label_key) or 'Unknown')[:38]
            draw.text((columns[0], y), label, font=_font(16, True), fill=secondary)
            draw.text((columns[1], y), str(row.get('posts_count') or 0), font=_font(16), fill=secondary)
            draw.text((columns[2], y), f"{int(row.get('reach') or 0):,}", font=_font(16), fill=secondary)
            draw.text((columns[3], y), f"{int(row.get('engagements') or 0):,}", font=_font(16), fill=secondary)
            draw.text((columns[4], y), f"{float(row.get('engagement_rate') or 0):.2f}%", font=_font(16), fill=secondary)
            y += 42
        y += 28

    draw_breakdown('Creator performance', payload.get('by_creator') or [], 'creator_name')
    draw_breakdown('Platform performance', payload.get('by_platform') or [], 'platform')

    if white_label:
        signature = getattr(brand, 'report_email_signature', None)
        if signature:
            if y > PAGE_SIZE[1] - 260:
                page, draw, primary, secondary = _new_page(
                    brand, title, date_label, white_label=True
                )
                pages.append(page)
                y = 220
            draw.line((MARGIN, y, PAGE_SIZE[0] - MARGIN, y), fill=primary, width=3)
            draw.text((MARGIN, y + 24), 'Prepared by', font=_font(18, True), fill=secondary)
            _draw_wrapped(
                draw,
                signature,
                (MARGIN, y + 58),
                _font(16),
                (75, 85, 99),
                PAGE_SIZE[0] - (MARGIN * 2),
            )

    output = BytesIO()
    pages[0].save(output, format='PDF', save_all=True, append_images=pages[1:])
    output.seek(0)
    return output.getvalue()
