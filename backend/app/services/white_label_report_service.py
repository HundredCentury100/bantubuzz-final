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

    # Agency and client reports are white-label outputs. The report identity is
    # controlled by the configured logo, colours, sender, and signature above.
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
    creators = payload.get('by_creator') or []
    platforms = payload.get('by_platform') or []
    sentiment = payload.get('sentiment') or {}
    methodology = payload.get('methodology') or {}

    def fmt_num(value):
        return f"{int(float(value or 0)):,}"

    def fmt_money(value):
        return f"${float(value or 0):,.2f}"

    def fmt_percent(value):
        return f"{float(value or 0):.2f}%"

    def add_page(section_label=None):
        nonlocal page, draw, primary, secondary, y
        page, draw, primary, secondary = _new_page(
            brand,
            title,
            section_label or date_label,
            white_label=white_label,
        )
        pages.append(page)
        y = 220

    def ensure_space(height, section_label=None):
        if y + height > PAGE_SIZE[1] - 140:
            add_page(section_label)

    def stat_grid(stats, columns=3):
        nonlocal y
        card_gap = 24
        card_width = int((PAGE_SIZE[0] - (MARGIN * 2) - card_gap * (columns - 1)) / columns)
        card_height = 124
        for index, (label, value) in enumerate(stats):
            row, column = divmod(index, columns)
            x = MARGIN + column * (card_width + card_gap)
            card_y = y + row * (card_height + 22)
            draw.rounded_rectangle(
                (x, card_y, x + card_width, card_y + card_height),
                radius=14,
                outline=(229, 231, 235),
                width=2,
                fill=(249, 250, 251),
            )
            draw.text((x + 18, card_y + 18), label, font=_font(15), fill=(99, 102, 111))
            draw.text((x + 18, card_y + 58), str(value), font=_font(25, True), fill=secondary)
        y += ((len(stats) + columns - 1) // columns) * (card_height + 22) + 10

    def section_heading(text, subtitle=None):
        nonlocal y
        ensure_space(120, text)
        draw.text((MARGIN, y), text, font=_font(25, True), fill=secondary)
        y += 40
        if subtitle:
            y = _draw_wrapped(draw, subtitle, (MARGIN, y), _font(16), (75, 85, 99), PAGE_SIZE[0] - (MARGIN * 2))
            y += 18

    def draw_table(headers, rows, widths, section_label=None):
        nonlocal y
        ensure_space(90, section_label)
        x = MARGIN
        for header, width in zip(headers, widths):
            draw.text((x, y), header, font=_font(14, True), fill=(75, 85, 99))
            x += width
        y += 28
        draw.line((MARGIN, y, PAGE_SIZE[0] - MARGIN, y), fill=(229, 231, 235), width=2)
        y += 14
        for row in rows:
            ensure_space(72, section_label)
            x = MARGIN
            max_lines = 1
            wrapped_cells = []
            for cell, width in zip(row, widths):
                avg = max(draw.textlength('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', font=_font(15)) / 52, 6)
                lines = textwrap.wrap(str(cell or ''), width=max(8, int((width - 12) / avg))) or ['']
                lines = lines[:3]
                max_lines = max(max_lines, len(lines))
                wrapped_cells.append(lines)
            for lines, width in zip(wrapped_cells, widths):
                cell_y = y
                for line in lines:
                    draw.text((x, cell_y), line, font=_font(15), fill=secondary)
                    cell_y += 22
                x += width
            y += max_lines * 22 + 18
            draw.line((MARGIN, y - 8, PAGE_SIZE[0] - MARGIN, y - 8), fill=(243, 244, 246), width=1)
        y += 16

    section_heading(
        'Executive scorecard',
        'A campaign-level view of exposure, engagement, media-equivalent value, and creator activation.',
    )
    stat_grid([
        ('Campaign Spend', fmt_money(overview.get('total_spend'))),
        ('Views / Impressions', fmt_num(overview.get('views_impressions'))),
        ('Engagements', fmt_num(overview.get('total_engagements'))),
        ('Engagement Rate', fmt_percent(overview.get('engagement_rate'))),
        ('Earned Media Value', fmt_money(overview.get('earned_media_value'))),
        ('EMV Multiple', f"{float(overview.get('emv_multiple') or 0):.2f}x"),
        ('Cost Per Engagement', fmt_money(overview.get('cost_per_engagement'))),
        ('Cost / 1K Views', fmt_money(overview.get('cost_per_1000_views'))),
        ('Creators Activated', fmt_num(overview.get('total_creators'))),
        ('Published Posts', fmt_num(overview.get('total_posts'))),
        ('Views Per Post', fmt_num(overview.get('views_per_post'))),
        ('Reporting Period', date_label),
    ])

    section_heading('Key insights')
    top_creator = creators[0] if creators else None
    insights = [
        f"The campaign generated {fmt_num(overview.get('views_impressions'))} Views / Impressions and {fmt_num(overview.get('total_engagements'))} total engagements.",
        f"Estimated media-equivalent value is {fmt_money(overview.get('earned_media_value'))}, based on {overview.get('benchmark_version') or methodology.get('benchmark_version') or 'the current BantuBuzz benchmark'}.",
    ]
    if top_creator:
        insights.append(
            f"{top_creator.get('creator_name')} is currently the highest contributing creator by engagement with {fmt_num(top_creator.get('engagements'))} engagements."
        )
    for insight in insights:
        y = _draw_wrapped(draw, f"- {insight}", (MARGIN + 8, y), _font(17), secondary, PAGE_SIZE[0] - (MARGIN * 2) - 8)
        y += 8

    add_page('Campaign performance')
    section_heading('Campaign performance')
    draw_table(
        ['Platform', 'Posts', 'Views / Impressions', 'Engagements', 'Rate', 'EMV'],
        [
            [
                str(row.get('platform') or 'Unknown').title(),
                row.get('posts_count'),
                fmt_num(row.get('views_impressions')),
                fmt_num(row.get('engagements')),
                fmt_percent(row.get('engagement_rate')),
                fmt_money(row.get('earned_media_value')),
            ]
            for row in platforms
        ] or [['No platform data synced yet', '', '', '', '', '']],
        [210, 100, 240, 180, 150, 180],
        'Campaign performance',
    )

    section_heading('Engagement breakdown')
    draw_table(
        ['Interaction', 'Volume', 'Share of Engagement'],
        [
            [item.get('label'), fmt_num(item.get('value')), f"{float(item.get('percentage') or 0):.1f}%"]
            for item in (overview.get('engagement_breakdown') or [])
        ],
        [420, 260, 300],
        'Engagement breakdown',
    )

    add_page('Audience intelligence')
    section_heading('Sentiment analysis')
    sentiment_rows = []
    for label in ('positive', 'neutral', 'negative', 'critical'):
        sentiment_rows.append([
            label.title(),
            fmt_num((sentiment.get('counts') or {}).get(label)),
            f"{float((sentiment.get('percentages') or {}).get(label) or 0):.1f}%",
        ])
    draw_table(['Sentiment', 'Comments', 'Share'], sentiment_rows, [360, 260, 260], 'Sentiment analysis')

    section_heading('Know What People Are Saying')
    comments = sentiment.get('top_comments') or []
    if comments:
        for item in comments[:5]:
            content = item.get('content') or item.get('comment') or ''
            y = _draw_wrapped(draw, f"- {content}", (MARGIN + 8, y), _font(16), (75, 85, 99), PAGE_SIZE[0] - (MARGIN * 2) - 8)
            y += 10
    else:
        y = _draw_wrapped(
            draw,
            'Comment-level insight will appear here once synced posts have enough comments for analysis.',
            (MARGIN, y),
            _font(16),
            (75, 85, 99),
            PAGE_SIZE[0] - (MARGIN * 2),
        )
        y += 18

    section_heading('Emerging narratives')
    drivers = sentiment.get('drivers') or {}
    narrative_rows = []
    for group in ('positive', 'negative'):
        for item in (drivers.get(group) or [])[:5]:
            narrative_rows.append([group.title(), str(item.get('theme') or '').replace('_', ' ').title(), item.get('count')])
    draw_table(['Signal', 'Theme', 'Mentions'], narrative_rows or [['No recurring themes detected yet', '', '']], [220, 560, 180], 'Emerging narratives')

    add_page('Top collaborations')
    section_heading('Top collaborations and contribution')
    draw_table(
        ['Rank', 'Creator', 'Views / Impressions', '% Views', 'Engagements', '% Engagement'],
        [
            [
                row.get('rank'),
                row.get('creator_name'),
                fmt_num(row.get('views_impressions')),
                f"{float(row.get('view_contribution') or 0):.1f}%",
                fmt_num(row.get('engagements')),
                f"{float(row.get('engagement_contribution') or 0):.1f}%",
            ]
            for row in creators[:15]
        ] or [['-', 'No creators found', '', '', '', '']],
        [90, 300, 220, 140, 170, 160],
        'Top collaborations',
    )

    add_page('EMV and efficiency')
    section_heading(
        'Earned Media Value and efficiency',
        'EMV is an advertising-equivalent estimate of attention generated. It is not revenue and should not be read as ROI.',
    )
    draw_table(
        ['Component', 'Volume', 'Benchmark Value', 'EMV'],
        [
            [item.get('label'), fmt_num(item.get('volume')), item.get('rate_label'), fmt_money(item.get('value'))]
            for item in (overview.get('emv_components') or [])
        ],
        [360, 220, 260, 200],
        'EMV and efficiency',
    )
    section_heading('Creator EMV summary')
    draw_table(
        ['Creator', 'Spend', 'EMV', 'EMV Multiple', 'CPE'],
        [
            [
                row.get('creator_name'),
                fmt_money(row.get('spend')),
                fmt_money(row.get('earned_media_value')),
                f"{float(row.get('emv_multiple') or 0):.2f}x",
                fmt_money(row.get('cost_per_engagement')),
            ]
            for row in creators[:12]
        ] or [['No creator EMV data available', '', '', '', '']],
        [360, 170, 190, 170, 150],
        'Creator EMV summary',
    )

    for creator in creators:
        add_page(str(creator.get('creator_name') or 'Creator')[:42])
        section_heading(f"Creator deep dive: {creator.get('creator_name') or 'Creator'}")
        stat_grid([
            ('Views / Impressions', fmt_num(creator.get('views_impressions'))),
            ('Engagements', fmt_num(creator.get('engagements'))),
            ('Engagement Rate', fmt_percent(creator.get('engagement_rate'))),
            ('% Views', f"{float(creator.get('view_contribution') or 0):.1f}%"),
            ('% Engagement', f"{float(creator.get('engagement_contribution') or 0):.1f}%"),
            ('EMV', fmt_money(creator.get('earned_media_value'))),
        ])
        section_heading('Performance details')
        draw_table(
            ['Metric', 'Value'],
            [
                ['Published posts', fmt_num(creator.get('posts_count'))],
                ['Likes', fmt_num(creator.get('likes'))],
                ['Comments', fmt_num(creator.get('comments'))],
                ['Shares / Reposts', fmt_num(creator.get('shares'))],
                ['Saves / Favourites', fmt_num(creator.get('saves'))],
                ['Clicks', fmt_num(creator.get('clicks'))],
            ],
            [520, 300],
            'Performance details',
        )
        section_heading('BantuBuzz verdict')
        y = _draw_wrapped(
            draw,
            creator.get('campaign_verdict') or 'Creator performance should be assessed alongside the campaign objective and content quality.',
            (MARGIN, y),
            _font(17),
            (75, 85, 99),
            PAGE_SIZE[0] - (MARGIN * 2),
        )

    add_page('Methodology')
    section_heading('Methodology and data integrity')
    for note in (methodology.get('notes') or []):
        y = _draw_wrapped(draw, f"- {note}", (MARGIN + 8, y), _font(17), secondary, PAGE_SIZE[0] - (MARGIN * 2) - 8)
        y += 8
    y += 18
    section_heading('EMV benchmark')
    rates = methodology.get('emv_rates') or {}
    draw_table(
        ['Component', 'Benchmark'],
        [
            ['Views / Impressions', f"${float(rates.get('impressions_cpm') or 0):.2f} CPM"],
            ['Like', f"${float(rates.get('like') or 0):.2f} each"],
            ['Comment', f"${float(rates.get('comment') or 0):.2f} each"],
            ['Share / Repost', f"${float(rates.get('share') or 0):.2f} each"],
            ['Click', f"${float(rates.get('click') or 0):.2f} each"],
        ],
        [520, 300],
        'EMV benchmark',
    )

    if white_label:
        signature = getattr(brand, 'report_email_signature', None)
        if signature:
            ensure_space(240, 'Prepared by')
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
