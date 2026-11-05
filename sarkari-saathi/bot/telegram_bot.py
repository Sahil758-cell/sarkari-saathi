"""
telegram_bot.py — Sarkari Saathi Telegram bot (Phase 2).

Guided button-based conversation: collects a citizen's profile (age,
gender, state, category, income, occupation, BPL/disability status,
residency), then matches it against the extracted scheme JSON in
data/extracted/ (see pipeline/matcher.py) — no AI call at match time, so
results are instant and free. Supports English and Hindi prompts; scheme
data itself stays in English.
"""
import asyncio
import logging
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.ext import (
    ApplicationBuilder,
    CallbackQueryHandler,
    CommandHandler,
    ContextTypes,
    ConversationHandler,
    MessageHandler,
    filters,
)

sys.path.insert(0, str(Path(__file__).resolve().parent))
import i18n  # noqa: E402
import matcher  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

LANG, MENU, AGE, GENDER, STATE, CATEGORY, INCOME, OCCUPATION, BPL, DISABILITY, RESIDENCY = range(11)

PAGE_SIZE = 10


def _options_keyboard(options, prefix: str, lang: str, columns: int = 2) -> InlineKeyboardMarkup:
    """options: list of (value, en_label, hi_label) tuples."""
    label_index = 1 if lang == "en" else 2
    buttons = [
        InlineKeyboardButton(opt[label_index], callback_data=f"{prefix}:{opt[0]}")
        for opt in options
    ]
    rows = [buttons[i:i + columns] for i in range(0, len(buttons), columns)]
    return InlineKeyboardMarkup(rows)


def _states_keyboard(lang: str) -> InlineKeyboardMarkup:
    label_index = 0 if lang == "en" else 1
    buttons = [
        InlineKeyboardButton(state[label_index], callback_data=f"state:{state[0]}")
        for state in i18n.STATES
    ]
    rows = [buttons[i:i + 2] for i in range(0, len(buttons), 2)]
    return InlineKeyboardMarkup(rows)


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    context.user_data.clear()
    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("English", callback_data="lang:en"),
         InlineKeyboardButton("हिन्दी", callback_data="lang:hi")],
    ])
    await update.message.reply_text(
        "\U0001F64F Welcome to Sarkari Saathi! Choose your language / अपनी भाषा चुनें:",
        reply_markup=keyboard,
    )
    return LANG


async def lang_chosen(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    query = update.callback_query
    await query.answer()
    lang = query.data.split(":", 1)[1]
    context.user_data["lang"] = lang
    await query.edit_message_text(i18n.t(lang, "welcome"))
    keyboard = InlineKeyboardMarkup([[
        InlineKeyboardButton(i18n.t(lang, "menu_eligibility"), callback_data="menu:eligibility"),
        InlineKeyboardButton(i18n.t(lang, "menu_search"), callback_data="menu:search"),
    ]])
    await context.bot.send_message(
        chat_id=query.message.chat_id, text=i18n.t(lang, "menu_prompt"), reply_markup=keyboard,
    )
    return MENU


async def menu_chosen(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    query = update.callback_query
    await query.answer()
    lang = context.user_data.get("lang", "en")
    choice = query.data.split(":", 1)[1]
    if choice == "search":
        await query.edit_message_text(i18n.t(lang, "search_ask_query"))
        return S_QUERY
    await query.edit_message_text(i18n.t(lang, "ask_age"))
    return AGE


async def age_received(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    lang = context.user_data.get("lang", "en")
    text = (update.message.text or "").strip()
    if not text.isdigit() or not (1 <= int(text) <= 120):
        await update.message.reply_text(i18n.t(lang, "invalid_age"))
        return AGE
    context.user_data["age"] = int(text)
    await update.message.reply_text(
        i18n.t(lang, "ask_gender"),
        reply_markup=_options_keyboard(i18n.GENDER_OPTIONS, "gender", lang),
    )
    return GENDER


async def gender_chosen(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    query = update.callback_query
    await query.answer()
    lang = context.user_data.get("lang", "en")
    context.user_data["gender"] = query.data.split(":", 1)[1]
    await query.edit_message_text(i18n.t(lang, "ask_state"), reply_markup=_states_keyboard(lang))
    return STATE


async def state_chosen(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    query = update.callback_query
    await query.answer()
    lang = context.user_data.get("lang", "en")
    context.user_data["state"] = query.data.split(":", 1)[1]
    await query.edit_message_text(
        i18n.t(lang, "ask_category"),
        reply_markup=_options_keyboard(i18n.CATEGORY_OPTIONS, "cat", lang),
    )
    return CATEGORY


async def category_chosen(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    query = update.callback_query
    await query.answer()
    lang = context.user_data.get("lang", "en")
    context.user_data["category"] = query.data.split(":", 1)[1]
    await query.edit_message_text(
        i18n.t(lang, "ask_income"),
        reply_markup=_options_keyboard(i18n.INCOME_OPTIONS, "income", lang),
    )
    return INCOME


async def income_chosen(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    query = update.callback_query
    await query.answer()
    lang = context.user_data.get("lang", "en")
    value = query.data.split(":", 1)[1]
    context.user_data["income_bracket"] = None if value == "skip" else value
    await query.edit_message_text(
        i18n.t(lang, "ask_occupation"),
        reply_markup=_options_keyboard(i18n.OCCUPATION_OPTIONS, "occ", lang),
    )
    return OCCUPATION


async def occupation_chosen(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    query = update.callback_query
    await query.answer()
    lang = context.user_data.get("lang", "en")
    context.user_data["occupation"] = query.data.split(":", 1)[1]
    await query.edit_message_text(
        i18n.t(lang, "ask_bpl"),
        reply_markup=_options_keyboard(i18n.YES_NO_OPTIONS, "bpl", lang),
    )
    return BPL


async def bpl_chosen(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    query = update.callback_query
    await query.answer()
    lang = context.user_data.get("lang", "en")
    context.user_data["is_bpl"] = query.data.split(":", 1)[1] == "yes"
    await query.edit_message_text(
        i18n.t(lang, "ask_disability"),
        reply_markup=_options_keyboard(i18n.YES_NO_OPTIONS, "disability", lang),
    )
    return DISABILITY


async def disability_chosen(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    query = update.callback_query
    await query.answer()
    lang = context.user_data.get("lang", "en")
    context.user_data["is_disabled"] = query.data.split(":", 1)[1] == "yes"
    await query.edit_message_text(
        i18n.t(lang, "ask_residency"),
        reply_markup=_options_keyboard(i18n.RESIDENCY_OPTIONS, "residency", lang),
    )
    return RESIDENCY


def _truncate(text: str, max_len: int) -> str:
    return text if len(text) <= max_len else text[:max_len - 3].rstrip() + "..."


def _format_scheme_line(idx: int, scheme: dict) -> str:
    # Some source scheme names/summaries run very long — cap both so a
    # single page of PAGE_SIZE entries can't blow past Telegram's 4096-char
    # message limit.
    name = _truncate(scheme["scheme_name"], 120)
    summary = _truncate(scheme.get("benefits_summary") or "", 160)
    state_line = ", ".join(scheme.get("state") or []) or "All-India"
    return f"{idx + 1}. {name}\n{summary}\n\U0001F4CD {state_line}"


def _build_page(context: ContextTypes.DEFAULT_TYPE, lang: str, page: int):
    """Render one page of results as (text, keyboard): a numbered list with
    a 'View details' button per scheme, plus Back/Next nav buttons at the
    bottom (only where applicable). Edited in place on page navigation
    rather than sending a new message each time."""
    slugs = context.user_data.get("last_result_slugs") or []
    total = len(slugs)
    total_pages = max(1, -(-total // PAGE_SIZE))  # ceil division
    page = max(0, min(page, total_pages - 1))
    start = page * PAGE_SIZE
    page_slugs = slugs[start:start + PAGE_SIZE]

    lines = [i18n.t(lang, "results_header", count=total), f"({page + 1}/{total_pages})", ""]
    buttons = []
    for offset, slug in enumerate(page_slugs):
        idx = start + offset
        scheme = matcher.get_scheme_by_slug(slug)
        if scheme is None:
            continue  # file may have moved/been cleaned up between listing and now
        lines.append(_format_scheme_line(idx, scheme))
        lines.append("")
        buttons.append([InlineKeyboardButton(
            f"{idx + 1}. {i18n.t(lang, 'view_details')}", callback_data=f"detail:{idx}:{lang}",
        )])

    nav_row = []
    if page > 0:
        nav_row.append(InlineKeyboardButton(i18n.t(lang, "back_page"), callback_data=f"page:{page - 1}:{lang}"))
    if page < total_pages - 1:
        nav_row.append(InlineKeyboardButton(i18n.t(lang, "next_page"), callback_data=f"page:{page + 1}:{lang}"))
    if nav_row:
        buttons.append(nav_row)

    return "\n".join(lines).strip(), InlineKeyboardMarkup(buttons)


async def residency_chosen(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    query = update.callback_query
    await query.answer()
    lang = context.user_data.get("lang", "en")
    value = query.data.split(":", 1)[1]
    context.user_data["residency"] = None if value == "skip" else value

    await query.edit_message_text(i18n.t(lang, "searching"))

    profile = dict(context.user_data)
    results = matcher.match(profile)

    if not results:
        await context.bot.send_message(chat_id=query.message.chat_id, text=i18n.t(lang, "no_matches"))
        return ConversationHandler.END

    # Telegram caps callback_data at 64 bytes — scheme slugs can run past
    # that (up to ~89 chars), so we store the actual slugs in user_data and
    # reference them by small index instead of embedding the slug itself.
    context.user_data["last_result_slugs"] = [s["_slug"] for s in results]

    text, keyboard = _build_page(context, lang, page=0)
    await context.bot.send_message(chat_id=query.message.chat_id, text=text, reply_markup=keyboard)

    return ConversationHandler.END


async def page_nav(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()
    _, page_str, lang = query.data.split(":", 2)
    text, keyboard = _build_page(context, lang, page=int(page_str))
    await query.edit_message_text(text, reply_markup=keyboard)


def _format_full_detail(scheme: dict, lang: str) -> str:
    documents = scheme.get("documents_required") or []
    conditions = scheme.get("other_conditions") or []
    link = scheme.get("application_link") or matcher.get_portal_url(scheme) or i18n.t(lang, "not_specified")

    lines = [scheme["scheme_name"], "", scheme.get("benefits_summary") or ""]
    lines.append("")
    lines.append(f"{i18n.t(lang, 'documents_required')}:")
    lines.append("\n".join(f"- {d}" for d in documents) if documents else i18n.t(lang, "none_listed"))
    lines.append("")
    lines.append(f"{i18n.t(lang, 'other_conditions')}:")
    lines.append("\n".join(f"- {c}" for c in conditions) if conditions else i18n.t(lang, "none_listed"))
    lines.append("")
    lines.append(f"{i18n.t(lang, 'apply_at')}: {link}")
    return "\n".join(lines)


async def show_detail(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()
    _, idx_str, lang = query.data.split(":", 2)
    slugs = context.user_data.get("last_result_slugs") or []
    try:
        slug = slugs[int(idx_str)]
    except (IndexError, ValueError):
        return  # stale button from an old/expired session — nothing to show
    scheme = matcher.get_scheme_by_slug(slug)
    if scheme is None:
        return

    await context.bot.send_message(chat_id=query.message.chat_id, text=_format_full_detail(scheme, lang))


async def cancel(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    lang = context.user_data.get("lang", "en")
    await update.message.reply_text(i18n.t(lang, "cancelled"))
    context.user_data.clear()
    return ConversationHandler.END


# ---------------------------------------------------------------------------
# /search — check eligibility for one specific scheme by name. Unlike /start
# (which asks a fixed 9-question profile), this asks only the questions that
# *this particular scheme's* own eligibility criteria require, then gives an
# eligible/not-eligible verdict with reasons, followed by full details.
# ---------------------------------------------------------------------------

S_LANG, S_QUERY, S_SELECT, S_ANSWER = range(100, 104)


def _format_reason(reason: tuple, lang: str) -> str:
    key, scheme_val, user_val = reason
    if key == "age_min":
        return (f"Age must be at least {scheme_val} (you entered {user_val})." if lang == "en"
                else f"आयु कम से कम {scheme_val} वर्ष होनी चाहिए (आपने {user_val} दर्ज किया)।")
    if key == "age_max":
        return (f"Age must be at most {scheme_val} (you entered {user_val})." if lang == "en"
                else f"आयु अधिकतम {scheme_val} वर्ष होनी चाहिए (आपने {user_val} दर्ज किया)।")
    if key == "gender":
        label = i18n.label_for(scheme_val, i18n.GENDER_OPTIONS, lang)
        return (f"This scheme is only for {label} applicants." if lang == "en"
                else f"यह योजना केवल {label} आवेदकों के लिए है।")
    if key == "state":
        states = ", ".join(scheme_val)
        return (f"This scheme is only available in: {states}." if lang == "en"
                else f"यह योजना केवल इन राज्यों में उपलब्ध है: {states}।")
    if key == "category":
        cats = ", ".join(scheme_val)
        return (f"This scheme is only for these categories: {cats}." if lang == "en"
                else f"यह योजना केवल इन श्रेणियों के लिए है: {cats}।")
    if key == "income":
        return (f"Annual income must not exceed ₹{scheme_val:,}." if lang == "en"
                else f"वार्षिक आय ₹{scheme_val:,} से अधिक नहीं होनी चाहिए।")
    if key == "bpl":
        return ("This scheme requires a BPL (Below Poverty Line) card." if lang == "en"
                else "इस योजना के लिए बीपीएल कार्ड आवश्यक है।")
    if key == "disability":
        return ("This scheme is specifically for persons with disabilities." if lang == "en"
                else "यह योजना विशेष रूप से दिव्यांग व्यक्तियों के लिए है।")
    if key == "residency":
        label = i18n.label_for(scheme_val, i18n.RESIDENCY_OPTIONS, lang)
        return (f"This scheme requires {label} residency." if lang == "en"
                else f"इस योजना के लिए {label} निवास आवश्यक है।")
    return ""


async def search_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    context.user_data.clear()
    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("English", callback_data="slang:en"),
         InlineKeyboardButton("हिन्दी", callback_data="slang:hi")],
    ])
    await update.message.reply_text(
        "\U0001F50E Choose your language / अपनी भाषा चुनें:", reply_markup=keyboard,
    )
    return S_LANG


async def search_lang_chosen(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    query = update.callback_query
    await query.answer()
    lang = query.data.split(":", 1)[1]
    context.user_data["lang"] = lang
    await query.edit_message_text(i18n.t(lang, "search_ask_query"))
    return S_QUERY


async def _resolve_scheme(context: ContextTypes.DEFAULT_TYPE, chat_id: int, lang: str, raw_record: dict) -> "dict | None":
    """Given a raw normalized record (may or may not be extracted yet),
    return its extracted structured form — extracting it on-demand right
    now if the bulk background job hasn't reached it yet. Runs the
    (blocking) LLM call in a worker thread so the bot's event loop
    stays responsive to other users while it waits."""
    slug = matcher.slugify(raw_record["scheme_name"])
    existing = matcher.get_scheme_by_slug(slug)
    if existing is not None:
        return existing

    await context.bot.send_message(chat_id=chat_id, text=i18n.t(lang, "extracting_wait"))
    try:
        return await asyncio.to_thread(matcher.ensure_extracted, raw_record)
    except Exception:
        logger.exception("On-demand extraction failed for %s", raw_record.get("scheme_name"))
        return None


async def search_query_received(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    lang = context.user_data.get("lang", "en")
    query_text = (update.message.text or "").strip()
    chat_id = update.effective_chat.id

    results = matcher.search_by_name(query_text)
    if len(results) == 1:
        return await _start_eligibility_flow(context, chat_id, lang, results[0])
    if len(results) > 1:
        context.user_data["search_result_slugs"] = [s["_slug"] for s in results]
        buttons = [
            [InlineKeyboardButton(f"{idx + 1}. {s['scheme_name'][:60]}", callback_data=f"selscheme:{idx}")]
            for idx, s in enumerate(results)
        ]
        await update.message.reply_text(
            i18n.t(lang, "search_multiple_results", count=len(results)),
            reply_markup=InlineKeyboardMarkup(buttons),
        )
        return S_SELECT

    # Nothing extracted yet matches — fall back to the full raw dataset
    # (exact substring, then fuzzy match for misspellings/transliteration).
    raw_results = matcher.search_raw_by_name(query_text)
    if not raw_results:
        await update.message.reply_text(i18n.t(lang, "search_no_results", query=query_text))
        return S_QUERY  # let them just type again — don't dead-end the conversation

    if len(raw_results) == 1:
        scheme = await _resolve_scheme(context, chat_id, lang, raw_results[0])
        if scheme is None:
            await update.message.reply_text(i18n.t(lang, "extraction_failed"))
            return S_QUERY
        return await _start_eligibility_flow(context, chat_id, lang, scheme)

    context.user_data["search_raw_candidates"] = raw_results
    buttons = [
        [InlineKeyboardButton(f"{idx + 1}. {s['scheme_name'][:60]}", callback_data=f"selraw:{idx}")]
        for idx, s in enumerate(raw_results)
    ]
    await update.message.reply_text(
        i18n.t(lang, "search_multiple_results", count=len(raw_results)),
        reply_markup=InlineKeyboardMarkup(buttons),
    )
    return S_SELECT


async def search_select_chosen(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    query = update.callback_query
    await query.answer()
    lang = context.user_data.get("lang", "en")
    slugs = context.user_data.get("search_result_slugs") or []
    try:
        slug = slugs[int(query.data.split(":", 1)[1])]
    except (IndexError, ValueError):
        return S_QUERY
    scheme = matcher.get_scheme_by_slug(slug)
    if scheme is None:
        return S_QUERY
    return await _start_eligibility_flow(context, query.message.chat_id, lang, scheme)


async def search_select_raw_chosen(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    query = update.callback_query
    await query.answer()
    lang = context.user_data.get("lang", "en")
    chat_id = query.message.chat_id
    candidates = context.user_data.get("search_raw_candidates") or []
    try:
        raw_record = candidates[int(query.data.split(":", 1)[1])]
    except (IndexError, ValueError):
        return S_QUERY

    scheme = await _resolve_scheme(context, chat_id, lang, raw_record)
    if scheme is None:
        await context.bot.send_message(chat_id=chat_id, text=i18n.t(lang, "extraction_failed"))
        return S_QUERY
    return await _start_eligibility_flow(context, chat_id, lang, scheme)


async def _ask_question(context: ContextTypes.DEFAULT_TYPE, chat_id: int, lang: str, q: dict) -> None:
    key = q["key"]
    if q["type"] == "text":  # only "age" uses text input
        await context.bot.send_message(chat_id=chat_id, text=i18n.t(lang, "ask_age"))
        return

    if key == "gender":
        prompt, options = i18n.t(lang, "ask_gender"), i18n.GENDER_OPTIONS
    elif key == "category":
        prompt, options = i18n.t(lang, "ask_category"), i18n.CATEGORY_OPTIONS
    elif key == "income_bracket":
        prompt, options = i18n.t(lang, "ask_income"), i18n.INCOME_OPTIONS
    elif key == "is_bpl":
        prompt, options = i18n.t(lang, "ask_bpl"), i18n.YES_NO_OPTIONS
    elif key == "is_disabled":
        prompt, options = i18n.t(lang, "ask_disability"), i18n.YES_NO_OPTIONS
    elif key == "state_confirm":
        prompt = i18n.t(lang, "state_confirm_q", states=", ".join(q["states"]))
        options = i18n.YES_NO_OPTIONS
    elif key == "residency_confirm":
        label = i18n.label_for(q["residency"], i18n.RESIDENCY_OPTIONS, lang)
        prompt = i18n.t(lang, "residency_confirm_q", residency=label)
        options = i18n.YES_NO_OPTIONS
    else:
        return

    await context.bot.send_message(
        chat_id=chat_id, text=prompt, reply_markup=_options_keyboard(options, "sqans", lang),
    )


async def _continue_search_flow(context: ContextTypes.DEFAULT_TYPE, chat_id: int, lang: str) -> bool:
    """Ask the next queued question, or — if the queue is exhausted — run
    the eligibility check and send the verdict + full details. Returns True
    if a question was asked (conversation should stay in S_ANSWER)."""
    queue = context.user_data.get("question_queue", [])
    idx = context.user_data.get("q_index", 0)

    if idx < len(queue):
        await _ask_question(context, chat_id, lang, queue[idx])
        return True

    scheme = context.user_data["search_scheme"]
    profile = context.user_data.get("search_profile", {})
    result = matcher.check_eligibility(scheme, profile)

    if result["eligible"]:
        await context.bot.send_message(chat_id=chat_id, text=i18n.t(lang, "eligible_yes"))
    else:
        lines = [i18n.t(lang, "eligible_no")]
        lines += [f"- {_format_reason(r, lang)}" for r in result["reasons"]]
        await context.bot.send_message(chat_id=chat_id, text="\n".join(lines))

    await context.bot.send_message(chat_id=chat_id, text=i18n.t(lang, "full_details_follow"))
    await context.bot.send_message(chat_id=chat_id, text=_format_full_detail(scheme, lang))
    return False


async def _start_eligibility_flow(context: ContextTypes.DEFAULT_TYPE, chat_id: int, lang: str, scheme: dict) -> int:
    context.user_data["search_scheme"] = scheme
    context.user_data["search_profile"] = {}
    context.user_data["question_queue"] = matcher.build_question_queue(scheme)
    context.user_data["q_index"] = 0

    await context.bot.send_message(chat_id=chat_id, text=i18n.t(lang, "eligibility_header", name=scheme["scheme_name"]))
    more = await _continue_search_flow(context, chat_id, lang)
    return S_ANSWER if more else ConversationHandler.END


def _record_search_answer(context: ContextTypes.DEFAULT_TYPE, value: str) -> None:
    queue = context.user_data.get("question_queue", [])
    idx = context.user_data.get("q_index", 0)
    if idx >= len(queue):
        return
    key = queue[idx]["key"]
    profile = context.user_data.setdefault("search_profile", {})

    if key == "age":
        profile["age"] = int(value)
    elif key == "gender":
        profile["gender"] = value
    elif key == "category":
        profile["category"] = value
    elif key == "income_bracket":
        profile["income_bracket"] = None if value == "skip" else value
    elif key == "is_bpl":
        profile["is_bpl"] = value == "yes"
    elif key == "is_disabled":
        profile["is_disabled"] = value == "yes"
    elif key == "state_confirm":
        profile["state"] = queue[idx]["states"][0] if value == "yes" else "_NOT_LISTED_"
    elif key == "residency_confirm":
        profile["residency"] = queue[idx]["residency"] if value == "yes" else "_MISMATCH_"

    context.user_data["q_index"] = idx + 1


async def search_answer_button(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    query = update.callback_query
    await query.answer()
    lang = context.user_data.get("lang", "en")
    value = query.data.split(":", 1)[1]
    _record_search_answer(context, value)
    more = await _continue_search_flow(context, query.message.chat_id, lang)
    return S_ANSWER if more else ConversationHandler.END


async def search_answer_text(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    lang = context.user_data.get("lang", "en")
    text = (update.message.text or "").strip()
    if not text.isdigit() or not (1 <= int(text) <= 120):
        await update.message.reply_text(i18n.t(lang, "invalid_age"))
        return S_ANSWER
    _record_search_answer(context, text)
    more = await _continue_search_flow(context, update.effective_chat.id, lang)
    return S_ANSWER if more else ConversationHandler.END


def main() -> int:
    load_dotenv()
    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    if not token:
        print("TELEGRAM_BOT_TOKEN not set. Copy .env.example to .env and add your bot token.")
        return 1

    # Generous timeouts: first-connection handshakes to api.telegram.org have
    # been observed taking 15-20s in this environment, past PTB's defaults.
    application = (
        ApplicationBuilder()
        .token(token)
        .connect_timeout(30)
        .read_timeout(30)
        .get_updates_connect_timeout(30)
        .get_updates_read_timeout(40)
        .build()
    )

    conv_handler = ConversationHandler(
        entry_points=[
            CommandHandler("start", start),
            # A plain "hi"/"hello"/"namaste" also starts the bot, not just
            # the /start command — only fires when no conversation is
            # already active for this chat (PTB only checks entry_points
            # then), so it won't interrupt an in-progress questionnaire.
            MessageHandler(filters.Regex(r"(?i)^(hi|hello|hey|namaste|नमस्ते|हाय|हैलो)$"), start),
        ],
        states={
            LANG: [CallbackQueryHandler(lang_chosen, pattern=r"^lang:")],
            MENU: [CallbackQueryHandler(menu_chosen, pattern=r"^menu:")],
            AGE: [MessageHandler(filters.TEXT & ~filters.COMMAND, age_received)],
            GENDER: [CallbackQueryHandler(gender_chosen, pattern=r"^gender:")],
            STATE: [CallbackQueryHandler(state_chosen, pattern=r"^state:")],
            CATEGORY: [CallbackQueryHandler(category_chosen, pattern=r"^cat:")],
            INCOME: [CallbackQueryHandler(income_chosen, pattern=r"^income:")],
            OCCUPATION: [CallbackQueryHandler(occupation_chosen, pattern=r"^occ:")],
            BPL: [CallbackQueryHandler(bpl_chosen, pattern=r"^bpl:")],
            DISABILITY: [CallbackQueryHandler(disability_chosen, pattern=r"^disability:")],
            RESIDENCY: [CallbackQueryHandler(residency_chosen, pattern=r"^residency:")],
            # Reached via the "search a specific scheme" menu button — same
            # states/handlers the standalone /search command uses.
            S_QUERY: [MessageHandler(filters.TEXT & ~filters.COMMAND, search_query_received)],
            S_SELECT: [
                CallbackQueryHandler(search_select_chosen, pattern=r"^selscheme:"),
                CallbackQueryHandler(search_select_raw_chosen, pattern=r"^selraw:"),
            ],
            S_ANSWER: [
                CallbackQueryHandler(search_answer_button, pattern=r"^sqans:"),
                MessageHandler(filters.TEXT & ~filters.COMMAND, search_answer_text),
            ],
        },
        # /start and /search always break in and restart, even if the user
        # is stuck mid-flow (e.g. left a language/menu prompt un-clicked).
        # Without these here, a stray text message sent while "stuck" in a
        # state that only accepts button callbacks is silently dropped —
        # no error, just no response, which reads as "the bot is broken."
        fallbacks=[
            CommandHandler("cancel", cancel),
            CommandHandler("start", start),
            CommandHandler("search", search_command),
        ],
    )

    search_conv_handler = ConversationHandler(
        entry_points=[CommandHandler("search", search_command)],
        states={
            S_LANG: [CallbackQueryHandler(search_lang_chosen, pattern=r"^slang:")],
            S_QUERY: [MessageHandler(filters.TEXT & ~filters.COMMAND, search_query_received)],
            S_SELECT: [
                CallbackQueryHandler(search_select_chosen, pattern=r"^selscheme:"),
                CallbackQueryHandler(search_select_raw_chosen, pattern=r"^selraw:"),
            ],
            S_ANSWER: [
                CallbackQueryHandler(search_answer_button, pattern=r"^sqans:"),
                MessageHandler(filters.TEXT & ~filters.COMMAND, search_answer_text),
            ],
        },
        # /start and /search always break in and restart, even if the user
        # is stuck mid-flow (e.g. left a language/menu prompt un-clicked).
        # Without these here, a stray text message sent while "stuck" in a
        # state that only accepts button callbacks is silently dropped —
        # no error, just no response, which reads as "the bot is broken."
        fallbacks=[
            CommandHandler("cancel", cancel),
            CommandHandler("start", start),
            CommandHandler("search", search_command),
        ],
    )

    application.add_handler(conv_handler)
    application.add_handler(search_conv_handler)
    application.add_handler(CallbackQueryHandler(show_detail, pattern=r"^detail:"))
    application.add_handler(CallbackQueryHandler(page_nav, pattern=r"^page:"))

    logger.info("Sarkari Saathi bot starting...")
    application.run_polling()
    return 0


if __name__ == "__main__":
    sys.exit(main())
