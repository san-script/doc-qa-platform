from __future__ import annotations

import re
from collections.abc import AsyncIterator

from pydantic_ai import Agent

from takehome.config import settings  # noqa: F401 — triggers ANTHROPIC_API_KEY export

agent = Agent(
    "anthropic:claude-haiku-4-5-20251001",
    model_settings={"temperature": 0.2},
    system_prompt=(
        "You are a helpful legal document assistant for commercial real estate lawyers. "
        "You help lawyers review and understand documents during due diligence.\n\n"
        "IMPORTANT INSTRUCTIONS:\n"
        "- Answer questions based ONLY on the document content provided.\n"
        "- You MUST always cite your sources using this exact format: [📄 filename, Page X] where filename is the document filename and X is the page number. For example: [📄 lease_agreement.pdf, Page 2]. Place this citation inline after the relevant statement.\n"
        "- If you cannot find the answer in the provided documents, you MUST start your response with 'I could not find this in the uploaded documents' and explain what is missing.\n"
        "- NEVER guess, infer, or fabricate information not present in the documents.\n"
        "- Be concise and precise. Lawyers value accuracy over verbosity.\n"
    ),
)


async def generate_title(user_message: str) -> str:
    """Generate a 3-5 word conversation title from the first user message."""
    result = await agent.run(
        f"Generate a concise 3-5 word title for a conversation that starts with: '{user_message}'. "
        "Return only the title, nothing else."
    )
    title = str(result.output).strip().strip('"').strip("'")
    # Truncate if too long
    if len(title) > 100:
        title = title[:97] + "..."
    return title


async def chat_with_document(
    user_message: str,
    document_text: str | None,
    conversation_history: list[dict[str, str]],
) -> AsyncIterator[str]:
    """Stream a response using a single document (backward-compatible wrapper)."""
    documents = [("document", document_text)] if document_text else []
    async for chunk in chat_with_documents(
        user_message=user_message,
        documents=documents,
        conversation_history=conversation_history,
    ):
        yield chunk


async def chat_with_documents(
    user_message: str,
    documents: list[tuple[str, str]],
    conversation_history: list[dict[str, str]],
) -> AsyncIterator[str]:
    """Stream a response to the user's message, yielding text chunks.

    Builds a prompt that includes context from all provided documents and the
    conversation history, then streams the response from the LLM.

    `documents` is a list of (filename, extracted_text) tuples.
    """
    # Build the full prompt with context
    prompt_parts: list[str] = []

    # Add document context if available
    if documents:
        if len(documents) == 1:
            filename, text = documents[0]
            prompt_parts.append(
                f"The following is the content of the document being discussed ({filename}):\n\n"
                "<document>\n"
                f"{text}\n"
                "</document>\n"
            )
        else:
            prompt_parts.append(
                f"The following are {len(documents)} documents available for this conversation:\n\n"
            )
            for i, (filename, text) in enumerate(documents, 1):
                prompt_parts.append(
                    f"<document index=\"{i}\" filename=\"{filename}\">\n"
                    f"{text}\n"
                    "</document>\n\n"
                )
    else:
        prompt_parts.append(
            "No document has been uploaded yet. If the user asks about a document, "
            "let them know they need to upload one first.\n"
        )

    # Add conversation history
    if conversation_history:
        prompt_parts.append("Previous conversation:\n")
        for msg in conversation_history:
            role = msg["role"]
            content = msg["content"]
            if role == "user":
                prompt_parts.append(f"User: {content}\n")
            elif role == "assistant":
                prompt_parts.append(f"Assistant: {content}\n")
        prompt_parts.append("\n")

    # Add the current user message
    prompt_parts.append(f"User: {user_message}")

    full_prompt = "\n".join(prompt_parts)

    async with agent.run_stream(full_prompt) as result:
        async for text in result.stream_text(delta=True):
            yield text


def count_sources_cited(response: str) -> int:
    """Count the number of references to document sections, clauses, pages, etc."""
    patterns = [
        r"section\s+\d+",
        r"clause\s+\d+",
        r"page\s+\d+",
        r"paragraph\s+\d+",
    ]
    count = 0
    for pattern in patterns:
        count += len(re.findall(pattern, response, re.IGNORECASE))
    return count
