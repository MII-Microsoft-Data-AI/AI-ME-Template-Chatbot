from dotenv import load_dotenv
import os
from dotenv import load_dotenv
from langchain_azure_ai.callbacks.tracers import AzureAIOpenTelemetryTracer
from opentelemetry.instrumentation.langchain import LangchainInstrumentor

load_dotenv()

def get_microsoft_tracer() -> list:
    if not os.environ.get("APPLICATION_INSIGHTS_CONNECTION_STRING"):
        return []
    instrumentor = LangchainInstrumentor()
    if not instrumentor.is_instrumented_by_opentelemetry:
        instrumentor.instrument()
    azure_tracer = AzureAIOpenTelemetryTracer(
        connection_string=os.environ.get("APPLICATION_INSIGHTS_CONNECTION_STRING"),
        enable_content_recording=True,
        name="Kaenova Template Chatbot",
    )
    tracers = [azure_tracer]
    return tracers