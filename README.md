# Discord Bot

## Description

This Discord bot was built to answer questions posed by users in a specific Discord channel. It uses [OpenAI's GPT-3.5](https://platform.openai.com/docs/api-reference), [Pinecone](https://www.pinecone.io/), and [Langchain](https://langchain.io/) to process and answer questions. The bot embeds user questions, queries a Pinecone vector store for the most relevant documents, and then uses GPT-3.5 to generate an answer from those documents.

The bot relies on a repository of .txt and .md files that contain the knowledge base used to answer questions. Each of these files start with a link and a title in the two first lines of the document.
For example:
file.md
line 1: Link: https://example.documentation
line 2: Title: Example Documentation
line 3: ...

These two lines are used for display purposes in Discord. The bot uses the text from these documents, along with the provided link, to construct responses to user queries.

## Usage

The bot is designed to be used in a specific Discord channel. Users can ask questions in the channel and the bot will respond with the most relevant information from the knowledge base.
In the discord channel, users can ask questions by typing `/question <question>` and the bot will respond with the most relevant information from the knowledge base.
Users can also add more documents to the knowledge base by typing `/upload <link>` and the bot will add the document to the knowledge base.