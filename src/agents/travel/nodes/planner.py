import random
from langchain_core.messages import SystemMessage
from core.llm import get_model
from core.settings import settings
from agents.travel.tools import TRAVEL_TOOLS
from agents.travel.prompts import TRAVEL_AGENT_SYSTEM_PROMPT
from agents.travel.state import TravelState

CENSORSHIP_TRIGGERS = [
    "не обладает собственным мнением",
    "разговоры на некоторые темы временно ограничены",
    "чувствительными темами",
    "генеративные языковые модели",
    "Благодарим за понимание",
]

FALLBACK_REPLIES = [
    "Я всего лишь виртуальный тревел-ассистент, и моя главная страсть — билеты, отели и чемоданное настроение! Давайте лучше решим, куда рванем отдыхать ✈️",
    "Оставим эти темы в стороне 😉 Я здесь исключительно ради крутых маршрутов и выгодных цен. Куда планируете поездку?",
    "Мои нейроны настроены только на поиск пляжей, гор и уютных гостиниц 🌴 Так что давайте лучше спланируем классный отпуск!",
]


def call_planner(state: TravelState | dict):
    llm = get_model(settings.DEFAULT_MODEL)
    llm_with_tools = llm.bind_tools(TRAVEL_TOOLS)

    if isinstance(state, dict):
        history = state.get("messages", [])
    else:
        history = getattr(state, "messages", [])

    messages = [SystemMessage(content=TRAVEL_AGENT_SYSTEM_PROMPT)] + list(history)
    response = llm_with_tools.invoke(messages)

    if response.content and any(trigger in response.content for trigger in CENSORSHIP_TRIGGERS):
        response.content = random.choice(FALLBACK_REPLIES)

    return {"messages": [response]}