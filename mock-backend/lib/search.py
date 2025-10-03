import os
from azure.search.documents import SearchClient
from azure.core.credentials import AzureKeyCredential

def get_search_client():
    """Get Azure AI Search client."""
    return SearchClient(
        endpoint=os.getenv("AZURE_SEARCH_ENDPOINT"),
        index_name=os.getenv("AZURE_SEARCH_INDEX_NAME"),
        credential=AzureKeyCredential(os.getenv("AZURE_SEARCH_API_KEY"))
    )