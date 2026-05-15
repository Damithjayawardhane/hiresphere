"""Retry + simple circuit breaker for outbound calls (fault tolerance)."""
import os
import time
import requests
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

AUTH_SERVICE = os.environ.get('AUTH_SERVICE_URL', 'http://localhost:5001')
_CB_FAIL_THRESHOLD = int(os.environ.get('CIRCUIT_FAIL_THRESHOLD', '5'))
_CB_COOLDOWN_SEC = float(os.environ.get('CIRCUIT_COOLDOWN_SEC', '30'))

_failures = 0
_open_until = 0.0


def circuit_allows() -> bool:
    global _open_until
    return time.time() >= _open_until


def record_failure():
    global _failures, _open_until
    _failures += 1
    if _failures >= _CB_FAIL_THRESHOLD:
        _open_until = time.time() + _CB_COOLDOWN_SEC
        _failures = 0


def record_success():
    global _failures
    _failures = 0


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=0.3, min=0.3, max=3),
    retry=retry_if_exception_type((requests.RequestException,)),
    reraise=True,
)
def _ping_auth():
    r = requests.get(f'{AUTH_SERVICE}/health', timeout=3)
    r.raise_for_status()
    return True


def check_auth_service_reachable():
    """
    Returns (ok: bool, degraded: bool).
    When circuit is open, returns (False, True) without calling upstream.
    """
    if not circuit_allows():
        return False, True
    try:
        _ping_auth()
        record_success()
        return True, False
    except Exception:
        record_failure()
        return False, True
