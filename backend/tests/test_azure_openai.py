"""Tests for Azure OpenAI dual-client support.

Covers:
- Config loading: Azure env vars present vs absent
- Client factory: returns AsyncAzureOpenAI when Azure is configured, AsyncOpenAI otherwise
- Model parameter: uses deployment name for Azure, model name for standard
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest


class TestAzureConfig:
    """Azure OpenAI configuration variables."""

    def test_azure_vars_default_to_empty(self):
        """When no Azure env vars are set, all default to empty strings."""
        with patch.dict("os.environ", {}, clear=True):
            # Re-import to pick up patched env
            import importlib

            import app.config as config_mod

            importlib.reload(config_mod)

            assert config_mod.AZURE_OPENAI_ENDPOINT == ""
            assert config_mod.AZURE_OPENAI_API_KEY == ""
            assert config_mod.AZURE_OPENAI_DEPLOYMENT == ""

    def test_azure_api_version_has_default(self):
        """API version defaults to 2024-10-21 when not set."""
        with patch.dict("os.environ", {}, clear=True):
            import importlib

            import app.config as config_mod

            importlib.reload(config_mod)

            assert config_mod.AZURE_OPENAI_API_VERSION == "2024-10-21"

    def test_azure_vars_read_from_env(self):
        """When Azure env vars are set, config picks them up."""
        env = {
            "AZURE_OPENAI_ENDPOINT": "https://my-resource.openai.azure.com",
            "AZURE_OPENAI_API_KEY": "azure-key-123",
            "AZURE_OPENAI_API_VERSION": "2025-01-01",
            "AZURE_OPENAI_DEPLOYMENT": "gpt-4o-deploy",
        }
        with patch.dict("os.environ", env, clear=True):
            import importlib

            import app.config as config_mod

            importlib.reload(config_mod)

            assert config_mod.AZURE_OPENAI_ENDPOINT == "https://my-resource.openai.azure.com"
            assert config_mod.AZURE_OPENAI_API_KEY == "azure-key-123"
            assert config_mod.AZURE_OPENAI_API_VERSION == "2025-01-01"
            assert config_mod.AZURE_OPENAI_DEPLOYMENT == "gpt-4o-deploy"


class TestClientFactory:
    """_get_openai_client() returns the correct client type."""

    def test_returns_async_openai_when_no_azure(self):
        """Standard AsyncOpenAI client when Azure endpoint is not configured."""
        from openai import AsyncOpenAI

        with patch.dict(
            "os.environ",
            {"OPENAI_API_KEY": "sk-test", "AZURE_OPENAI_ENDPOINT": ""},
            clear=True,
        ):
            import importlib

            import app.config as config_mod

            importlib.reload(config_mod)

            import app.agents.base as base_mod

            base_mod._openai_client = None  # reset singleton
            importlib.reload(base_mod)

            client = base_mod._get_openai_client()
            assert isinstance(client, AsyncOpenAI)

    def test_returns_azure_client_when_endpoint_set(self):
        """AsyncAzureOpenAI client when Azure endpoint IS configured."""
        from openai import AsyncAzureOpenAI

        env = {
            "AZURE_OPENAI_ENDPOINT": "https://my-resource.openai.azure.com",
            "AZURE_OPENAI_API_KEY": "azure-key",
            "AZURE_OPENAI_API_VERSION": "2024-10-21",
            "AZURE_OPENAI_DEPLOYMENT": "gpt-4o-deploy",
        }
        with patch.dict("os.environ", env, clear=True):
            import importlib

            import app.config as config_mod

            importlib.reload(config_mod)

            import app.agents.base as base_mod

            base_mod._openai_client = None
            importlib.reload(base_mod)

            client = base_mod._get_openai_client()
            assert isinstance(client, AsyncAzureOpenAI)


class TestModelParam:
    """_call_openai uses the correct model parameter."""

    @pytest.mark.asyncio
    async def test_standard_openai_uses_model_name(self):
        """When using standard OpenAI, passes OPENAI_MODEL."""
        with patch.dict(
            "os.environ",
            {"OPENAI_API_KEY": "sk-test", "OPENAI_MODEL": "gpt-4o-mini"},
            clear=True,
        ):
            import importlib

            import app.config as config_mod

            importlib.reload(config_mod)

            import app.agents.base as base_mod

            base_mod._openai_client = None
            importlib.reload(base_mod)

            # Build a mock response
            mock_msg = MagicMock()
            mock_msg.content = '{"recommendations":[],"total_savings":0,"summary":"test"}'
            mock_choice = MagicMock()
            mock_choice.message = mock_msg
            mock_response = MagicMock()
            mock_response.choices = [mock_choice]

            mock_client = MagicMock()
            mock_client.chat.completions.create = AsyncMock(return_value=mock_response)

            with patch.object(base_mod, "_get_openai_client", return_value=mock_client):
                from app.models.schemas import DataSummary

                summary = DataSummary(
                    total_spend=100000,
                    row_count=100,
                    unique_vendor_count=10,
                    date_range="2024-01-01 to 2024-12-31",
                    top_vendors=[],
                    category_breakdown=[],
                    department_breakdown=[],
                    monthly_trends=[],
                    duplicate_vendors=[],
                )
                await base_mod._call_openai("conservative", summary)

                call_kwargs = mock_client.chat.completions.create.call_args
                assert call_kwargs.kwargs["model"] == config_mod.OPENAI_MODEL
