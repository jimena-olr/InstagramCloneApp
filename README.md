# 📱 Instagram Clone App
SightSeek is an Android application designed for tourists that allows them to see the principal historical landmarks in several cities around the world, such as Paris, Lisboa, and Washington.

The following software is designed with Ionic Framework, based on AngularJS and Capacitor, and designed with TypeScript and JavaScript as the main programming languages. This is an Android targeted application that was built through Android Studio, with a Gradle engine. As the main functions of this project, Sightseek can:

- Take the user's location and display it leveraging the Google Maps API
- Use the Compass feature in the user's phone and rotate a dynamic compass to help the user orient themselves
- Select a city out of a menu and display the corresponding map for the user, having Washington, Rome, Paris, and Lisboa as some of the possible options (all of these are displayed in the video below)
- Display the principal historical landmarks in the city that has been chosen by the user, using color coding with a menu layout for the user to know which one is closest to their location.
- Share the user's location to any person in their contacts for security reasons.

A demo of the following project can be seen below:

https://github.com/user-attachments/assets/03a47c9c-1ade-4886-b798-76a501746bbe

The source code for the Retrieval-Augmented Generation (RAG) chatbot can be found in the following relevant files:
- [`chatbot/chatbot.js`](chatbot/chatbot.js): caller function to the chatbot, triggered from the frontend
- [`chatbot/embed.js`](chatbot/embed.js): creates vector embeddings from the Kaggle and IMDB databases
- [`installite-backend/utils/vector.js`](installite-backend/utils/vector.js): loads LangChain retrievers from ChromaDB

*While the RAG chatbot is my own personal work, the full Instagram Clone App was developed in collaboration with my classmates Faiyaz Hasan, Shreya Mukunthan, and Stefan Matic.*

