"""Verify JWT from local HS256 or Amazon Cognito (RS256 + JWKS)."""
import os
import jwt
from jwt import PyJWKClient

_pool = os.environ.get("COGNITO_USER_POOL_ID", "").strip()
_client = os.environ.get("COGNITO_APP_CLIENT_ID", "").strip()
_region = os.environ.get("AWS_REGION", os.environ.get("COGNITO_REGION", "us-east-1")).strip()

_jwks_client = None


def _jwks():
    global _jwks_client
    if not _pool:
        return None
    if _jwks_client is None:
        url = f"https://cognito-idp.{_region}.amazonaws.com/{_pool}/.well-known/jwks.json"
        _jwks_client = PyJWKClient(url)
    return _jwks_client


def verify_bearer_token(token, secret_key):
    """Return claims dict with sub, email, name, role — or None."""
    if not token:
        return None
    if _pool and _client:
        try:
            jwks = _jwks()
            signing_key = jwks.get_signing_key_from_jwt(token)
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256"],
                audience=_client,
                issuer=f"https://cognito-idp.{_region}.amazonaws.com/{_pool}",
            )
            role = payload.get("custom:role") or payload.get("role") or "candidate"
            if role not in ("candidate", "interviewer"):
                role = "candidate"
            return {
                "sub": payload["sub"],
                "email": payload.get("email", ""),
                "name": payload.get("name", payload.get("given_name", "")),
                "role": role,
            }
        except Exception:
            return None
    try:
        return jwt.decode(token, secret_key, algorithms=["HS256"])
    except Exception:
        return None
