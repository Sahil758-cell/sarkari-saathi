"""
schemas.py — Pydantic request/response models for the mobile API.

ProfileIn mirrors the exact profile dict shape bot/matcher.py's match() /
check_eligibility() expect (see _score_scheme in matcher.py) — the option
codes (category, income_bracket, residency, gender) must match
bot/i18n.py's option vocabularies exactly, including case, since matcher's
"general" wildcard check is case-sensitive.
"""
from typing import Any, Optional

from pydantic import BaseModel, Field


class ProfileIn(BaseModel):
    """All fields but the booleans are optional so this model also covers
    the scheme-specific eligibility flow, where only the questions
    matcher.build_question_queue() actually asked are filled in. `state`/
    `residency` also accept matcher's internal "not listed"/"mismatch"
    sentinel values (see bot/telegram_bot.py's _record_search_answer) sent
    when the user answers "no" to a state_confirm/residency_confirm
    question."""

    age: Optional[int] = Field(default=None, ge=1, le=120)
    gender: Optional[str] = Field(default=None, pattern="^(male|female)$")
    state: Optional[str] = None
    category: Optional[str] = Field(default=None, pattern="^(general|sc|st|obc|ews)$")
    income_bracket: Optional[str] = Field(
        default=None, pattern="^(below_1l|1_2l|2_5l|5_8l|above_8l)$"
    )
    is_bpl: bool = False
    is_disabled: bool = False
    residency: Optional[str] = Field(default=None, pattern="^(rural|urban|_MISMATCH_)$")
    occupation: Optional[str] = None


class SchemeOut(BaseModel):
    slug: str
    scheme_name: str
    occupation: Optional[list[str]] = None
    gender: Optional[str] = None
    age_min: Optional[int] = None
    age_max: Optional[int] = None
    max_annual_income: Optional[int] = None
    category: Optional[list[str]] = None
    state: Optional[list[str]] = None
    is_bpl_required: Optional[bool] = None
    is_disabled_targeted: Optional[bool] = None
    residency: Optional[str] = None
    other_conditions: list[str] = []
    benefits_summary: Optional[str] = None
    documents_required: list[str] = []
    application_link: Optional[str] = None
    portal_url: Optional[str] = None


class MatchResponse(BaseModel):
    count: int
    results: list[SchemeOut]


class EligibilityReason(BaseModel):
    field: str
    expected: Optional[Any] = None
    actual: Optional[Any] = None


class EligibilityOut(BaseModel):
    eligible: bool
    reasons: list[EligibilityReason]


class QuestionOut(BaseModel):
    key: str
    type: str
    states: Optional[list[str]] = None
    residency: Optional[str] = None


class AskRequest(BaseModel):
    query: str = Field(min_length=1)


class WebSource(BaseModel):
    title: str
    url: str


class AskResponse(BaseModel):
    answer: str
    sources: list[SchemeOut]
    web_sources: list[WebSource] = []


class SendOtpRequest(BaseModel):
    phone: Optional[str] = Field(default=None, pattern="^[0-9]{10}$")
    email: Optional[str] = Field(default=None, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class SendOtpResponse(BaseModel):
    session_id: str


class VerifyOtpRequest(BaseModel):
    session_id: str
    otp: str


class VerifyOtpResponse(BaseModel):
    verified: bool


class OtpModeResponse(BaseModel):
    mode: str
