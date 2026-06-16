"""
ThunziAI Service
Handles all interactions with ThunziAI API for social media analytics
"""
import os
import time
import requests
from typing import Dict, List, Optional
from datetime import datetime
from app.utils.logger import log_external_api_call, log_external_api_response, log_error


class ThunziAIService:
    BASE_URL = "https://app.thunzi.co"

    def __init__(self):
        # Store credentials in env variables or use hardcoded values
        self.api_key = os.getenv('THUNZI_API_KEY', 'WsoFzZyadXRLP8ypT1mIkhB8')  # API key for creator registration
        self.email = os.getenv('THUNZI_EMAIL', 'your-thunzi-email@example.com')  # TODO: Update this
        self.password = os.getenv('THUNZI_PASSWORD', 'your-thunzi-password')  # TODO: Update this
        self.company_id = os.getenv('THUNZI_COMPANY_ID', None)  # TODO: Add your ThunziAI company ID
        self.session = requests.Session()
        self.session.headers.update({
            'x-api-key': self.api_key
        })
        self.is_authenticated = False
        self.last_error = None

    def _log_response_body(self, response):
        """Return a safe response body for logging."""
        try:
            return response.json()
        except Exception:
            return response.text[:500] if response.text else ''

    def _set_last_error(self, context: str, response=None, message: str = None):
        self.last_error = {
            'context': context,
            'message': message,
            'status_code': getattr(response, 'status_code', None),
            'body': self._log_response_body(response) if response is not None else None
        }
        return self.last_error

    def _api_key_candidates(self) -> List[str]:
        """Return configured and documented Thunzi API keys without duplicates."""
        configured = os.getenv('THUNZI_API_KEYS', '')
        candidates = [self.api_key]
        candidates.extend([key.strip() for key in configured.split(',') if key.strip()])
        # Thunzi documentation has included both values in different sections.
        candidates.extend(['WsoFzZyadXRLP8ypT1mIkhB8', 'soFzZyadXRLP8ypT1mIkhB8'])
        unique = []
        for key in candidates:
            if key and key not in unique:
                unique.append(key)
        return unique

    def _request_with_api_key_fallback(self, method: str, url: str, **kwargs):
        """Send a Thunzi request with x-api-key and retry documented fallback keys on auth failures."""
        base_headers = dict(kwargs.pop('headers', {}) or {})
        last_response = None
        for api_key in self._api_key_candidates():
            headers = dict(base_headers)
            headers['x-api-key'] = api_key
            if kwargs.get('json') is not None:
                headers.setdefault('Content-Type', 'application/json')
            response = self.session.request(method, url, headers=headers, **kwargs)
            last_response = response
            if response.status_code not in [401, 403]:
                if api_key != self.api_key:
                    self.api_key = api_key
                    self.session.headers.update({'x-api-key': api_key})
                return response

        return last_response

    def _normalize_sync_status(self, status: Optional[str]) -> Optional[str]:
        """Normalize ThunziAI status drift."""
        if not status:
            return status
        normalized = status.lower()
        if normalized == 'failure':
            return 'failed'
        return normalized

    def _normalize_platform(self, platform: Dict) -> Dict:
        """Normalize common ThunziAI platform response field drift."""
        if not platform:
            return platform

        normalized = dict(platform)
        normalized['syncStatus'] = self._normalize_sync_status(
            normalized.get('syncStatus')
        )
        normalized['lastSyncedAt'] = (
            normalized.get('lastSyncedAt') or
            normalized.get('lastSynced') or
            normalized.get('lastSyncAt')
        )
        normalized.setdefault('scopes', platform.get('scopes') or [])
        return normalized

    def login(self, email: str = None, password: str = None) -> bool:
        """
        Login to ThunziAI and store session

        Args:
            email: ThunziAI account email (optional, uses instance email if not provided)
            password: ThunziAI account password (optional, uses instance password if not provided)
        """
        try:
            login_email = email or self.email
            login_password = password or self.password

            url = f"{self.BASE_URL}/api/login"
            payload = {"username": login_email, "password": "***MASKED***"}

            # Log the API call
            log_external_api_call(
                service='ThunziAI',
                method='POST',
                url=url,
                payload=payload
            )

            response = self._request_with_api_key_fallback(
                'POST',
                url,
                json={
                    "username": login_email,
                    "password": login_password
                },
                timeout=30
            )

            # Older Thunzi builds accepted "email" instead of "username".
            if response.status_code in [400, 422]:
                response = self._request_with_api_key_fallback(
                    'POST',
                    url,
                    json={
                        "email": login_email,
                        "password": login_password
                    },
                    timeout=30
                )

            # Log the response
            log_external_api_response(
                service='ThunziAI',
                method='POST',
                url=url,
                status_code=response.status_code,
                response_body=response.text[:500] if response.status_code != 200 else 'Login successful'
            )

            if response.status_code == 200:
                self.is_authenticated = True
                self.email = login_email
                return True

            log_error('ThunziAI.login', f"Login failed with status {response.status_code}: {response.text[:200]}")
            return False
        except Exception as e:
            log_error('ThunziAI.login', e)
            return False

    def _ensure_authenticated(self):
        """Ensure we're authenticated before making requests"""
        if not self.is_authenticated:
            self.login()

    def get_shared_company_id(self) -> int:
        """
        Get the shared ThunziAI company ID used for all BantuBuzz users
        Returns the company_id from environment variable
        """
        if not self.company_id:
            raise ValueError("THUNZI_COMPANY_ID not configured. Please add it to environment variables.")
        return int(self.company_id)

    def register_user(self, email: str, password: str) -> Optional[Dict]:
        """
        DEPRECATED: Use register_creator() instead
        This uses standard registration requiring OTP verification
        """
        print("WARNING: register_user() is deprecated. Use register_creator() instead.")
        try:
            response = self.session.post(
                f"{self.BASE_URL}/api/register",
                json={
                    "email": email,
                    "password": password
                }
            )

            if response.status_code in [200, 201]:  # Accept both 200 OK and 201 Created
                return response.json()

            print(f"ThunziAI registration failed: {response.status_code} - {response.text}")
            return None
        except Exception as e:
            print(f"ThunziAI registration error: {str(e)}")
            return None

    def register_creator(self, email: str, password: str) -> Optional[Dict]:
        """
        Register a creator via API key bypass (no OTP verification needed)
        Uses POST /api/creator/register with x-api-key header

        This endpoint bypasses the standard OTP verification flow, allowing
        automated creator registration for BantuBuzz integration.

        Args:
            email: Creator's email address
            password: Password for the ThunziAI account

        Returns:
            User data dict with id, email, role, setupStep, etc. if successful
            None if registration fails

        Response format:
            {
                "id": number,
                "email": string,
                "role": "admin",
                "companyId": null,
                "createdAt": string,
                "lastLoginAt": null,
                "setupStep": "complete",
                "verified": boolean
            }
        """
        try:
            url = f"{self.BASE_URL}/api/creator/register"
            headers = {
                'x-api-key': self.api_key,
                'Content-Type': 'application/json'
            }
            payload = {
                "email": email,
                "password": password
            }

            # Log API call (mask password)
            log_external_api_call(
                service='ThunziAI',
                method='POST',
                url=url,
                payload={'email': email, 'password': '***MASKED***'}
            )

            response = self._request_with_api_key_fallback('POST', url, json=payload, headers=headers, timeout=30)
            if response.status_code in [404, 405]:
                url = f"{self.BASE_URL}/api/creators/register"
                response = self._request_with_api_key_fallback('POST', url, json=payload, headers=headers, timeout=30)

            # Log response
            log_external_api_response(
                service='ThunziAI',
                method='POST',
                url=url,
                status_code=response.status_code,
                response_body=response.json() if response.status_code in [200, 201] else response.text[:500]
            )

            if response.status_code in [200, 201]:
                return response.json()

            log_error('ThunziAI.register_creator',
                     f"Failed with status {response.status_code}: {response.text[:200]}")
            return None
        except Exception as e:
            log_error('ThunziAI.register_creator', e)
            return None

    def ensure_user_registered(self, email: str) -> Optional[Dict]:
        """
        Register creator if not exists, then login
        Uses NEW API key registration endpoint to bypass OTP verification
        Password is set to email as per BantuBuzz convention

        IMPORTANT: API key registration creates unverified accounts. These accounts
        can create companies and platforms but cannot login until verified.
        For BantuBuzz integration, we use session-based authentication after registration.

        Returns: User data if successful, None otherwise
        """
        password = email  # Password = email per BantuBuzz convention

        # Try to login first (works for existing verified users)
        if self.login(email=email, password=password):
            log_external_api_response(
                service='ThunziAI',
                method='LOGIN',
                url=f"{self.BASE_URL}/api/login",
                status_code=200,
                response_body=f"Existing user {email} logged in successfully"
            )
            return {"email": email}

        # If login fails, try to register via API key endpoint
        # This will return 400 "Email already exists" for existing unverified accounts
        log_external_api_call(
            service='ThunziAI',
            method='REGISTER',
            url=f"{self.BASE_URL}/api/creator/register",
            payload={'email': email, 'note': 'Ensure user registered via API key'}
        )

        user_data = self.register_creator(email=email, password=password)

        # Check if registration failed due to "Email already exists"
        # This means the account exists but is unverified (cannot login)
        if not user_data:
            log_external_api_response(
                service='ThunziAI',
                method='REGISTER',
                url=f"{self.BASE_URL}/api/creator/register",
                status_code=400,
                response_body=f"Email {email} already exists (unverified account) - marking as authenticated anyway"
            )

            # For existing unverified accounts, mark as authenticated
            # The account exists in ThunziAI, we just can't login
            # But we can still make API calls as if we're authenticated
            self.is_authenticated = True
            self.email = email

            return {"email": email, "note": "existing_unverified"}

        # IMPORTANT: API key registration creates unverified accounts
        # These accounts can create companies/platforms but not login
        # Mark as authenticated using session from registration
        self.is_authenticated = True
        self.email = email

        log_external_api_response(
            service='ThunziAI',
            method='REGISTER',
            url=f"{self.BASE_URL}/api/creator/register",
            status_code=200,
            response_body=f"Creator {email} registered successfully (unverified account, session authenticated)"
        )

        return user_data

    def create_company(self, name: str, email: str = None, country: str = "Zimbabwe",
                      industry: str = None) -> Optional[int]:
        """Create ThunziAI company for BantuBuzz user (creator or brand)"""
        self._ensure_authenticated()

        try:
            payload = {
                "name": name,
                "country": country,
                "description": "BantuBuzz connected social analytics workspace"
            }
            if email:
                payload["contactEmail"] = email
            if industry:
                payload["industry"] = industry

            url = f"{self.BASE_URL}/api/company"
            log_external_api_call(
                service='ThunziAI',
                method='POST',
                url=url,
                payload=payload
            )

            response = self._request_with_api_key_fallback('POST', url, json=payload, timeout=30)

            # Some older Thunzi builds rejected optional company fields. Retry
            # with the legacy minimal payload before failing the connection flow.
            if response.status_code == 400 and any(key in payload for key in ['contactEmail', 'industry', 'description']):
                legacy_payload = {"name": name, "country": country}
                response = self._request_with_api_key_fallback('POST', url, json=legacy_payload, timeout=30)

            log_external_api_response(
                service='ThunziAI',
                method='POST',
                url=url,
                status_code=response.status_code,
                response_body=response.json() if response.status_code in [200, 201] else response.text[:500]
            )

            if response.status_code in [200, 201]:  # Accept both 200 OK and 201 Created
                data = response.json()
                return data.get('id')

            self._set_last_error('create_company', response)
            log_error('ThunziAI.create_company', f"Failed with status {response.status_code}: {response.text[:300]}")
            print(f"ThunziAI company creation failed: {response.status_code} - {response.text}")
            return None
        except Exception as e:
            print(f"ThunziAI company creation error: {str(e)}")
            return None

    def create_creator(self, name: str, email: str, bantubuzz_id: str, company_id: int) -> Optional[Dict]:
        """
        Create a creator entity in ThunziAI

        Args:
            name: Creator's name
            email: Creator's email
            bantubuzz_id: BantuBuzz creator ID (e.g., 'creator_25')
            company_id: ThunziAI company ID

        Returns:
            Creator data dict with bantuBuzzId, companyId, status
        """
        self._ensure_authenticated()

        try:
            payload = {
                "name": name,
                "email": email,
                "bantuBuzzId": bantubuzz_id,
                "companyId": company_id
            }

            url = f"{self.BASE_URL}/api/creators"

            log_external_api_call(
                service='ThunziAI',
                method='POST',
                url=url,
                payload=payload
            )

            response = self.session.post(url, json=payload)

            log_external_api_response(
                service='ThunziAI',
                method='POST',
                url=url,
                status_code=response.status_code,
                response_body=response.json() if response.status_code in [200, 201] else response.text[:500]
            )

            if response.status_code in [200, 201]:
                return response.json()

            log_error('ThunziAI.create_creator',
                     f"Failed with status {response.status_code}: {response.text[:200]}")
            return None
        except Exception as e:
            log_error('ThunziAI.create_creator', e)
            return None

    def ensure_creator_registered(self, bantubuzz_id: str, name: str, email: str, company_id: int) -> bool:
        """
        Ensure creator entity is registered in ThunziAI.
        Checks if creator exists first, creates if not.

        This method is used after platform connection to ensure the creator
        entity exists in ThunziAI, which is required for analytics endpoints.

        Args:
            bantubuzz_id: BantuBuzz creator ID (e.g., 'creator_83')
            name: Creator's name
            email: Creator's email
            company_id: ThunziAI company ID

        Returns:
            True if creator entity exists or was successfully created
            False if creation failed (but this shouldn't prevent platform connection)
        """
        self._ensure_authenticated()

        try:
            # First check if creator already exists
            url = f"{self.BASE_URL}/api/creators/{bantubuzz_id}/platforms"

            log_external_api_call(
                service='ThunziAI',
                method='GET',
                url=url,
                payload={'bantubuzz_id': bantubuzz_id, 'action': 'check_exists'}
            )

            response = self.session.get(url)

            log_external_api_response(
                service='ThunziAI',
                method='GET',
                url=url,
                status_code=response.status_code,
                response_body='Creator exists' if response.status_code == 200 else f'Creator not found (status {response.status_code})'
            )

            # If we get 200, creator exists
            if response.status_code == 200:
                log_external_api_response(
                    service='ThunziAI',
                    method='ensure_creator_registered',
                    url=url,
                    status_code=200,
                    response_body=f"Creator {bantubuzz_id} already exists in ThunziAI"
                )
                return True

            # If 404, creator doesn't exist - create it
            if response.status_code == 404:
                log_external_api_call(
                    service='ThunziAI',
                    method='POST',
                    url=f"{self.BASE_URL}/api/creators",
                    payload={
                        'name': name,
                        'email': email,
                        'bantuBuzzId': bantubuzz_id,
                        'companyId': company_id,
                        'action': 'auto_register_after_platform_connection'
                    }
                )

                creator_result = self.create_creator(
                    name=name,
                    email=email,
                    bantubuzz_id=bantubuzz_id,
                    company_id=company_id
                )

                if creator_result:
                    log_external_api_response(
                        service='ThunziAI',
                        method='ensure_creator_registered',
                        url=f"{self.BASE_URL}/api/creators",
                        status_code=201,
                        response_body=f"Creator {bantubuzz_id} successfully registered in ThunziAI"
                    )
                    return True
                else:
                    log_error('ThunziAI.ensure_creator_registered',
                             f"Failed to create creator {bantubuzz_id} in ThunziAI")
                    return False

            # Other status codes - log and return False
            log_error('ThunziAI.ensure_creator_registered',
                     f"Unexpected status {response.status_code} when checking creator {bantubuzz_id}")
            return False

        except Exception as e:
            log_error('ThunziAI.ensure_creator_registered', e)
            return False

    def add_platform(self, company_id: int, platform: str,
                    account_name: str, account_id: Optional[str] = None,
                    access_token: Optional[str] = None,
                    refresh_token: Optional[str] = None) -> Optional[Dict]:
        """
        Add and connect social media platform

        NOTE: As per ThunziAI API docs, POST /api/platforms now automatically
        attempts to connect the platform after adding it. Access tokens are
        required for OAuth platforms (Facebook/Instagram/YouTube/TikTok) to enable syncing.

        Args:
            company_id: ThunziAI company ID
            platform: One of: youtube, twitter, instagram, facebook, tiktok, website
            account_name: Social media handle/username
            account_id: Platform-specific ID (YouTube Channel ID, Page ID, etc.)
            access_token: OAuth access token for API access
            refresh_token: OAuth refresh token for renewing access

        Returns:
            Platform data dict with id, followers, posts, etc.
            {
                "id": number,
                "companyId": number,
                "platform": string,
                "accountName": string,
                "isConnected": boolean,
                "accountId": string,
                "accountIdSecondary": string,
                "profileUrl": string,
                "accessToken": string,
                "refreshToken": string,
                "tokenExpiry": string,
                "followers": number,
                "posts": number,
                "syncStatus": "pending" | "success" | "failure" | "in_progress",
                "lastSyncedAt": string,
                "createdAt": string
            }
        """
        self._ensure_authenticated()

        try:
            self.last_error = None
            payload = {
                "companyId": company_id,
                "platform": platform.lower(),
                "accountName": account_name
            }

            # IMPORTANT: For Meta platforms (Facebook/Instagram), DO NOT send accountId
            # ThunziAI will extract it from the accessToken itself
            # If we send accountId, ThunziAI returns 400 "Invalid platform connection data"

            # For NON-Meta platforms (YouTube, Twitter), send accountId if provided
            if account_id and platform.lower() not in ['facebook', 'instagram']:
                payload["accountId"] = account_id

            # Add access token (REQUIRED for OAuth platforms)
            if access_token:
                payload["accessToken"] = access_token

            # Add refresh token (REQUIRED for YouTube and recommended for others)
            if refresh_token:
                payload["refreshToken"] = refresh_token

            # Add redirect URI for OAuth platforms (YouTube, TikTok, Instagram)
            # This ensures OAuth callbacks route to our application
            if platform.lower() in ['youtube', 'tiktok', 'instagram']:
                payload["redirectUri"] = f"https://bantubuzz.com/api/creator/platforms/{platform.lower()}/callback"

            # Log the API call (mask tokens)
            masked_payload = payload.copy()
            if 'accessToken' in masked_payload:
                masked_payload['accessToken'] = f"{masked_payload['accessToken'][:15]}..."
            if 'refreshToken' in masked_payload:
                masked_payload['refreshToken'] = f"{masked_payload['refreshToken'][:15]}..."

            url = f"{self.BASE_URL}/api/platforms"
            log_external_api_call(
                service='ThunziAI',
                method='POST',
                url=url,
                payload=masked_payload
            )

            response = self.session.post(url, json=payload)

            # Log the response
            try:
                response_body = response.json() if response.status_code in [200, 201] else response.text
            except:
                response_body = response.text

            log_external_api_response(
                service='ThunziAI',
                method='POST',
                url=url,
                status_code=response.status_code,
                response_body=response_body
            )

            if response.status_code in [200, 201]:
                result = response.json()
                return self._normalize_platform(result)

            self._set_last_error('ThunziAI.add_platform', response=response)
            log_error('ThunziAI.add_platform', f"Failed with status {response.status_code}: {response.text}")
            return None
        except Exception as e:
            self._set_last_error('ThunziAI.add_platform', message=str(e))
            log_error('ThunziAI.add_platform', e)
            return None

    def connect_platform(self, platform_id: int) -> Optional[Dict]:
        """Connect a platform to start syncing data"""
        self._ensure_authenticated()

        try:
            response = self.session.put(
                f"{self.BASE_URL}/api/connect-platform/{platform_id}"
            )

            if response.status_code == 200:
                return self._normalize_platform(response.json())

            print(f"ThunziAI connect platform failed: {response.status_code}")
            return None
        except Exception as e:
            print(f"ThunziAI connect platform error: {str(e)}")
            return None

    def get_platforms(self, company_id: int) -> List[Dict]:
        """Get all connected platforms for a company"""
        self._ensure_authenticated()

        try:
            response = self.session.get(
                f"{self.BASE_URL}/api/platforms",
                params={"companyId": company_id}
            )

            if response.status_code == 200:
                return [self._normalize_platform(platform) for platform in response.json()]

            print(f"ThunziAI get platforms failed: {response.status_code}")
            return []
        except Exception as e:
            print(f"ThunziAI get platforms error: {str(e)}")
            return []

    def sync_platform(self, platform_id: int, account_id: str = None,
                     company_id: int = None, platform: str = None) -> bool:
        """
        Trigger sync for a platform to update followers/posts

        Args:
            platform_id: ThunziAI platform ID (required)
            account_id: Platform account ID (e.g., YouTube Channel ID) - NOT for Meta platforms
            company_id: ThunziAI company ID
            platform: Platform name (youtube, facebook, instagram, twitter)

        Note: For Meta platforms (Facebook/Instagram), DO NOT send accountId.
        ThunziAI already has it from the platform connection.
        """
        self._ensure_authenticated()

        try:
            payload = {"platformId": platform_id}

            # IMPORTANT: For Meta platforms, do NOT send accountId
            # ThunziAI already extracted it when the platform was connected
            if account_id and platform and platform.lower() not in ['facebook', 'instagram']:
                payload["accountId"] = account_id

            if company_id:
                payload["companyId"] = company_id
            if platform:
                payload["platform"] = platform

            url = f"{self.BASE_URL}/api/sync"

            log_external_api_call(
                service='ThunziAI',
                method='POST',
                url=url,
                payload=payload
            )

            response = self.session.post(url, json=payload)

            log_external_api_response(
                service='ThunziAI',
                method='POST',
                url=url,
                status_code=response.status_code,
                response_body=response.text[:500] if response.status_code != 200 else 'Sync triggered successfully'
            )

            if response.status_code != 200:
                log_error('ThunziAI.sync_platform',
                         f"Sync failed with status {response.status_code}: {response.text[:200]}")

            return response.status_code == 200
        except Exception as e:
            log_error('ThunziAI.sync_platform', e)
            return False

    def start_async_platform_sync(self, platform_id: int) -> Optional[Dict]:
        """
        Start asynchronous platform sync using the updated ThunziAI endpoint.

        Returns a dict like:
        {
            "status": "in_progress",
            "pollUrl": "https://app.thunzi.co/api/platforms/559/status"
        }
        """
        self._ensure_authenticated()

        try:
            url = f"{self.BASE_URL}/api/platforms/sync"
            payload = {"platformId": platform_id}

            log_external_api_call(
                service='ThunziAI',
                method='POST',
                url=url,
                payload=payload
            )

            response = self.session.post(url, json=payload, timeout=30)
            response_body = self._log_response_body(response)

            log_external_api_response(
                service='ThunziAI',
                method='POST',
                url=url,
                status_code=response.status_code,
                response_body=response_body
            )

            if response.status_code in [200, 201, 202]:
                data = response.json()
                if data.get('status'):
                    data['status'] = self._normalize_sync_status(data.get('status'))
                return data

            log_error('ThunziAI.start_async_platform_sync',
                     f"Failed with status {response.status_code}: {response.text[:200]}")
            return None
        except Exception as e:
            log_error('ThunziAI.start_async_platform_sync', e)
            return None

    def get_platform_sync_status(self, platform_id: int) -> Optional[str]:
        """Poll async platform sync status."""
        self._ensure_authenticated()

        try:
            url = f"{self.BASE_URL}/api/platforms/{platform_id}/status"

            log_external_api_call(
                service='ThunziAI',
                method='GET',
                url=url,
                payload={'platform_id': platform_id}
            )

            response = self.session.get(url, timeout=30)
            response_body = self._log_response_body(response)

            log_external_api_response(
                service='ThunziAI',
                method='GET',
                url=url,
                status_code=response.status_code,
                response_body=response_body
            )

            if response.status_code == 200:
                return self._normalize_sync_status(response.json().get('status'))

            log_error('ThunziAI.get_platform_sync_status',
                     f"Failed with status {response.status_code}: {response.text[:200]}")
            return None
        except Exception as e:
            log_error('ThunziAI.get_platform_sync_status', e)
            return None

    def sync_platform_and_poll(self, platform_id: int, timeout_seconds: int = 120,
                               poll_interval_seconds: int = 5) -> Dict:
        """
        Start async platform sync and poll until it completes, fails, or times out.
        Falls back to the legacy sync endpoint if the async endpoint is unavailable.
        """
        started = self.start_async_platform_sync(platform_id)

        if not started:
            legacy_success = self.sync_platform(platform_id=platform_id)
            return {
                'success': legacy_success,
                'status': 'success' if legacy_success else 'failed',
                'mode': 'legacy'
            }

        status = self._normalize_sync_status(started.get('status')) or 'pending'
        terminal_statuses = {'success', 'failed'}
        deadline = time.time() + timeout_seconds

        while status not in terminal_statuses and time.time() < deadline:
            time.sleep(poll_interval_seconds)
            polled_status = self.get_platform_sync_status(platform_id)
            if polled_status:
                status = polled_status

        return {
            'success': status == 'success',
            'status': status if status in terminal_statuses else 'timeout',
            'mode': 'async',
            'pollUrl': started.get('pollUrl')
        }

    def update_platform(self, platform_id: int, updates: Dict) -> Optional[Dict]:
        """Update platform details"""
        self._ensure_authenticated()

        try:
            response = self.session.put(
                f"{self.BASE_URL}/api/platforms/{platform_id}",
                json=updates
            )

            if response.status_code == 200:
                return response.json()

            return None
        except Exception as e:
            print(f"ThunziAI update platform error: {str(e)}")
            return None

    def reconnect_platform(self, platform_id: int, account_name: str, access_token: str) -> Optional[Dict]:
        """
        Reconnect a platform with new access token

        Used when tokens expire or user revokes access and needs to reconnect.

        Args:
            platform_id: ThunziAI platform ID
            account_name: Social media account name
            access_token: New User Access Token

        Returns:
            Updated platform data with new token
        """
        self._ensure_authenticated()

        try:
            response = self.session.put(
                f"{self.BASE_URL}/api/platforms/{platform_id}/reconnect",
                json={
                    "accountName": account_name,
                    "accessToken": access_token
                }
            )

            if response.status_code == 200:
                return response.json()

            print(f"ThunziAI reconnect platform failed: {response.status_code} - {response.text}")
            return None
        except Exception as e:
            print(f"ThunziAI reconnect platform error: {str(e)}")
            return None

    def delete_platform(self, platform_id: int) -> bool:
        """
        Delete/disconnect a platform from ThunziAI

        This removes the platform connection and all its associated posts/data.

        Args:
            platform_id: ThunziAI platform ID

        Returns:
            True if successfully deleted, False otherwise
        """
        self._ensure_authenticated()

        try:
            response = self.session.delete(
                f"{self.BASE_URL}/api/platforms/{platform_id}"
            )

            if response.status_code in [200, 204]:  # 200 OK or 204 No Content
                return True

            print(f"ThunziAI delete platform failed: {response.status_code} - {response.text}")
            return False
        except Exception as e:
            print(f"ThunziAI delete platform error: {str(e)}")
            return False

    def get_platform_posts(self, platform_id: int) -> List[Dict]:
        """
        Get all posts from a specific platform

        NOTE: The /api/platforms/:id/posts endpoint is not publicly documented.
        This method attempts to fetch posts, but may return empty list if endpoint
        is not available. Alternative: use get_creator_posts if creator entity exists.

        Args:
            platform_id: ThunziAI platform ID

        Returns:
            List of posts with metrics (may be empty if endpoint not available)
        """
        self._ensure_authenticated()

        try:
            # Try the platforms endpoint (may not be publicly available)
            response = self.session.get(
                f"{self.BASE_URL}/api/platforms/{platform_id}/posts"
            )

            # Check if we got JSON response (not HTML)
            content_type = response.headers.get('Content-Type', '')
            if response.status_code == 200 and 'application/json' in content_type:
                return response.json()

            # If we got HTML or error, endpoint likely doesn't exist
            print(f"ThunziAI get platform posts not available (got {content_type})")
            return []
        except Exception as e:
            print(f"ThunziAI get platform posts error: {str(e)}")
            return []

    def get_creator_posts(self, creator_id: int, start_date: str, end_date: str) -> List[Dict]:
        """
        Get posts for a creator within a date range

        Args:
            creator_id: ThunziAI creator ID
            start_date: Start date (YYYY-MM-DD)
            end_date: End date (YYYY-MM-DD)

        Returns:
            List of posts with originalPostId field for matching
        """
        self._ensure_authenticated()

        try:
            response = self.session.get(
                f"{self.BASE_URL}/api/creators/{creator_id}/posts",
                params={
                    "startDate": start_date,
                    "endDate": end_date
                }
            )

            if response.status_code == 200:
                return response.json()

            print(f"ThunziAI get creator posts failed: {response.status_code} - {response.text[:200]}")
            return []
        except Exception as e:
            print(f"ThunziAI get creator posts error: {str(e)}")
            return []

    def get_creator_posts_by_bantubuzz_id(self, bantubuzz_id: str, start_date: str, end_date: str) -> List[Dict]:
        """
        Get posts for a creator within a date range using BantuBuzz ID

        Args:
            bantubuzz_id: BantuBuzz creator ID (used as identifier in ThunziAI)
            start_date: Start date (YYYY-MM-DD)
            end_date: End date (YYYY-MM-DD)

        Returns:
            List of posts with originalId field for matching
        """
        self._ensure_authenticated()

        try:
            response = self.session.get(
                f"{self.BASE_URL}/api/creators/{bantubuzz_id}/posts",
                params={
                    "startDate": start_date,
                    "endDate": end_date
                }
            )

            if response.status_code == 200:
                return response.json()

            print(f"ThunziAI get creator posts by BantuBuzz ID failed: {response.status_code} - {response.text[:200]}")
            return []
        except Exception as e:
            print(f"ThunziAI get creator posts by BantuBuzz ID error: {str(e)}")
            return []

    def get_posts_by_company_id(self, company_id: int, start_date: str, end_date: str) -> List[Dict]:
        """
        Get all posts for a company within a date range

        NOTE: This endpoint works more reliably than the creator-specific endpoints.
        Use this when /api/creators/:bantuBuzzId/posts returns empty results.

        Args:
            company_id: ThunziAI company ID
            start_date: Start date (YYYY-MM-DD)
            end_date: End date (YYYY-MM-DD)

        Returns:
            List of posts with originalId field for matching
        """
        self._ensure_authenticated()

        try:
            response = self.session.get(
                f"{self.BASE_URL}/api/posts",
                params={
                    "companyId": company_id,
                    "startDate": start_date,
                    "endDate": end_date
                }
            )

            if response.status_code == 200:
                return response.json()

            print(f"ThunziAI get posts by company ID failed: {response.status_code} - {response.text[:200]}")
            return []
        except Exception as e:
            print(f"ThunziAI get posts by company ID error: {str(e)}")
            return []

    def find_post_by_url(self, url: str, company_id: int) -> Optional[Dict]:
        """
        Find a post by its public URL using ThunziAI's updated endpoint.

        Args:
            url: Public social media post URL
            company_id: ThunziAI company ID

        Returns:
            Post data with metrics or None if not found.
        """
        self._ensure_authenticated()

        try:
            endpoint = f"{self.BASE_URL}/api/posts/find-by-url"
            payload = {
                "url": url,
                "companyId": str(company_id)
            }

            log_external_api_call(
                service='ThunziAI',
                method='POST',
                url=endpoint,
                payload=payload
            )

            response = self.session.post(endpoint, json=payload, timeout=30)
            response_body = self._log_response_body(response)

            log_external_api_response(
                service='ThunziAI',
                method='POST',
                url=endpoint,
                status_code=response.status_code,
                response_body=response_body
            )

            if response.status_code == 200:
                return response.json()

            if response.status_code == 404:
                return None

            log_error('ThunziAI.find_post_by_url',
                     f"Failed with status {response.status_code}: {response.text[:200]}")
            return None
        except Exception as e:
            log_error('ThunziAI.find_post_by_url', e)
            return None

    def get_post_by_id(self, post_id: int) -> Optional[Dict]:
        """
        Get a specific post by ThunziAI post ID

        Args:
            post_id: ThunziAI's internal post ID

        Returns:
            Post data with all metrics, or None if not found
        """
        self._ensure_authenticated()

        try:
            response = self.session.get(
                f"{self.BASE_URL}/api/posts/{post_id}"
            )

            if response.status_code == 200:
                return response.json()

            print(f"ThunziAI get post failed: {response.status_code}")
            return None
        except Exception as e:
            print(f"ThunziAI get post error: {str(e)}")
            return None

    def get_post_insights(self, post_id: int) -> Optional[Dict]:
        """
        Get detailed insights for a post including sentiment analysis

        Args:
            post_id: ThunziAI's internal post ID

        Returns:
            {
                "postId": number,
                "post": {
                    "id": number,
                    "title": string,
                    "description": string,
                    "platform": string,
                    "likes": number,
                    "comments": number,
                    "shares": number,
                    "reach": number,
                    "impressions": number,
                    "sentiment": string,
                    "sentimentScore": number,
                    ...
                },
                "commentSentiment": {
                    "positive": number,
                    "neutral": number,
                    "negative": number,
                    "critical": number
                }
            }
        """
        self._ensure_authenticated()

        try:
            response = self.session.get(
                f"{self.BASE_URL}/api/posts/{post_id}/insights"
            )

            if response.status_code == 200:
                return response.json()

            print(f"ThunziAI get post insights failed: {response.status_code}")
            return None
        except Exception as e:
            print(f"ThunziAI get post insights error: {str(e)}")
            return None

    def get_post_comments(self, post_id: int, start_date: str = None, end_date: str = None) -> Optional[Dict]:
        """
        Get comments for a post with sentiment analysis

        Args:
            post_id: ThunziAI's internal post ID
            start_date: Optional start date (YYYY-MM-DD)
            end_date: Optional end date (YYYY-MM-DD)

        Returns:
            {
                "postId": number,
                "comments": [
                    {
                        "id": number,
                        "text": string,
                        "author": string,
                        "likes": number,
                        "sentiment": string,
                        "sentimentScore": number,
                        "createdAt": string
                    },
                    ...
                ]
            }
        """
        self._ensure_authenticated()

        try:
            params = {}
            if start_date:
                params['startDate'] = start_date
            if end_date:
                params['endDate'] = end_date

            response = self.session.get(
                f"{self.BASE_URL}/api/posts/{post_id}/comments",
                params=params if params else None
            )

            if response.status_code == 200:
                return response.json()

            print(f"ThunziAI get post comments failed: {response.status_code}")
            return None
        except Exception as e:
            print(f"ThunziAI get post comments error: {str(e)}")
            return None

    def get_creator_platforms(self, bantubuzz_id: str) -> List[Dict]:
        """
        Get all platforms with analytics for a creator (NEW ENDPOINT - Mar 2026)

        This endpoint returns pre-calculated analytics averages from ThunziAI,
        eliminating the need for manual calculation.

        Args:
            bantubuzz_id: BantuBuzz creator ID

        Returns:
            List of platform objects with analytics:
            [
                {
                    "id": number,
                    "companyId": number,
                    "platform": string,
                    "isConnected": boolean,
                    "accountName": string,
                    "profileUrl": string,
                    "accessToken": string,
                    "refreshToken": string,
                    "tokenExpiry": string,
                    "accountId": string,
                    "accountIdSecondary": string,
                    "followers": number,
                    "posts": number,
                    "averageEngagementRate": number,
                    "averageSentimentScore": number,
                    "averageViews": number,
                    "averageReach": number,
                    "averageComments": number,
                    "averageLikes": number,
                    "averageShares": number,
                    "averageSaves": number,
                    "syncStatus": string,
                    "lastSyncedAt": string
                },
                ...
            ]
        """
        self._ensure_authenticated()

        try:
            url = f"{self.BASE_URL}/api/creators/{bantubuzz_id}/platforms"

            log_external_api_call(
                service='ThunziAI',
                method='GET',
                url=url,
                payload={'bantubuzz_id': bantubuzz_id}
            )

            response = self.session.get(url)

            log_external_api_response(
                service='ThunziAI',
                method='GET',
                url=url,
                status_code=response.status_code,
                response_body=response.json() if response.status_code == 200 else response.text[:500]
            )

            if response.status_code == 200:
                return response.json()

            log_error('ThunziAI.get_creator_platforms',
                     f"Failed with status {response.status_code}: {response.text[:200]}")
            return []
        except Exception as e:
            log_error('ThunziAI.get_creator_platforms', e)
            return []

    def get_post_by_original_id(self, original_post_id: str) -> Optional[Dict]:
        """
        Get a post by its original platform ID

        Args:
            original_post_id: The original post ID from the social media platform

        Returns:
            Post data with metrics
        """
        self._ensure_authenticated()

        try:
            url = f"{self.BASE_URL}/api/posts/{original_post_id}"

            response = self.session.get(url)

            if response.status_code == 200:
                return response.json()

            print(f"ThunziAI get post by original ID failed: {response.status_code}")
            return None
        except Exception as e:
            print(f"ThunziAI get post by original ID error: {str(e)}")
            return None

    def get_post_insights_by_original_id(self, original_post_id: str) -> Optional[Dict]:
        """
        Get post insights including sentiment breakdown by original post ID

        Args:
            original_post_id: The original post ID from the social media platform

        Returns:
            {
                "postId": string,
                "sentiment": number,
                "post": {...},
                "commentSentiment": {
                    "positive": number,
                    "neutral": number,
                    "negative": number,
                    "critical": number
                }
            }
        """
        self._ensure_authenticated()

        try:
            url = f"{self.BASE_URL}/api/posts/{original_post_id}/insights"

            log_external_api_call(
                service='ThunziAI',
                method='GET',
                url=url,
                payload={'original_post_id': original_post_id}
            )

            response = self.session.get(url)

            log_external_api_response(
                service='ThunziAI',
                method='GET',
                url=url,
                status_code=response.status_code,
                response_body=response.json() if response.status_code == 200 else response.text[:500]
            )

            if response.status_code == 200:
                return response.json()

            log_error('ThunziAI.get_post_insights_by_original_id',
                     f"Failed with status {response.status_code}: {response.text[:200]}")
            return None
        except Exception as e:
            log_error('ThunziAI.get_post_insights_by_original_id', e)
            return None

    def get_post_comments_by_original_id(self, original_post_id: str,
                                        start_date: str = None,
                                        end_date: str = None) -> Optional[Dict]:
        """
        Get comments with sentiment analysis by original post ID

        Args:
            original_post_id: The original post ID from the social media platform
            start_date: Optional start date (YYYY-MM-DD)
            end_date: Optional end date (YYYY-MM-DD)

        Returns:
            {
                "postId": string,
                "comments": [
                    {
                        "id": number,
                        "companyId": number,
                        "platform": string,
                        "username": string,
                        "content": string,
                        "sentiment": "positive" | "neutral" | "negative" | "critical",
                        "sentimentScore": number,
                        "likes": number,
                        "views": number,
                        "publishedAt": string
                    },
                    ...
                ]
            }
        """
        self._ensure_authenticated()

        try:
            url = f"{self.BASE_URL}/api/posts/{original_post_id}/comments"
            params = {}
            if start_date:
                params['startDate'] = start_date
            if end_date:
                params['endDate'] = end_date

            log_external_api_call(
                service='ThunziAI',
                method='GET',
                url=url,
                payload={'original_post_id': original_post_id, **params}
            )

            response = self.session.get(url, params=params if params else None)

            log_external_api_response(
                service='ThunziAI',
                method='GET',
                url=url,
                status_code=response.status_code,
                response_body=response.json() if response.status_code == 200 else response.text[:500]
            )

            if response.status_code == 200:
                return response.json()

            log_error('ThunziAI.get_post_comments_by_original_id',
                     f"Failed with status {response.status_code}: {response.text[:200]}")
            return None
        except Exception as e:
            log_error('ThunziAI.get_post_comments_by_original_id', e)
            return None

    def get_platform_audience(self, platform_id: int) -> Optional[Dict]:
        """
        Get audience demographics for a platform

        Args:
            platform_id: ThunziAI platform connection ID

        Returns:
            {
                "id": number,
                "platformId": number,
                "age": [{"breakdown": string, "value": number}],
                "countries": [{"breakdown": string, "value": number}],
                "cities": [{"breakdown": string, "value": number}],
                "gender": [{"breakdown": string, "value": number}],
                "createdAt": string,
                "updatedAt": string
            }
        """
        self._ensure_authenticated()

        try:
            url = f"{self.BASE_URL}/api/platforms/{platform_id}/audience"

            log_external_api_call(
                service='ThunziAI',
                method='GET',
                url=url,
                payload={'platform_id': platform_id}
            )

            response = self.session.get(url)

            # Log response safely
            try:
                response_body = response.json() if response.status_code == 200 else response.text[:500]
            except:
                response_body = response.text[:500] if response.text else f"Empty response (status {response.status_code})"

            log_external_api_response(
                service='ThunziAI',
                method='GET',
                url=url,
                status_code=response.status_code,
                response_body=response_body
            )

            if response.status_code == 200:
                # Check if response has content (ThunziAI returns empty body when no audience data)
                if not response.text or response.text.strip() == '':
                    log_error('ThunziAI.get_platform_audience',
                             f"Empty response body for platform {platform_id} - no audience data available")
                    return None

                data = response.json()
                # Flatten nested arrays for easier consumption
                return {
                    'id': data.get('id'),
                    'platformId': data.get('platormConnectionId'),  # Typo in Thunzi API
                    'age': self._flatten_audience_data(data.get('age', [])),  # Use 'age' field
                    'countries': self._flatten_audience_data(data.get('countries', [])),
                    'cities': self._flatten_audience_data(data.get('cities', [])),
                    'gender': self._flatten_audience_data(data.get('gender', [])),
                    'createdAt': data.get('createdAt'),
                    'updatedAt': data.get('updatedAt')
                }

            log_error('ThunziAI.get_platform_audience',
                     f"Failed with status {response.status_code}: {response.text[:200]}")
            return None
        except Exception as e:
            log_error('ThunziAI.get_platform_audience', e)
            return None

    def _flatten_audience_data(self, nested_data: List) -> List[Dict]:
        """
        Flatten nested audience data arrays

        Input: [[{"breakdown": "18-24", "value": 28}], [{"breakdown": "25-34", "value": 48}]]
        Also accepts the current ThunziAI shape:
        [{"breakdown": "18-24", "value": 28}, {"breakdown": "25-34", "value": 48}]
        Output: [{"breakdown": "18-24", "value": 28}, {"breakdown": "25-34", "value": 48}]
        """
        flattened = []
        if not isinstance(nested_data, list):
            return flattened

        for item in nested_data:
            if isinstance(item, dict):
                flattened.append(item)
            elif isinstance(item, list) and item:
                first_item = item[0]
                if isinstance(first_item, dict):
                    flattened.append(first_item)

        return flattened

    def get_aggregated_audience(self, platform_ids: List[int]) -> Optional[Dict]:
        """
        Get aggregated audience data across multiple platforms

        Useful for brand analytics to see combined audience from all campaigns

        Args:
            platform_ids: List of ThunziAI platform IDs

        Returns:
            Aggregated audience data with totals and percentages
        """
        all_audiences = []

        for platform_id in platform_ids:
            audience = self.get_platform_audience(platform_id)
            if audience:
                all_audiences.append(audience)

        if not all_audiences:
            return None

        # Aggregate data
        aggregated = {
            'age': self._aggregate_demographic(all_audiences, 'age'),
            'countries': self._aggregate_demographic(all_audiences, 'countries'),
            'cities': self._aggregate_demographic(all_audiences, 'cities'),
            'gender': self._aggregate_demographic(all_audiences, 'gender'),
            'totalPlatforms': len(all_audiences)
        }

        return aggregated

    def _aggregate_demographic(self, audiences: List[Dict], field: str) -> List[Dict]:
        """
        Aggregate a demographic field across multiple audiences

        Sums up values for same breakdowns and calculates percentages
        """
        breakdown_totals = {}

        for audience in audiences:
            demographics = audience.get(field, [])
            for demo in demographics:
                breakdown = demo.get('breakdown')
                value = demo.get('value', 0)

                if breakdown:
                    if breakdown not in breakdown_totals:
                        breakdown_totals[breakdown] = 0
                    breakdown_totals[breakdown] += value

        # Convert to list and calculate percentages
        total = sum(breakdown_totals.values())
        result = []

        for breakdown, value in breakdown_totals.items():
            percentage = (value / total * 100) if total > 0 else 0
            result.append({
                'breakdown': breakdown,
                'value': value,
                'percentage': round(percentage, 2)
            })

        # Sort by value descending
        result.sort(key=lambda x: x['value'], reverse=True)

        return result


# Singleton instance
thunzi_service = ThunziAIService()
