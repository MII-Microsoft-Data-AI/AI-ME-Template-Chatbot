"""Model configuration for Azure OpenAI integration."""
import os
from typing import Any, Dict
from langchain_openai import AzureChatOpenAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


def create_azure_model(**kwargs) -> AzureChatOpenAI:
    """Create an Azure OpenAI model instance.
    
    Args:
        **kwargs: Additional parameters for the model
        
    Returns:
        AzureChatOpenAI: Configured Azure OpenAI model
    """
    llm = AzureChatOpenAI(
        azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
        azure_deployment=os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME"),
        api_key=os.getenv("AZURE_OPENAI_API_KEY"),
        api_version=os.getenv("AZURE_OPENAI_API_VERSION"),
        # temperature=0.5,
        streaming=True,
        **kwargs
    )
    return llm


# Default model instance
model = create_azure_model()