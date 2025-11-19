import os
from azure.search.documents import SearchClient
from azure.core.credentials import AzureKeyCredential
from azure.search.documents.indexes import SearchIndexClient
from azure.search.documents.indexes.models import (
    SearchField,
    SearchFieldDataType,
    VectorSearch,
    HnswAlgorithmConfiguration,
    VectorSearchProfile,
    AzureOpenAIVectorizer,
    AzureOpenAIVectorizerParameters,
    SearchIndex,
    SemanticSearch,
    SemanticConfiguration,
    SemanticPrioritizedFields,
    SemanticField,
    SimpleField,
    SearchableField
)

import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def ensure_search_index() -> bool:
    """Ensure the Azure AI Search index exists with proper schema."""
    try:
        search_index_client = SearchIndexClient(
            endpoint=os.getenv("AZURE_SEARCH_ENDPOINT"),
            credential=AzureKeyCredential(os.getenv("AZURE_SEARCH_API_KEY"))
        )
        index_name = os.getenv("AZURE_SEARCH_INDEX_NAME")
        
        # Check if index exists
        try:
            search_index_client.get_index(index_name)
            logger.info(f"Search index '{index_name}' already exists")
            return True
        except Exception:
            logger.info(f"Creating search index '{index_name}'")
        
        # Define the search index schema
        fields = [
            SimpleField(name="id", type=SearchFieldDataType.String, key=True, filterable=True),
            SearchableField(name="content", type=SearchFieldDataType.String),
            SearchableField(name="file_id", type=SearchFieldDataType.String, filterable=True),
            SearchableField(name="filename", type=SearchFieldDataType.String, filterable=True),
            SimpleField(name="userid", type=SearchFieldDataType.String, filterable=True),
            SimpleField(name="chunk_index", type=SearchFieldDataType.Int32, filterable=True),
            SearchField(
                name="content_vector",
                type=SearchFieldDataType.Collection(SearchFieldDataType.Single),
                searchable=True,
                vector_search_dimensions=1536,  # Ada-002 embedding dimension
                vector_search_profile_name="my-vector-config"
            )
        ]
        
        # Configure vector search
        vector_search = VectorSearch(
            algorithms=[
                HnswAlgorithmConfiguration(name="my-hnsw")
            ],
            vectorizers=[  
                AzureOpenAIVectorizer(  
                    vectorizer_name="openai-vectorizer",  
                    kind="azureOpenAI",  
                    parameters=AzureOpenAIVectorizerParameters(  
                        resource_url=os.getenv("AZURE_OPENAI_ENDPOINT"),  
                        deployment_name=os.getenv("AZURE_OPENAI_API_KEY"),
                        model_name="text-embedding-3-small"
                    ),
                ),  
            ], #
            profiles=[
                VectorSearchProfile(
                    name="my-vector-config",
                    algorithm_configuration_name="my-hnsw",
                    vectorizer_name="openai-vectorizer",
                )
            ],
            
        )
        
        # Configure semantic search
        semantic_config = SemanticConfiguration(
            name="my-semantic-config",
            prioritized_fields=SemanticPrioritizedFields(
                content_fields=[SemanticField(field_name="content")]
            )
        )
        
        semantic_search = SemanticSearch(configurations=[semantic_config])
        
        # Create the search index
        index = SearchIndex(
            name=index_name,
            fields=fields,
            vector_search=vector_search,
            semantic_search=semantic_search
        )
        
        search_index_client.create_index(index)
        logger.info(f"Successfully created search index '{index_name}'")
        return True
        
    except Exception as e:
        logger.error(f"Failed to ensure search index: {str(e)}")
        return False


ensure_search_index()
def get_search_client():
    """Get Azure AI Search client."""
    return SearchClient(
        endpoint=os.getenv("AZURE_SEARCH_ENDPOINT"),
        index_name=os.getenv("AZURE_SEARCH_INDEX_NAME"),
        credential=AzureKeyCredential(os.getenv("AZURE_SEARCH_API_KEY"))
    )