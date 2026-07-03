import json
from urllib import request as urlrequest
from urllib.error import HTTPError, URLError

from flask import current_app


class RecaptchaVerificationError(Exception):
    """Raised when a reCAPTCHA Enterprise assessment rejects a request."""


def verify_recaptcha_token(token, expected_action):
    """Validate a Google reCAPTCHA Enterprise token for a signup action."""
    if not token:
        raise RecaptchaVerificationError('Security verification is required. Please refresh and try again.')

    api_key = current_app.config.get('RECAPTCHA_ENTERPRISE_API_KEY')
    project_id = current_app.config.get('RECAPTCHA_ENTERPRISE_PROJECT_ID')
    site_key = current_app.config.get('RECAPTCHA_ENTERPRISE_SITE_KEY')

    if not api_key:
        current_app.logger.warning('RECAPTCHA_ENTERPRISE_API_KEY is not configured; signup reCAPTCHA enforcement is disabled.')
        return {'configured': False, 'score': None}

    assessment_url = (
        f'https://recaptchaenterprise.googleapis.com/v1/projects/{project_id}/assessments'
        f'?key={api_key}'
    )
    payload = json.dumps({
        'event': {
            'token': token,
            'expectedAction': expected_action,
            'siteKey': site_key,
        }
    }).encode('utf-8')

    req = urlrequest.Request(
        assessment_url,
        data=payload,
        headers={'Content-Type': 'application/json'},
        method='POST',
    )

    try:
        with urlrequest.urlopen(req, timeout=8) as response:
            assessment = json.loads(response.read().decode('utf-8'))
    except HTTPError as exc:
        current_app.logger.error('reCAPTCHA Enterprise HTTP error: %s %s', exc.code, exc.read().decode('utf-8', errors='replace'))
        raise RecaptchaVerificationError('Security verification failed. Please try again.')
    except (URLError, TimeoutError, ValueError) as exc:
        current_app.logger.error('reCAPTCHA Enterprise request failed: %s', exc)
        raise RecaptchaVerificationError('Security verification is temporarily unavailable. Please try again.')

    token_properties = assessment.get('tokenProperties') or {}
    risk_analysis = assessment.get('riskAnalysis') or {}

    if not token_properties.get('valid'):
        reason = token_properties.get('invalidReason') or 'invalid-token'
        current_app.logger.warning('reCAPTCHA token invalid: %s', reason)
        raise RecaptchaVerificationError('Security verification failed. Please refresh and try again.')

    actual_action = token_properties.get('action')
    if actual_action != expected_action:
        current_app.logger.warning('reCAPTCHA action mismatch: expected=%s actual=%s', expected_action, actual_action)
        raise RecaptchaVerificationError('Security verification failed. Please refresh and try again.')

    hostname = (token_properties.get('hostname') or '').lower()
    allowed_hostnames = current_app.config.get('RECAPTCHA_ENTERPRISE_ALLOWED_HOSTNAMES') or []
    if allowed_hostnames and hostname and hostname not in allowed_hostnames:
        current_app.logger.warning('reCAPTCHA hostname rejected: hostname=%s allowed=%s', hostname, allowed_hostnames)
        raise RecaptchaVerificationError('Security verification failed for this domain.')

    score = float(risk_analysis.get('score', 0))
    min_score = float(current_app.config.get('RECAPTCHA_ENTERPRISE_MIN_SCORE', 0.5))
    if score < min_score:
        reasons = risk_analysis.get('reasons') or []
        current_app.logger.warning('reCAPTCHA low score rejected: score=%s min=%s reasons=%s', score, min_score, reasons)
        raise RecaptchaVerificationError('Security verification failed. Please try again.')

    return {'configured': True, 'score': score, 'reasons': risk_analysis.get('reasons') or []}
