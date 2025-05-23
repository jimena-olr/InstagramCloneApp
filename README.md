# 📱 Instagram Clone App

**InstaLite** is a full-stack Instagram-like web application that supports user-generated posts, real-time updates, personalized content feeds, actor-matching profile photos, and a Retrieval-Augmented Generation (RAG) chatbot for semantic search.

This application was built using React for the frontend, Node.js and Express for the backend, and MySQL on AWS RDS for data persistence. Additional infrastructure includes Kafka for federated post streaming, Apache Spark for feed ranking, and ChromaDB for vector-based retrieval.

Key platform features include:

- User registration, authentication, and profile photo selection via face-matching  
- Post creation with captions, images, hashtags, and comments  
- Personalized feed ranking using the Adsorption algorithm over a social graph  
- Real-time updates via Kafka topics, including federated post ingestion  
- Vector-based chatbot for natural language search across platform and movie data  

The chatbot leverages a Retrieval-Augmented Generation (RAG) framework using LangChain and ChromaDB, combined with OpenAI’s language models. During each user query, the system retrieves semantically similar content across three collections: actor biographies, movie metadata, and platform posts and users, using vector similarity. These documents are then passed to OpenAI's GPT model via API to generate a natural language response. We used secure environment variables to store and access our OpenAI API keys, and designed the embedding workflow to differentiate between static (IMDB, Kaggle) and dynamic (live post and user) content. This ensures that chatbot responses are grounded in both persistent and real-time data, offering a seamless discovery experience across the application.

A demo of the following project can be seen below:

https://github.com/user-attachments/assets/03a47c9c-1ade-4886-b798-76a501746bbe

The source code for the Retrieval-Augmented Generation (RAG) chatbot can be found in the following relevant files:
- [`chatbot/chatbot.js`](chatbot/chatbot.js): caller function to the chatbot, triggered from the frontend
- [`chatbot/embed.js`](chatbot/embed.js): creates vector embeddings from the Kaggle and IMDB databases
- [`installite-backend/utils/vector.js`](installite-backend/utils/vector.js): loads LangChain retrievers from ChromaDB

*While the RAG chatbot is my own personal work, the full Instagram Clone App was developed in collaboration with my classmates Faiyaz Hasan, Shreya Mukunthan, and Stefan Matic.*

