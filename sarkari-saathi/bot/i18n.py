"""i18n.py — Bilingual (English/Hindi) prompt strings and option labels for
the Telegram bot. Scheme data itself stays in English regardless of the
chosen language — only the bot's own prompts/buttons are translated."""

STRINGS = {
    "en": {
        "welcome": (
            "\U0001F64F Welcome to Sarkari Saathi! You can type /cancel at any time to stop."
        ),
        "menu_prompt": "What would you like to do?",
        "menu_eligibility": "✅ Find schemes for me",
        "menu_search": "\U0001F50E Search a specific scheme",
        "ask_age": "How old are you? (enter a number, e.g. 25)",
        "invalid_age": "Please enter a valid age between 1 and 120.",
        "ask_gender": "What is your gender?",
        "ask_state": "Which state/UT do you live in?",
        "ask_category": "Which category do you belong to?",
        "ask_income": "What is your family's approximate annual income?",
        "ask_occupation": "What best describes your occupation?",
        "ask_bpl": "Does your family hold a BPL (Below Poverty Line) card?",
        "ask_disability": "Do you have a disability?",
        "ask_residency": "Do you live in a rural or urban area?",
        "searching": "\U0001F50D Searching for matching schemes...",
        "no_matches": (
            "\U0001F615 I couldn't find any schemes matching your profile right now. "
            "The scheme database is still growing — try /start again later, or with "
            "slightly different details."
        ),
        "results_header": "✅ Found {count} scheme(s) that may fit you — showing the best matches first:",
        "back_page": "⬅️ Back",
        "next_page": "Next ➡️",
        "cancelled": "Cancelled. Type /start to begin again.",
        "view_details": "View details",
        "back_to_list": "⬅️ Back to list",
        "documents_required": "Documents required",
        "other_conditions": "Other conditions",
        "apply_at": "Apply at",
        "not_specified": "Not specified",
        "none_listed": "None listed",
        "search_welcome": "\U0001F50E Let's check a specific scheme. Choose your language / अपनी भाषा चुनें:",
        "search_ask_query": "What scheme would you like to check? Type its name (or part of it).",
        "search_no_results": (
            "\U0001F615 I couldn't find any scheme matching \"{query}\" — not even in the "
            "full unprocessed database. Try a different spelling, or type another scheme name."
        ),
        "search_multiple_results": "I found {count} matching schemes. Which one did you mean?",
        "select": "Select",
        "state_confirm_q": "This scheme is only for residents of: {states}. Does that match you?",
        "residency_confirm_q": "This scheme requires {residency} residency. Does that match you?",
        "eligibility_header": "Checking your eligibility for:\n{name}",
        "eligible_yes": "✅ Based on what you told me, you appear ELIGIBLE for this scheme!",
        "eligible_no": "❌ Based on what you told me, you do NOT appear eligible for this scheme:",
        "full_details_follow": "Here are the full details:",
        "extracting_wait": (
            "\U0001F550 This scheme hasn't been fully analyzed yet — let me do that now "
            "(can take up to a minute)..."
        ),
        "extraction_failed": (
            "\U0001F615 Sorry, I couldn't analyze that scheme right now (the AI service is "
            "busy). Please try again in a minute, or type another scheme name."
        ),
    },
    "hi": {
        "welcome": (
            "\U0001F64F सरकारी साथी में आपका स्वागत है! किसी भी समय रोकने के लिए /cancel टाइप करें।"
        ),
        "menu_prompt": "आप क्या करना चाहेंगे?",
        "menu_eligibility": "✅ मेरे लिए योजनाएं खोजें",
        "menu_search": "\U0001F50E किसी खास योजना को खोजें",
        "ask_age": "आपकी उम्र क्या है? (संख्या में लिखें, जैसे 25)",
        "invalid_age": "कृपया 1 से 120 के बीच सही उम्र दर्ज करें।",
        "ask_gender": "आपका लिंग क्या है?",
        "ask_state": "आप किस राज्य/केंद्र शासित प्रदेश में रहते हैं?",
        "ask_category": "आप किस श्रेणी से संबंधित हैं?",
        "ask_income": "आपके परिवार की वार्षिक आय लगभग कितनी है?",
        "ask_occupation": "आपका व्यवसाय क्या है?",
        "ask_bpl": "क्या आपके परिवार के पास बीपीएल (गरीबी रेखा से नीचे) कार्ड है?",
        "ask_disability": "क्या आपको कोई दिव्यांगता है?",
        "ask_residency": "आप ग्रामीण या शहरी क्षेत्र में रहते हैं?",
        "searching": "\U0001F50D योजनाएं खोजी जा रही हैं...",
        "no_matches": (
            "\U0001F615 फिलहाल आपकी प्रोफ़ाइल से मेल खाती कोई योजना नहीं मिली। "
            "डेटाबेस में लगातार नई योजनाएं जोड़ी जा रही हैं — कृपया बाद में /start फिर से आज़माएं, "
            "या थोड़ी अलग जानकारी के साथ कोशिश करें।"
        ),
        "results_header": "✅ आपके लिए {count} योजना(एं) मिलीं — सबसे उपयुक्त पहले दिखाई जा रही हैं:",
        "back_page": "⬅️ पीछे",
        "next_page": "आगे ➡️",
        "cancelled": "रद्द किया गया। फिर से शुरू करने के लिए /start टाइप करें।",
        "view_details": "विवरण देखें",
        "back_to_list": "⬅️ सूची पर वापस जाएं",
        "documents_required": "आवश्यक दस्तावेज़",
        "other_conditions": "अन्य शर्तें",
        "apply_at": "यहां आवेदन करें",
        "not_specified": "उल्लेख नहीं",
        "none_listed": "कोई सूचीबद्ध नहीं",
        "search_welcome": "\U0001F50E किसी खास योजना की पात्रता जांचें। अपनी भाषा चुनें:",
        "search_ask_query": "आप किस योजना की जांच करना चाहते हैं? उसका नाम (या नाम का हिस्सा) लिखें।",
        "search_no_results": (
            "\U0001F615 \"{query}\" से मेल खाती कोई योजना नहीं मिली — पूरे डेटाबेस में भी नहीं। "
            "अलग वर्तनी आज़माएं, या किसी अन्य योजना का नाम लिखें।"
        ),
        "search_multiple_results": "मुझे {count} मिलती-जुलती योजनाएं मिलीं। आपका मतलब कौन सी थी?",
        "select": "चुनें",
        "state_confirm_q": "यह योजना केवल इन राज्यों के निवासियों के लिए है: {states}। क्या यह आप पर लागू होता है?",
        "residency_confirm_q": "इस योजना के लिए {residency} निवास आवश्यक है। क्या यह आप पर लागू होता है?",
        "eligibility_header": "आपकी पात्रता जांची जा रही है:\n{name}",
        "eligible_yes": "✅ आपके द्वारा दी गई जानकारी के अनुसार, आप इस योजना के लिए पात्र प्रतीत होते हैं!",
        "eligible_no": "❌ आपके द्वारा दी गई जानकारी के अनुसार, आप इस योजना के लिए पात्र नहीं दिखते:",
        "full_details_follow": "पूरा विवरण यहां है:",
        "extracting_wait": (
            "\U0001F550 इस योजना का अभी तक पूरा विश्लेषण नहीं हुआ है — मैं अभी करता हूं "
            "(इसमें एक मिनट तक लग सकता है)..."
        ),
        "extraction_failed": (
            "\U0001F615 माफ़ करें, अभी इस योजना का विश्लेषण नहीं हो पाया (AI सेवा व्यस्त है)। "
            "कृपया एक मिनट बाद फिर से कोशिश करें, या कोई अन्य योजना का नाम लिखें।"
        ),
    },
}

# (value, english_label, hindi_label)
GENDER_OPTIONS = [
    ("male", "Male", "पुरुष"),
    ("female", "Female", "महिला"),
]

CATEGORY_OPTIONS = [
    ("general", "General", "सामान्य"),
    ("sc", "SC", "अनुसूचित जाति (SC)"),
    ("st", "ST", "अनुसूचित जनजाति (ST)"),
    ("obc", "OBC", "अन्य पिछड़ा वर्ग (OBC)"),
    ("ews", "EWS", "EWS"),
]

INCOME_OPTIONS = [
    ("below_1l", "Below ₹1 Lakh", "₹1 लाख से कम"),
    ("1_2l", "₹1-2 Lakh", "₹1-2 लाख"),
    ("2_5l", "₹2-5 Lakh", "₹2-5 लाख"),
    ("5_8l", "₹5-8 Lakh", "₹5-8 लाख"),
    ("above_8l", "Above ₹8 Lakh", "₹8 लाख से अधिक"),
    ("skip", "Skip", "छोड़ें"),
]

OCCUPATION_OPTIONS = [
    ("farmer", "Farmer", "किसान"),
    ("fisherman", "Fisherman", "मछुआरा"),
    ("student", "Student", "छात्र"),
    ("entrepreneur", "Entrepreneur", "उद्यमी"),
    ("laborer", "Laborer/Worker", "मजदूर"),
    ("artisan", "Artisan", "कारीगर"),
    ("unemployed", "Unemployed", "बेरोजगार"),
    ("other", "Other/Skip", "अन्य/छोड़ें"),
]

YES_NO_OPTIONS = [
    ("yes", "Yes", "हाँ"),
    ("no", "No", "नहीं"),
]

RESIDENCY_OPTIONS = [
    ("rural", "Rural", "ग्रामीण"),
    ("urban", "Urban", "शहरी"),
    ("skip", "Skip", "छोड़ें"),
]

# Canonical English state/UT name (matched against extracted scheme data) ->
# Hindi display label. English label is just the canonical name itself.
STATES = [
    ("Andhra Pradesh", "आंध्र प्रदेश"),
    ("Arunachal Pradesh", "अरुणाचल प्रदेश"),
    ("Assam", "असम"),
    ("Bihar", "बिहार"),
    ("Chhattisgarh", "छत्तीसगढ़"),
    ("Goa", "गोवा"),
    ("Gujarat", "गुजरात"),
    ("Haryana", "हरियाणा"),
    ("Himachal Pradesh", "हिमाचल प्रदेश"),
    ("Jharkhand", "झारखंड"),
    ("Karnataka", "कर्नाटक"),
    ("Kerala", "केरल"),
    ("Madhya Pradesh", "मध्य प्रदेश"),
    ("Maharashtra", "महाराष्ट्र"),
    ("Manipur", "मणिपुर"),
    ("Meghalaya", "मेघालय"),
    ("Mizoram", "मिज़ोरम"),
    ("Nagaland", "नागालैंड"),
    ("Odisha", "ओडिशा"),
    ("Punjab", "पंजाब"),
    ("Rajasthan", "राजस्थान"),
    ("Sikkim", "सिक्किम"),
    ("Tamil Nadu", "तमिलनाडु"),
    ("Telangana", "तेलंगाना"),
    ("Tripura", "त्रिपुरा"),
    ("Uttar Pradesh", "उत्तर प्रदेश"),
    ("Uttarakhand", "उत्तराखंड"),
    ("West Bengal", "पश्चिम बंगाल"),
    ("Andaman and Nicobar Islands", "अंडमान और निकोबार द्वीप समूह"),
    ("Chandigarh", "चंडीगढ़"),
    ("Dadra and Nagar Haveli and Daman and Diu", "दादरा और नगर हवेली तथा दमन और दीव"),
    ("Delhi", "दिल्ली"),
    ("Jammu and Kashmir", "जम्मू और कश्मीर"),
    ("Ladakh", "लद्दाख"),
    ("Lakshadweep", "लक्षद्वीप"),
    ("Puducherry", "पुदुचेरी"),
]


def t(lang: str, key: str, **kwargs) -> str:
    text = STRINGS.get(lang, STRINGS["en"]).get(key, STRINGS["en"][key])
    return text.format(**kwargs) if kwargs else text


def label_for(value: str, options: list, lang: str) -> str:
    """Look up the display label for a raw option value (e.g. 'rural') in
    one of the *_OPTIONS lists above, falling back to the raw value itself
    if not found (e.g. a state name, which has no separate value/label)."""
    label_index = 1 if lang == "en" else 2
    for opt in options:
        if opt[0] == value:
            return opt[label_index]
    return value
